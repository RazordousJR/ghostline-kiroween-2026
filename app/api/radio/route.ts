import { env } from "cloudflare:workers";

export const dynamic = "force-dynamic";
const MAX_MEMBERS = 6;
const ACTIVE_MS = 20_000;
const TTL = 4 * 60 * 60_000;
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const clean = (v: unknown, max = 24) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";
const codeOf = (v: unknown) =>
  clean(v, 30)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
type Room = {
  code: string;
  name: string;
  expires: number;
  speaker: string | null;
  lease: number;
};
type Member = { id: string; name: string; room: string; seen: number };

export async function POST(request: Request) {
  if (
    request.headers.get("origin") &&
    request.headers.get("origin") !== new URL(request.url).origin
  )
    return json({ error: "Origin not allowed." }, 403);
  if (!request.headers.get("content-type")?.includes("application/json"))
    return json({ error: "JSON required." }, 415);
  if (Number(request.headers.get("content-length") || 0) > 24_000)
    return json({ error: "Request too large." }, 413);
  try {
    const raw = await request.text();
    if (raw.length > 24_000) return json({ error: "Request too large." }, 413);
    const b = JSON.parse(raw);
    if (!b || typeof b !== 'object' || Array.isArray(b)) return json({ error: 'A radio command object is required.' }, 400);
    const db = env.DB;
    if (!db)
      return json({ error: "The radio service is not configured yet." }, 503);
    const now = Date.now();
    const q = (sql: string, ...args: (string | number | null)[]) =>
      db.prepare(sql).bind(...args);
    if (b.action === "create" || b.action === "join") {
      const name = clean(b.name);
      if (!name) return json({ error: "Choose a callsign first." }, 400);
      // Cloudflare supplies the network header at the edge. Store only a
      // minute-specific hash, never the raw network address.
      const network = request.headers.get('cf-connecting-ip');
      if (network) {
        const window = Math.floor(now / 60_000);
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${network}:${window}`));
        const key = Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('');
        const limit = await q('INSERT INTO entry_limits (key,expires,hits) VALUES (?,?,1) ON CONFLICT(key) DO UPDATE SET hits = hits + 1 RETURNING hits', key, (window + 2) * 60_000).first<{ hits: number }>();
        if ((limit?.hits || 0) > 60) return json({ error: 'Too many connection attempts. Wait a minute and try again.' }, 429);
      }
      // Bounded retention: expired rooms cascade-delete members and signaling metadata.
      await db.batch([
        q(
          "DELETE FROM rooms WHERE code IN (SELECT code FROM rooms WHERE expires < ? LIMIT 50)",
          now,
        ),
        q(
          "DELETE FROM signals WHERE id IN (SELECT id FROM signals WHERE created < ? LIMIT 500)",
          now - 60_000,
        ),
        q('DELETE FROM entry_limits WHERE key IN (SELECT key FROM entry_limits WHERE expires < ? LIMIT 200)', now),
      ]);
      let code = codeOf(b.code);
      if (b.action === "create") {
        code = Array.from(
          crypto.getRandomValues(new Uint8Array(10)),
          (n) => alphabet[n % alphabet.length],
        ).join("");
        const created = await q(
          "INSERT INTO rooms (code,name,created,expires,lease) SELECT ?,?,?,?,0 WHERE (SELECT COUNT(*) FROM rooms WHERE expires > ?) < 250",
          code,
          clean(b.roomName, 32) || "Midnight crew",
          now,
          now + TTL,
          now,
        ).run();
        if (!created.meta.changes) return json({ error: 'All channels are busy right now. Please try again later.' }, 503);
      }
      const room = await q(
        "SELECT * FROM rooms WHERE code = ? AND expires > ?",
        code,
        now,
      ).first<Room>();
      if (!room)
        return json(
          { error: "Frequency not found or expired. Check the room code." },
          404,
        );
      const id = crypto.randomUUID(),
        secret = crypto.randomUUID();
      // One SQL statement makes the capacity check and insertion atomic.
      const result = await q(
        "INSERT INTO members (id,secret,room,name,seen) SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM members WHERE room = ? AND seen > ?) < ?",
        id,
        secret,
        code,
        name,
        now,
        code,
        now - ACTIVE_MS,
        MAX_MEMBERS,
      ).run();
      if (!result.meta.changes)
        return json(
          { error: "This channel is full. Try another frequency." },
          409,
        );
      let iceServers: RTCIceServer[] = [
        { urls: "stun:stun.l.google.com:19302" },
      ];
      // Optional TURN config is supplied by the host, never committed to source.
      const config = env as unknown as Record<string, string | undefined>;
      if (config.TURN_URL && config.TURN_USERNAME && config.TURN_CREDENTIAL)
        iceServers.push({
          urls: config.TURN_URL,
          username: config.TURN_USERNAME,
          credential: config.TURN_CREDENTIAL,
        });
      return json({
        id,
        secret,
        code,
        roomName: room.name,
        expires: room.expires,
        iceServers,
        hasTurn: iceServers.length > 1,
      });
    }
    const id = clean(b.id, 64),
      secret = clean(b.secret, 64);
    const member = await q(
      "SELECT id,name,room,seen FROM members WHERE id = ? AND secret = ?",
      id,
      secret,
    ).first<Member>();
    if (!member)
      return json({ error: "Session ended. Please rejoin the channel." }, 401);
    if (member.seen < now - ACTIVE_MS && b.action !== "leave")
      return json(
        { error: "Your radio went offline. Rejoin the channel to reconnect." },
        401,
      );
    const room = await q(
      "SELECT * FROM rooms WHERE code = ? AND expires > ?",
      member.room,
      now,
    ).first<Room>();
    if (!room)
      return json(
        { error: "This channel has expired. Create a new one." },
        410,
      );
    await q("UPDATE members SET seen = ? WHERE id = ?", now, id).run();
    if (b.action === "poll") {
      const after = Number.isSafeInteger(b.after) && b.after >= 0 ? b.after : 0;
      const [people, messages] = await Promise.all([
        q(
          "SELECT id,name FROM members WHERE room = ? AND seen > ? ORDER BY id",
          member.room,
          now - ACTIVE_MS,
        ).all(),
        q(
          "SELECT id,sender,body FROM signals WHERE recipient = ? AND room = ? AND id > ? AND created > ? ORDER BY id LIMIT 100",
          id,
          member.room,
          after,
          now - 60_000,
        ).all(),
      ]);
      return json({
        members: people.results,
        signals: messages.results,
        speaker: room.lease > now ? room.speaker : null,
        lease: room.lease,
        expires: room.expires,
      });
    }
    if (b.action === "signal") {
      const target = clean(b.to, 64);
      const peer = await q(
        "SELECT id FROM members WHERE id = ? AND room = ? AND seen > ?",
        target,
        member.room,
        now - ACTIVE_MS,
      ).first();
      if (!peer || target === id)
        return json({ error: "That radio has left the channel." }, 404);
      const payload = b.payload;
      if (!payload || !["offer", "answer", "ice", "restart-request"].includes(payload.type))
        return json({ error: "Invalid signal." }, 400);
      const body = JSON.stringify(payload);
      if (body.length > 20_000)
        return json({ error: "Signal too large." }, 413);
      const recent = await q(
        "SELECT COUNT(*) AS n FROM signals WHERE sender = ? AND created > ?",
        id,
        now - 10_000,
      ).first<{ n: number }>();
      if ((recent?.n ?? 0) >= 150)
        return json({ error: "Too many signals. Wait a moment." }, 429);
      await q(
        "INSERT INTO signals (room,sender,recipient,body,created) VALUES (?,?,?,?,?)",
        member.room,
        id,
        target,
        body,
        now,
      ).run();
      return json({ ok: true });
    }
    if (b.action === "floor") {
      if (b.claim === true) {
        const result = await q(
          "UPDATE rooms SET speaker = ?, lease = ? WHERE code = ? AND (speaker IS NULL OR lease < ? OR speaker = ?)",
          id,
          now + 16_000,
          member.room,
          now,
          id,
        ).run();
        return json({ granted: !!result.meta.changes, lease: now + 16_000 });
      }
      await q(
        "UPDATE rooms SET speaker = NULL, lease = 0 WHERE code = ? AND speaker = ?",
        member.room,
        id,
      ).run();
      return json({ ok: true });
    }
    if (b.action === "leave") {
      await db.batch([
        q(
          "UPDATE rooms SET speaker = NULL, lease = 0 WHERE code = ? AND speaker = ?",
          member.room,
          id,
        ),
        q("DELETE FROM members WHERE id = ?", id),
        q("DELETE FROM signals WHERE sender = ? OR recipient = ?", id, id),
      ]);
      return json({ ok: true });
    }
    return json({ error: "Unknown radio command." }, 400);
  } catch (error) {
    if (error instanceof SyntaxError)
      return json({ error: "Invalid request." }, 400);
    console.error(
      "Radio request failed",
      error instanceof Error ? error.message : "unknown",
    );
    return json({ error: "Radio service interrupted. Please try again." }, 503);
  }
}
