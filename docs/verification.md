# Verification — competition release, 14 November 2026

## Passed

- `npx tsc --noEmit` — no TypeScript errors.
- Production build through the Sites helper — successful; only `/` and `/api/radio` are present. The temporary `/qa-radio` diagnostic route was removed before the build.
- `node scripts/test-radio.mjs` — create/join, authentication, atomic competing floor claims, owner-only floor release, signaling cursors, room isolation, six-member capacity, leave/rejoin, cross-origin rejection.
- `node scripts/test-expiry.mjs` — abandoned floor expiry, floor reclamation, stale-session rejection and fresh rejoin.
- Browser fixture with two real `useRadio` instances and local D1 signaling — actual WebRTC connections, disabled initial audio tracks, exactly one enabled sender, generated audio decoded both directions, immediate mute on release, release-before-grant handling, blur handling and synthetic microphone permission denial.
- QR browser checks — generated image, matching invitation URL, Tab wraps inside dialog, Escape closes and restores trigger focus, generation error message and retry action.
- QR mobile viewport — at 390 × 844, dialog is 350px wide and approximately 615px tall; no horizontal overflow.
- `git diff --check` — no whitespace errors.

The media fixture replaces physical microphone capture with generated tones. Remote streams are consumed through zero-gain Web Audio sinks to inspect decoded samples without speaker output. This verifies media transport and microphone gating in a single browser environment. It is not evidence of independent-device, real-microphone or restrictive-network compatibility.

## Pending

- Physical two-device voice test, including headphone use, mobile browser lifecycle and a different network.
- TURN service configuration for restrictive NAT/firewalls.
- Public GitHub repository, judge-accessible sharing configuration, contest registration, video and submission.

Kiro's actual contribution is recorded separately in `development-log.md`; the checks above were run by Codex.

## Refinement verification

- `npx tsc --noEmit` passed after microphone/retry integration.
- API integration and expiry scripts passed again. `scripts/test-entry-limits.mjs` verified the atomic 60-entry/minute network threshold and rejection of null commands. The D1 migration `0001_talented_nehzno.sql` was applied to the local database.
- Final synthetic browser run passed all 18 assertions, including one real higher-ID requested ICE-restart offer through the designated lower-ID offerer and the three-attempt negotiation-failure budget.
- Microphone checks passed immediate mute on switch, start blocked while switching, successful replacement/old-track retirement, failure rollback preserving the live disabled old track, device removal preventing transmit, selection recovery, and leave-before-capture-resolution cleanup.
- The actual product demo held the transmit key for 16 seconds; the 15-second cutoff was observed in the UI and transmission log.
- The demo export is 76.572 seconds of continuous narration with actual CUA screen captures at natural elapsed time, H.264/AAC, 1280 × 720, 25 fps. Full-stream decode passed. Full listening review was not performed in this environment; the owner must review audio before publishing.

The browser checks inject input devices and capture/replacement failures. They do not prove physical device enumeration, hardware microphone quality, cross-browser support, mobile background behavior or restrictive NAT recovery. Multi-peer partial rollback and timeout fault injection are not covered by the current automated run. TURN is supported but not provisioned.

Final production TypeScript check and the Sites production build passed. Only `/` and `/api/radio` were included; both temporary `/qa-radio` and `/qa-demo` wrappers were removed before building. Whitespace validation passed. Source export and deployment results are recorded in the release handoff after completion.
