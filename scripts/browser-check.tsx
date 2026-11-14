"use client";
// Local-only diagnostic fixture. The route wrapper is installed temporarily and
// removed before production builds. It never opens a physical microphone.
import { useCallback, useEffect, useRef, useState } from "react";
import { useRadio } from "../app/use-radio";
import { QRInvite, QRInviteDialog } from "../app/qr-invite";
type RadioState = ReturnType<typeof useRadio>;
function Probe({
  index,
  report,
}: {
  index: number;
  report: (index: number, radio: RadioState) => void;
}) {
  const radio = useRadio();
  useEffect(() => {
    radio.setMuted(true);
  }, [radio.setMuted]);
  useEffect(() => {
    report(index, radio);
  });
  return (
    <div className="panel" style={{ padding: 20 }}>
      <h2>Test radio {index + 1}</h2>
      <p>{radio.session ? `Channel ${radio.session.code}` : "Signed off"}</p>
      <p>
        {Object.values(radio.links).filter((v) => v === "connected").length}{" "}
        peer connected · {radio.talking ? "transmitting" : "silent"}
      </p>
      {radio.error && <p role="alert">{radio.error}</p>}
    </div>
  );
}
export default function BrowserCheck() {
  const radios = useRef<(RadioState | null)[]>([null, null]);
  const [logs, setLogs] = useState<string[]>([]),
    [running, setRunning] = useState(false),
    [badQr, setBadQr] = useState(false);
  const report = useCallback((index: number, radio: RadioState) => {
    radios.current[index] = radio;
  }, []);
  const write = (text: string) => setLogs((v) => [...v, text]);
  const closeBadQr = useCallback(() => setBadQr(false), []);
  const run = async () => {
    if (!["127.0.0.1", "localhost"].includes(location.hostname)) return;
    setRunning(true);
    setLogs([]);
    const contexts: AudioContext[] = [],
      pcs: RTCPeerConnection[] = [],
      receivers: AnalyserNode[] = [];
    const oldGetMedia = navigator.mediaDevices.getUserMedia;
    const oldEnumerate = navigator.mediaDevices.enumerateDevices;
    let availableDevices = ["synthetic-a", "synthetic-b"];
    let mediaDelay = 0;
    const generatedTracks: MediaStreamTrack[] = [];
    const previousCallsign = localStorage.getItem("ghostline-callsign");
    const OriginalPeer = window.RTCPeerConnection,
      originalFetch = window.fetch;
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    const waitFor = async (
      condition: () => boolean,
      message: string,
      timeout = 15000,
    ) => {
      const end = Date.now() + timeout;
      while (!condition()) {
        if (Date.now() > end) throw new Error(message);
        await delay(100);
      }
    };
    const assert = (condition: boolean, message: string) => {
      if (!condition) throw new Error(message);
      write(`PASS: ${message}`);
    };
    try {
      navigator.mediaDevices.enumerateDevices = async () => availableDevices.map((deviceId) => ({
        deviceId, groupId: "synthetic", kind: "audioinput", label: deviceId,
        toJSON() { return { deviceId, kind: "audioinput" }; },
      } as MediaDeviceInfo));
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        if (mediaDelay) await delay(mediaDelay);
        const ctx = new AudioContext();
        contexts.push(ctx);
        await ctx.resume();
        const tone = ctx.createOscillator(),
          gain = ctx.createGain(),
          destination = ctx.createMediaStreamDestination();
        tone.frequency.value = contexts.length === 1 ? 440 : 660;
        gain.gain.value = 0.12;
        tone.connect(gain).connect(destination);
        tone.start();
        const track = destination.stream.getAudioTracks()[0];
        const input = constraints?.audio;
        const deviceId = typeof input === "object" && typeof input.deviceId === "object" && "exact" in input.deviceId
          ? String(input.deviceId.exact) : "synthetic-a";
        track.getSettings = () => ({ deviceId });
        generatedTracks.push(track);
        return destination.stream;
      };
      window.RTCPeerConnection = class extends OriginalPeer {
        constructor(config?: RTCConfiguration) {
          super(config);
          pcs.push(this);
          this.addEventListener("track", (event) => {
            const context = new AudioContext();
            contexts.push(context);
            void context.resume();
            const analyser = context.createAnalyser(),
              silent = context.createGain();
            silent.gain.value = 0;
            // Consume decoded remote samples independently of the muted playback
            // element. The zero-gain sink guarantees no audible test tone.
            context
              .createMediaStreamSource(new MediaStream([event.track]))
              .connect(analyser)
              .connect(silent)
              .connect(context.destination);
            receivers.push(analyser);
          });
        }
      };
      const get = (n: number) => radios.current[n]!;
      await get(0).join("create", "Synthetic Alpha", "", "Local browser check");
      await waitFor(() => !!get(0).session, "First radio did not join");
      await get(1).join("join", "Synthetic Bravo", get(0).session!.code, "");
      await waitFor(
        () =>
          Object.values(get(0).links).includes("connected") &&
          Object.values(get(1).links).includes("connected"),
        "Two WebRTC clients did not connect",
      );
      assert(
        true,
        "two actual useRadio clients establish WebRTC through D1 signaling",
      );
      const tracks = () =>
        pcs.flatMap((pc) =>
          pc
            .getSenders()
            .map((s) => s.track)
            .filter((t): t is MediaStreamTrack => !!t),
        );
      assert(
        tracks().length === 2 && tracks().every((t) => !t.enabled),
        "both microphones start disabled",
      );
      const energy = async () => {
        let total = 0;
        for (const analyser of receivers) {
          const samples = new Float32Array(analyser.fftSize);
          analyser.getFloatTimeDomainData(samples);
          for (const sample of samples)
            total += (sample * sample) / samples.length;
        }
        return total;
      };
      const before = await energy();
      await get(0).start();
      await delay(2200);
      assert(
        get(0).talking && tracks().filter((t) => t.enabled).length === 1,
        "only the granted speaker enables a track",
      );
      assert(
        (await energy()) > before + 0.001,
        "generated audio reaches the other WebRTC client",
      );
      get(0).stop();
      assert(
        tracks().every((t) => !t.enabled),
        "release disables transmission synchronously",
      );
      await delay(900);
      const reverseBefore = await energy();
      await get(1).start();
      await delay(2200);
      assert(
        get(1).talking && (await energy()) > reverseBefore + 0.001,
        "generated audio also reaches the first client in reverse",
      );
      get(1).stop();
      await delay(500);
      window.fetch = async (...args: Parameters<typeof fetch>) => {
        const body = args[1]?.body;
        if (typeof body === "string") {
          const data = JSON.parse(body);
          if (data.action === "floor" && data.claim === true) await delay(300);
        }
        return originalFetch(...args);
      };
      const pending = get(0).start();
      get(0).stop();
      await pending;
      await delay(500);
      assert(
        tracks().every((t) => !t.enabled) && !get(0).talking,
        "release before floor grant never opens the microphone",
      );
      window.fetch = originalFetch;
      await get(0).start();
      await delay(200);
      window.dispatchEvent(new Event("blur"));
      assert(
        tracks().every((t) => !t.enabled),
        "lost window focus immediately disables transmission",
      );
      const lower = get(0).session!.id < get(1).session!.id ? 0 : 1;
      const higher = 1 - lower;
      const restartCounts = new Map<RTCPeerConnection, number>();
      const offers = pcs.map((pc) => ({ pc, original: pc.createOffer.bind(pc) }));
      for (const { pc, original } of offers) pc.createOffer = (async (settings?: RTCOfferOptions) => {
        if (settings?.iceRestart) restartCounts.set(pc, (restartCounts.get(pc) || 0) + 1);
        return original(settings);
      }) as RTCPeerConnection["createOffer"];
      await get(higher).retryConnection(get(lower).session!.id);
      await waitFor(() => [...restartCounts.values()].reduce((a, b) => a + b, 0) === 1, "Restart request did not reach the designated offerer");
      await waitFor(() => pcs.every((pc) => pc.signalingState === "stable"), "ICE restart did not settle");
      assert(tracks().every((t) => !t.enabled), "higher-ID retry creates one real ICE-restart offer and keeps both mics silent");
      for (const { pc, original } of offers) pc.createOffer = original;
      await delay(800);
      let rejectedOffers = 0;
      for (const { pc } of offers) pc.createOffer = async () => {
        rejectedOffers++;
        throw new Error("Synthetic ICE restart failure");
      };
      for (let attempt = 0; attempt < 4; attempt++) await get(lower).retryConnection(get(higher).session!.id);
      assert(rejectedOffers === 3, "manual retries enforce a three-attempt budget after negotiation failures");
      for (const { pc, original } of offers) pc.createOffer = original;
      await delay(700);
      await get(0).start();
      const oldTrack = tracks().find((t) => t.enabled)!;
      mediaDelay = 350;
      const switching = get(0).switchMicrophone("synthetic-b");
      assert(tracks().every((t) => !t.enabled), "microphone switching immediately stops transmission");
      await get(0).start();
      assert(!tracks().some((t) => t.enabled), "push-to-talk stays blocked while switching");
      await switching;
      mediaDelay = 0;
      await waitFor(() => get(0).selectedDevice === "synthetic-b", "Microphone selection did not update");
      assert(oldTrack.readyState === "ended" && tracks().every((t) => !t.enabled), "successful replaceTrack retires the old mic and keeps the new mic silent");
      const sender = pcs.flatMap((pc) => pc.getSenders()).find((s) => s.track?.getSettings().deviceId === "synthetic-b")!;
      const keptTrack = sender.track;
      const originalReplace = sender.replaceTrack.bind(sender);
      let failOnce = true;
      sender.replaceTrack = async (track) => {
        if (failOnce) { failOnce = false; throw new Error("Synthetic replacement failure"); }
        return originalReplace(track);
      };
      await get(0).switchMicrophone("synthetic-a");
      sender.replaceTrack = originalReplace;
      assert(sender.track === keptTrack && keptTrack?.readyState === "live" && !keptTrack.enabled,
        "failed microphone replacement preserves the previous live disabled track");
      availableDevices = ["synthetic-a"];
      navigator.mediaDevices.dispatchEvent(new Event("devicechange"));
      await waitFor(() => get(0).error.includes("disconnected"), "Device removal was not reported");
      await get(0).start();
      assert(!get(0).talking && tracks().every((t) => !t.enabled), "a disconnected mic cannot claim a silent transmission");
      await get(0).switchMicrophone("synthetic-a");
      await waitFor(() => get(0).selectedDevice === "synthetic-a", "Removed mic did not recover");
      assert(tracks().some((t) => t.readyState === "live" && t.getSettings().deviceId === "synthetic-a"), "microphone selection recovers after device disappearance");
      availableDevices = ["synthetic-a", "synthetic-b"];
      mediaDelay = 350;
      const abandonedSwitch = get(0).switchMicrophone("synthetic-b");
      get(0).leave();
      await abandonedSwitch;
      mediaDelay = 0;
      assert(generatedTracks.at(-1)?.readyState === "ended", "leaving during a pending microphone request stops its returned stream");
      get(1).leave();
      await waitFor(
        () => !get(0).session && !get(1).session,
        "Radios did not leave",
      );
      navigator.mediaDevices.getUserMedia = async () => {
        throw new DOMException(
          "Synthetic permission denial",
          "NotAllowedError",
        );
      };
      await get(0).join("create", "Permission check", "", "");
      await waitFor(
        () => get(0).error.includes("Microphone blocked"),
        "Permission denial was not explained",
      );
      assert(
        !get(0).session && tracks().every((t) => !t.enabled),
        "microphone permission denial leaves the radio signed off and silent",
      );
      write(
        "DONE: synthetic media transport and push-to-talk checks passed. No physical microphone or speaker output was used. Real two-device/network testing remains pending.",
      );
    } catch (e) {
      write(`FAIL: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      window.fetch = originalFetch;
      radios.current.forEach((r) => r?.leave());
      navigator.mediaDevices.getUserMedia = oldGetMedia;
      navigator.mediaDevices.enumerateDevices = oldEnumerate;
      window.RTCPeerConnection = OriginalPeer;
      await Promise.all(contexts.map((c) => c.close()));
      setRunning(false);
      if (
        previousCallsign &&
        !["Synthetic Alpha", "Synthetic Bravo", "Permission check"].includes(
          previousCallsign,
        )
      )
        localStorage.setItem("ghostline-callsign", previousCallsign);
      else localStorage.removeItem("ghostline-callsign");
    }
  };
  return (
    <main style={{ paddingTop: 35, paddingBottom: 35 }}>
      <div className="eyebrow">LOCAL DEVELOPMENT CHECK</div>
      <h1 style={{ fontSize: 48 }}>Radio & invitation checks</h1>
      <p>
        This fixture uses generated tones. It does not capture your microphone.
        Received sound is muted.
      </p>
      <button
        className="primary-button"
        style={{ maxWidth: 340, marginTop: 25 }}
        disabled={running}
        onClick={run}
      >
        {running ? "Running radio checks…" : "Run synthetic radio check"}
      </button>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          marginTop: 25,
        }}
      >
        <Probe index={0} report={report} />
        <Probe index={1} report={report} />
      </div>
      <div style={{ maxWidth: 340 }}>
        <QRInvite code="QATEST2345" />
        <button className="qr-trigger" onClick={() => setBadQr(true)}>
          Check QR error handling
        </button>
      </div>
      {badQr && (
        <QRInviteDialog inviteUrl={"x".repeat(10000)} onClose={closeBadQr} />
      )}
      <ol
        aria-label="Browser check results"
        style={{ lineHeight: 1.8, paddingLeft: 20 }}
      >
        {logs.map((text, i) => (
          <li key={i}>{text}</li>
        ))}
      </ol>
    </main>
  );
}
