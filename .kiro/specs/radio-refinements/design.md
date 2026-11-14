# Radio refinements design

## 1. QR invitation dialog

**Implementation**: New `app/qr-invite.tsx` component renders a modal dialog with locally generated QR code.

- Use `qrcode` npm package's `toDataURL()` browser API to generate a data URI containing the channel URL
- QR margin set to 4 modules for proper quiet zone
- Dialog triggered by a secondary button in joined-state, alongside the existing "Copy invite link" action
- Modal backdrop with click-to-close, Escape key handler
- Focus trap: dialog button receives focus on open, returns to trigger on close
- Accessible: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- No external QR service requests; generation happens client-side in the browser

**Styling**: Matches existing cream/olive radio aesthetic with panel borders, mono font for labels, primary button styling.

## 2. Microphone input selection (deferred)

Will implement safe device switching using `MediaDevices.enumerateDevices()` and `replaceTrack()` on all peer sender tracks. New tracks remain disabled until next granted transmission. Switching operation will call `stop()` first and block `start()` during the switch.

## 3. Connection recovery (deferred)

Will implement bounded retry action for failed peer connections using a restart-request signal. Only the peer with lower ID initiates ICE restart offers to prevent conflicts. API validation will include the new signal type.
