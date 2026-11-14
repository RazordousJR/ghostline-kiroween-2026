import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
const base = process.env.GHOSTLINE_TEST_URL || "http://127.0.0.1:5190";
const call = async (action, data = {}, session) => {
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
  return { status: response.status, body: await response.json() };
};
const a = (await call("create", { name: "Expiry Alpha" })).body;
const b = (await call("join", { name: "Expiry Bravo", code: a.code })).body;
try {
  assert.equal((await call("floor", { claim: true }, a)).body.granted, true);
  await delay(16_400);
  assert.equal(
    (await call("poll", {}, b)).body.speaker,
    null,
    "Abandoned floor expires automatically",
  );
  assert.equal(
    (await call("floor", { claim: true }, b)).body.granted,
    true,
    "Other member can claim expired floor",
  );
  await delay(4_000);
  assert.equal(
    (await call("poll", {}, a)).status,
    401,
    "Stale member cannot revive after presence timeout",
  );
  const fresh = await call("join", {
    name: "Expiry Alpha rejoined",
    code: a.code,
  });
  assert.equal(fresh.status, 200);
  assert.notEqual(fresh.body.id, a.id);
  await call("leave", {}, fresh.body);
  console.log(
    "PASS: floor lease expiry, floor reclamation, stale-session rejection, fresh rejoin.",
  );
} finally {
  await call("leave", {}, a);
  await call("leave", {}, b);
}
