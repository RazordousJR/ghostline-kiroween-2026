# How Kiro was used

## Workflow

Ghostline began as a Codex-authored prototype during the hackathon build period. We then used Kiro IDE with the project's `.kiro/steering` and `.kiro/specs/radio-refinements` documents to develop bounded features and review asynchronous media behavior. The initial scaffold and later completion work are explicitly distinguished from Kiro's contributions.

The steering documents describe the product, technical architecture, visual language and microphone safety invariants. Requirements describe observable behavior; unchecked tasks identify work that still needs implementation or verification. These files were supplied as context in the actual Kiro sessions, not added as a substitute for tool use.

## Recorded Kiro contributions

- Initial QR invitation component and refinement design; initial qrcode dependency declaration.
- Microphone input enumeration and selection UI, track replacement workflow and device-disappearance handling.
- Follow-up corrections requested during code review: release the floor before switching, preserve the old input until replacement succeeds, await and roll back replacements, recover after device removal, pause new peer creation during switching, and guard results against session changes.
- Manual ICE recovery, a designated restart offerer, authenticated restart requests, retry state, timeout/budget guards and the crew Retry UI. A follow-up review corrected early timeout cleanup and unified incoming/manual requests.

Codex verified microphone switching, failure rollback, device disappearance/recovery, leaving during a pending capture request, an actual ICE restart and the three-attempt budget in the synthetic browser fixture. Codex also repaired retry completion when ICE stays connected, guarded timed-out async continuations and retained pending peer offers while microphone selection defers peer creation. Physical-device and restrictive-network validation remain pending. The authoritative record is `docs/development-log.md`.

## Review example

The first microphone-switching draft stopped the old stream before a replacement had succeeded. Review caught that this could leave the user without a usable input and could fail to release a transmission lease. A targeted correction instructed Kiro to call the existing transmit-stop function, keep the old stream disabled but live, wait for all sender replacements, and roll successful senders back if any replacement failed.

That is the central engineering lesson from using Kiro here: clear invariants and small reviewable tasks mattered more than generating a large amount of code quickly.

## Verification and other tools

Codex performed integration, additional repairs, dependency installation, builds, browser verification, publishing and submission packaging. Backend tests check authorization, capacity, floor arbitration and expiry. Browser tests use generated tones and actual WebRTC connections to inspect decoded audio and microphone gating; they are not passed off as physical-device recordings.

We used the Kiro IDE's standard agent with file read/edit tools. We did not run Kiro Crew, custom agents, hooks, MCP integrations, property-based tests or the built-in Spec workflow. We do not claim otherwise. The repository includes an MIT license and the `.kiro` configuration needed to understand the work.
