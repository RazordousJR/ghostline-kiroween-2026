# Development provenance

## Initial scaffold — 14 November 2026

Prepared with Codex: React interface, browser WebRTC mesh, D1 signaling, server-arbitrated push-to-talk, room capacity and expiry, integration tests, and initial Kiro steering/spec documents.

At scaffold creation, Kiro had not implemented or reviewed project code. The initial .kiro folder was prepared input, not proof of execution.

## Kiro sessions

### 14 November 2026 — QR invitations

The user installed/signed into Kiro and trusted the Ghostline folder. In the Kiro IDE session "Implement Radio Refinements: QR, Microphone, Retry", Kiro read the prepared steering/spec and application files. The Auto-model attempts were stopped after repeated planning. With Claude Sonnet 4.5 selected, Kiro used Write File/Replace in File to create `.kiro/specs/radio-refinements/design.md`, create `app/qr-invite.tsx`, and add the `qrcode` dependency to `package.json`.

The session was paused at the user's request due to usage limits. Its code was not yet integrated or validated. No Kiro shell commands were run. The built-in Spec workflow, hooks, MCP integrations and Kiro Crew were not used.

After the user resumed, Codex completed the integration in `app/page.tsx`, added matching styles, installed the dependency/types, and repaired keyboard focus trapping, focus restoration, QR error/retry handling, and asynchronous cleanup. These completion changes must not be attributed to Kiro.

Codex browser verification used the actual `useRadio` hook twice with generated Web Audio tones, real browser RTCPeerConnections, and local D1 signaling. It verified connection establishment, initially disabled tracks, one active sender, decoded audio in both directions, synchronous mute on release, release-before-grant, and blur handling. This is synthetic same-browser testing; physical microphones, independent devices and restrictive network traversal remain unverified.

QR browser checks verified rendered generation, matching invite URL, forward/backward keyboard containment and Escape focus return, plus recoverable generation failure with retry. Backend integration/expiry tests verified room isolation, auth, capacity, atomic floor arbitration, floor expiry and stale-session rejection. Final TypeScript/build results are recorded in `docs/verification.md`.

### 14 November 2026 — Microphone selection

In the follow-up session, the user requested safe microphone selection implementation. Using Claude Sonnet 4.5, Kiro read `.kiro/steering/product.md`, `.kiro/steering/tech.md`, `.kiro/specs/radio-refinements/requirements.md`, `app/use-radio.ts`, and `app/page.tsx`.

Kiro used Replace in File to:
- Add `devices`, `selectedDevice`, and `switchingMicrophone` state to `useRadio()`
- Add `switching` ref to block start() during device changes
- Enumerate audio inputs after getUserMedia permission granted in `join()`
- Implement `switchMicrophone()` with serialized switching: stop old tracks before requesting new input, keep new tracks disabled, replaceTrack for all connected peers, guard against session changes during getUserMedia/replaceTrack, restore fallback on failure, stop new stream on error
- Add `devicechange` listener to detect device removal and show recoverable error
- Expose `devices`, `selectedDevice`, `switchMicrophone`, and `switchingMicrophone` in hook return
- Add native `<select>` element and label in the sound-check panel (audio-panel) in `page.tsx`
- Add `.mic-label` and `.mic-select` CSS in `app/globals.css` with custom dropdown arrow

Code review found correctness issues. Kiro corrected the implementation:
1. Call existing `stop()` at switch start to disable transmission and release floor; do NOT stop old stream or clear mic.current before obtaining the new track
2. Use `Promise.allSettled` for sender replacements; roll back successful senders to their original live track if any fail; stop old stream only after all replacements succeed; removed separate fallback microphone request
3. Allow selecting a microphone after device disappearance even when mic.current is null or selectedDevice matches but track ended
4. Pause new-peer creation in polling loop while switching to avoid attaching stale track
5. Guard enumeration/devicechange results and finally cleanup against different current session to prevent old operations from clearing new session switching lock
6. Expose `switchingMicrophone` state and disable native select while switching

The session used only file read/edit tools as requested. No shell commands, npm install, git operations, or deployment were performed. User will run validation separately. Actual device enumeration, track replacement, rollback on failure, device removal handling, and cross-browser compatibility remain unverified.

### 14 November 2026 — Connection recovery

In a subsequent session, the user requested connection-recovery implementation. Using Claude Sonnet 4.5, Kiro read `app/use-radio.ts` and `app/api/radio/route.ts`.

Kiro used Replace in File to:
- Update API route to permit `restart-request` in signal payload types alongside offer/answer/ice
- Add `retrying`, `retryAttempts`, and `retryTimer` fields to Peer type
- Add `retryingPeers` reactive state for UI visibility
- Create unified `performRetry()` helper before polling effect with: per-peer busy guard, three-attempt budget, stop() before retry, stable signaling state check, disabled tracks, 10-second timeout kept pending through negotiation, guards on every async continuation checking current session AND peers.current.get(id)===peer
- Update `retryConnection()` manual wrapper to use unified helper
- Handle incoming `restart-request` signals through unified helper, counting attempts for both manual and incoming paths
- Clear retry timer and state on successful answer in signal handling, on connected state in onconnectionstatechange, and on thrown errors
- Reset attempt budget only after full negotiation completes (connected state)
- Clear retry timers on peer removal in polling loop and in cleanup
- Update `start()` to check for missing/ended mic both before AND after awaiting floor grant
- Pause new-peer creation when no live audio track exists
- Add Retry button in crew list UI for failed/disconnected peers, disabled while retrying, showing "Retrying…" status
- Add `.retry-button` CSS styling
- Expose `retryConnection` and `retryingPeers` in hook return
- Update cleanup to reset `switchingMicrophone` state and `retryingPeers`

The session used only file read/edit tools as requested. No shell commands, npm install, git operations, or deployment were performed. At the end of Kiro's session validation was pending.

### Codex review and verification after Kiro refinements

Codex repaired retry completion on both sides of an offer/answer exchange when ICE remains connected (and therefore emits no new connected event), guarded async retry continuations after timeout, added local-offer rollback on timeout, and retained pending peer offers while microphone switching defers peer creation. These repairs must not be attributed to Kiro.

The final synthetic browser run passed: actual WebRTC/D1 connection and decoded media both directions, push-to-talk gating, release-before-grant, blur, a real higher-ID requested ICE restart through the designated offerer, a three-attempt failure budget, immediate silence on switching, track replacement, replacement failure rollback, device-disappearance stop/recovery, leave while getUserMedia is pending, and permission-denial handling. Backend integration, expiry and entry-throttle tests passed. Synthetic input/device enumeration does not establish physical microphone or cross-network compatibility. Timer-expiry behavior and multi-peer partial rollback still require broader fault testing.

Codex prepared the submission copy, private GitHub repository, Devpost draft and a narrated screen demonstration. The owner completed Devpost registration and accepted the eligibility/rules terms personally. No Kiro User ID or account credentials are committed.
