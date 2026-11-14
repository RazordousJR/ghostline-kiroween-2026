import assert from "node:assert/strict";
const base = process.env.GHOSTLINE_TEST_URL || "http://127.0.0.1:5190";
const sessions = [];
async function call(action, data = {}, session, expected = 200) {
  const response = await fetch(`${base}/api/radio`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      action,
      id: session?.id,
      secret: session?.secret,
      ...data,
    }),
  });
  const body = await response.json();
  assert.equal(response.status, expected, JSON.stringify(body));
  return body;
}
try {
  await call("create", { name: "" }, undefined, 400);
  await call("join", { name: "Missing", code: "NOTAROOM" }, undefined, 404);
  const host = await call("create", {
    name: "Alpha",
    roomName: "Integration check",
  });
  sessions.push(host);
  assert.match(host.code, /^[A-Z2-9]{10}$/);
  const peer = await call("join", { name: "Bravo", code: host.code });
  sessions.push(peer);
  assert.equal((await call("poll", {}, host)).members.length, 2);
  await call("poll", {}, { id: host.id, secret: "wrong" }, 401);
  const contenders = await Promise.all([
    call("floor", { claim: true }, host),
    call("floor", { claim: true }, peer),
  ]);
  assert.equal(
    contenders.filter((v) => v.granted).length,
    1,
    "Exactly one simultaneous speaker wins",
  );
  const winner = contenders[0].granted ? host : peer,
    loser = contenders[0].granted ? peer : host;
  await call("floor", { claim: false }, loser);
  assert.equal(
    (await call("poll", {}, host)).speaker,
    winner.id,
    "Another member cannot release your floor",
  );
  await call("floor", { claim: false }, winner);
  assert.equal((await call("floor", { claim: true }, loser)).granted, true);
  await call("floor", { claim: false }, loser);
  await call(
    "signal",
    { to: peer.id, payload: { type: "ice", candidate: { candidate: "test" } } },
    host,
  );
  const poll = await call("poll", {}, peer);
  assert.equal(poll.signals.length, 1);
  assert.equal(poll.signals[0].sender, host.id);
  assert.equal(
    (await call("poll", { after: poll.signals[0].id }, peer)).signals.length,
    0,
    "Cursor prevents replay",
  );
  const outsider = await call("create", { name: "Outsider" });
  sessions.push(outsider);
  await call(
    "signal",
    { to: peer.id, payload: { type: "ice" } },
    outsider,
    404,
  );
  for (let i = 0; i < 4; i++)
    sessions.push(await call("join", { name: `Radio ${i}`, code: host.code }));
  await call("join", { name: "Seventh", code: host.code }, undefined, 409);
  await call("leave", {}, peer);
  const replacement = await call("join", {
    name: "Replacement",
    code: host.code,
  });
  sessions.push(replacement);
  assert.equal((await call("poll", {}, host)).members.length, 6);
  await call("poll", {}, peer, 401);
  const foreign = await fetch(`${base}/api/radio`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://unrelated.example",
    },
    body: JSON.stringify({ action: "create", name: "Cross origin" }),
  });
  assert.equal(foreign.status, 403);
  console.log(
    "PASS: create/join, auth, simultaneous floor arbitration, owner-only release, signaling cursor, room isolation, six-person capacity, leave/rejoin, cross-origin rejection.",
  );
} finally {
  for (const s of sessions) await call("leave", {}, s).catch(() => {});
}
