# Ghostline

**Tagline:** The walkie-talkie, resurrected for your browser.

**Category:** Resurrection

**Working app:** https://ghostline-radio-kiroween.razordous.chatgpt.site

**Source:** https://github.com/RazordousJR/ghostline-kiroween-2026

The links must be checked for anonymous judge access before submission. The GitHub repository and app remain private until the owner approves publication. Add the final public YouTube URL after the demo is uploaded; do not submit this draft with a missing video.

## Inspiration

A handheld radio has a useful constraint: hold a button, say what matters, then make room for someone else. That small ritual can be easier to understand than a meeting link, a permanent group chat, or an always-open microphone.

Ghostline reimagines that classic push-to-talk experience for a browser. The intended audience is small, temporary crews: volunteers coordinating an event, a few people setting up a room, or friends doing something together. The aim is a short-lived voice channel with a familiar physical interaction and very little setup.

## What it does

Create a channel, choose a callsign, and share its code, link or locally generated QR invitation. Up to six active radios can join. Hold the large button, or Space, to transmit; release to listen. A server-side floor lease permits one speaker at a time and releases abandoned transmissions. Channels expire after four hours, and a transmission lasts at most fifteen seconds.

The crew list shows actual presence and peer connection state. Receive volume and mute are separate from transmit control. The microphone starts disabled and stops immediately on release, loss of focus or a hidden page. The app does not record audio.

## How we built it

The frontend uses React and TypeScript with Vinext. Browser-to-browser audio uses WebRTC. A Cloudflare Worker and D1 database handle short-lived room membership, authenticated signaling and atomic floor ownership. Each member receives its own random session credential; signaling is scoped to that member's room and intended recipient.

The visual design borrows the material language of a handheld field radio: olive housing, a phosphor-green display, speaker slots and a large push-to-talk surface. The visual waveform indicates who holds the floor; it is not an audio loudness measurement.

Kiro IDE was used with explicit requirements and steering documents. Its actual contributions, review corrections and the division of work with Codex are documented in `docs/development-log.md` and `submission/KIRO-USAGE.md`. We include `.kiro` in the repository. We do not claim use of Kiro Crew, hooks, MCP or the built-in Spec workflow where those were not run.

## Challenges we ran into

The hardest part was not the radio skin. It was making the microphone lifecycle match the promise of push-to-talk. A release can happen before the server grants a pending floor request, a device can disappear, or a user can leave while an asynchronous operation is still running. We treated silence on these paths as a product requirement and reviewed generated code against it.

Networking has a practical limit too: some NAT and firewall combinations require a TURN relay. The app supports host-provided TURN configuration. A relay must not be claimed as available until it has actually been configured and tested.

## Accomplishments

The application has real room-scoped signaling and WebRTC audio rather than a mocked connected state. Backend integration tests verify identity checks, room isolation, six-member capacity, competing floor claims, cursor behavior, expiry and rejoining. A browser diagnostic runs two real app hooks with generated audio and confirms decoded media in both directions plus microphone gating. QR invitations are generated on-device and the dialog supports keyboard containment, Escape and focus return.

See `docs/verification.md` for the exact checks and remaining limits. Synthetic same-browser media tests are not described as physical two-device validation.

## What we learned

Written requirements were most useful when they described observable behavior: releasing before a grant must never open the microphone; changing inputs must not silently turn it on; a failed switch must not destroy the existing input. Small Kiro tasks, direct code review and executable browser checks made those constraints easier to assess than a broad request to build the whole app at once.

## What's next

Broader mobile and cross-network testing, production TURN credentials, and feedback from real small-crew use. Ghostline is a prototype for ordinary coordination, not an emergency communications service.

## Built with

TypeScript, React, WebRTC, Web Audio, Cloudflare Workers, Cloudflare D1, Vinext, Vite, Kiro IDE, Codex, qrcode, Lucide.
