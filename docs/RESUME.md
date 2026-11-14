# Current checkpoint — 14 November 2026

The user resumed development after the usage-limit pause. QR invitation work is complete and validated. Source is prepared for the QR release on the existing private Site:

https://ghostline-radio-kiroween.razordous.chatgpt.site

## Completed

- Kiro authored the initial QR dialog and refinement design. Codex finished integration, styles, focus trapping/restoration, QR error/retry states and asynchronous cleanup. See development-log.md for provenance.
- Dependency/type declarations and lockfile are synchronized; dependencies installed.
- TypeScript and production build passed. No temporary diagnostic route is included in the production build.
- Backend auth/isolation/capacity/floor and expiry tests passed.
- Browser tests verified actual WebRTC connections and generated audio decoded in both directions, plus release, release-before-grant, blur and permission-denial handling. No physical microphone was captured; output was muted.
- QR rendering, invite URL, keyboard containment, Escape/focus return, error/retry and 390px mobile fit were checked.

## Remaining

- Physical two-device voice test and restrictive-network/TURN verification.
- Microphone selection and bounded ICE retry remain deferred; next Kiro prompt is in KIRO-START.md.
- Public GitHub repository, judge access, contest registration, public demo video and submission have not been completed.

## Development notes

- Keep the Sites project ID in .openai/hosting.json and preserve private access unless the user requests otherwise. Refresh credentials through the connector; never create a second Site for this project.
- Stop the local preview before rebuilding on Windows to avoid locked dist files. Local D1 initial migration is already applied; do not replay it.
- Browser diagnostic: install temporarily with `node scripts/browser-fixture.mjs`, run dev at port 5190, open `/qa-radio`. Remove the route with `node scripts/browser-fixture.mjs --remove` before production builds.
- Publication helpers should package the verified existing build with `commands: []` when code/build inputs have not changed. Use the returned commit SHA verbatim.
- Consult the Sites connector for the latest published version. Full check details are in verification.md.
