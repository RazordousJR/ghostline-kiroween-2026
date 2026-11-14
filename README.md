# Ghostline

**The walkie-talkie, resurrected.** Small browser-based voice channels for crews: hold to talk, release to listen.

Prototype for Kiroween 2026 (Resurrection). Kiro implemented radio refinements using the project's steering and requirements; Codex prepared the initial application and performed integration, review and verification. Real two-device voice validation remains pending. See [development provenance](docs/development-log.md) and [Kiro usage](submission/KIRO-USAGE.md).

## Included

- Create/join four-hour channels with ten-character invite codes and share links.
- Locally generated QR invitations, with keyboard-accessible dialog, focus return and recoverable generation errors.
- Six active members per room, with expiring presence.
- WebRTC audio mesh; D1 stores only temporary signaling/session metadata.
- Atomic server-side floor arbitration, 15-second transmissions, Space/pointer controls.
- Mic tracks disabled until the floor is granted; synchronous mute on release/blur/tab hiding.
- Receive mute/volume, microphone sound check, connection states and transient activity log.
- Microphone input selection with disabled replacement tracks, rollback and device removal recovery.
- Manual, bounded ICE connection recovery with one designated offerer.
- Atomic entry throttling and a 250-channel active prototype capacity bound.
- Responsive retro radio interface. No mock participants or fake connection states.

## Local development

Node 22.13+ and npm. Install with `npm run install:ci`. Build with `npm run build`. The hosting manifest declares D1 binding `DB`.

Apply both local migrations in order, once per new local database, after building:

```powershell
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_parched_black_crow.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_talented_nehzno.sql
npm start -- --port 5190
```

Open http://127.0.0.1:5190 in two browser clients. Create a channel, copy its invite, join from the other client. Allow microphone access only when ready. Use headphones. Test speaking both directions and verify silence when released. Cross-device deployment needs HTTPS; a phone cannot use another machine's localhost.

Validation:

```powershell
npx tsc --noEmit
npm run build
node scripts/test-radio.mjs
node scripts/test-expiry.mjs
node scripts/test-entry-limits.mjs
```

The integration tests expect the local migrated Worker at port 5190. They check authentication, room isolation, simultaneous floor arbitration, floor ownership, signaling cursors, capacity, expiry and leave/rejoin. They do not prove WebRTC audio delivery.

For browser media checks, run `node scripts/browser-fixture.mjs`, start `npm run dev -- --port 5190` and open `/qa-radio`. The diagnostic runs two real `useRadio` clients with generated tones instead of physical microphones. Incoming audio is consumed through zero-gain Web Audio sinks so decoded audio can be measured silently. It checks transport both directions and push-to-talk microphone gating. QR dialog and error-state controls are included. Remove the temporary route with `node scripts/browser-fixture.mjs --remove` **before building/publishing**. This local fixture is not a product route. Do not treat synthetic media as a physical two-device test.

## Networking and privacy

Internet required. STUN is configured by default. Some NAT/firewall combinations need TURN. The host can set `TURN_URL`, `TURN_USERNAME`, and `TURN_CREDENTIAL` as runtime secrets. These are distributed to connected clients for WebRTC; use limited-scope, short-lived credentials for a production service. No TURN service is provisioned in this prototype. Never commit secrets.

Audio is not recorded by Ghostline. WebRTC protects audio in transport, but room codes are bearer invitations, not verified identities. Share codes only with trusted crew. Signaling includes IP-related ICE metadata, is polled over HTTPS, filtered to room members, and removed opportunistically after one minute; expired rooms are cleaned in bounded batches during subsequent joins. Cleanup is activity-driven, so data may remain stored until more activity occurs. Stale members cannot silently revive their session past the 20-second presence timeout.

Sites preview starts private. Other crew need permission to access a private Site. The hosting access policy must be configured before inviting outside users or judges. This is not an emergency communications service.

## Competition materials

Requirements, design and tasks are under `.kiro/specs/radio-refinements`. Prepared steering files alone do not demonstrate actual Kiro usage; the development log identifies the actual sessions and review corrections. [Submission copy](submission/DEVPOST.md), [judge instructions](submission/JUDGE-GUIDE.md), and the [release checklist](submission/RELEASE-CHECKLIST.md) are included.

Before submitting: finish substantive Kiro work and record evidence, test real audio, create a public GitHub repository with the `.kiro` directory and MIT license, verify judge access to the app, and record a public YouTube demo under three minutes. Official rules: https://kiroween.devpost.com/rules.

MIT license applies to authored Ghostline code. Framework dependencies retain their own licenses; see also the vendored Sites integration license in `scripts/vite/`.
