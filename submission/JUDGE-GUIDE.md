# Judge testing guide

1. Open the app in a current desktop browser over HTTPS. The submitted link must permit judge access; the development preview is owner-private until publication is approved.
2. Use headphones. Choose a callsign such as Alpha and create a channel. Allow microphone access when ready. The microphone starts disabled.
3. Copy the invite link or display its QR code. Open it in a second browser/device and join with another callsign. Wait for the peer state to say Connected.
4. Hold the large button, or press and hold Space while focus is outside an input, to speak. Release to listen. Only one radio can hold the floor, with a fifteen-second transmission limit.
5. Try speaking in the opposite direction. Try receive volume and mute. Open and close the QR dialog using the keyboard.
6. Leave the channel when finished. Channels expire after four hours. A browser that goes offline must rejoin after its presence session expires.

## If no sound arrives

- Confirm both browsers granted microphone permission, selected a working input, and show Connected.
- Click Enable audio if browser autoplay was blocked. Check receive mute/volume and system output.
- Release before the other person talks. Use headphones to avoid echo.
- Try both clients on the same Wi-Fi. Some networks require a TURN relay; the interface reports whether one is configured. The prototype must not be represented as reliable emergency communication.

## Local verification

The repository includes a temporary local browser diagnostic with two actual `useRadio` clients and generated tones. It verifies media transport without capturing a physical microphone. Follow README instructions and remove the diagnostic route before building for production. Exact test coverage and physical-device limitations are recorded in `docs/verification.md`.
