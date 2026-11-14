# Ghostline: radio refinements

This spec is prepared before the first Kiro session. It is not evidence of Kiro execution.

## 1. QR invitations
- WHEN a member opens their invite, THE SYSTEM SHALL display a locally generated QR code containing the same channel URL as Copy invite link.
- THE SYSTEM SHALL not send the room URL to any third-party QR service.
- WHEN the user closes the invite, keyboard focus SHALL return to the invite button.

## 2. Microphone selection
- WHEN microphone permission has been granted, THE SYSTEM SHALL list available audio input devices and permit choosing an input.
- WHEN changing microphones, THE SYSTEM SHALL keep all new tracks disabled until the next granted push-to-talk request.
- THE SYSTEM SHALL replace sender tracks for every connected peer and stop the previous device tracks.
- WHEN a selected device disappears, THE SYSTEM SHALL show a recoverable message and stop transmitting.

## 3. Connection recovery
- WHEN a peer connection fails, THE SYSTEM SHALL offer a visible retry action and prevent overlapping ICE restarts.
- THE SYSTEM SHALL label relay availability accurately and provide a clear failure message if direct networking cannot connect.

## 4. Validation and evidence
- Release-before-grant, tab hiding, permission denial, competing floor claims and six-member capacity SHALL be verified.
- Two real browser clients SHALL establish audio in both directions using headphones before claiming end-to-end voice validation.
- Record actual Kiro changes and checks in docs/development-log.md. Do not mark tasks complete solely because scaffolding exists.
