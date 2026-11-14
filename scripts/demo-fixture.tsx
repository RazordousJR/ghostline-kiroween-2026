"use client";
// Real product UI and real signaling; generated input avoids capturing a person.
// Temporary local-only capture surface. Never deploy this route.
import { useEffect, useRef, useState } from "react";
import Home from "../app/page";
import { useRadio } from "../app/use-radio";
export default function DemoFixture() {
  const [ready, setReady] = useState(false);
  const [joined, setJoined] = useState(false);
  const remote = useRadio();
  const latest = useRef(remote);
  latest.current = remote;
  useEffect(() => {
    if (!ready) return;
    let joining = false;
    const timer = setInterval(() => {
      const code = location.hash.slice(1);
      if (code && !joining && !latest.current.session) {
        joining = true;
        void latest.current.join("join", "Bravo", code, "").finally(() => { joining = false; });
      }
      setJoined(!!latest.current.session);
    }, 500);
    return () => clearInterval(timer);
  }, [ready]);
  const setup = () => {
    if (!["127.0.0.1", "localhost"].includes(location.hostname)) return;
    const contexts: AudioContext[] = [];
    const getMedia = navigator.mediaDevices.getUserMedia;
    const enumerate = navigator.mediaDevices.enumerateDevices;
    const oldName = localStorage.getItem("ghostline-callsign");
    localStorage.setItem("ghostline-callsign", "Alpha");
    history.replaceState(null, "", location.pathname);
    navigator.mediaDevices.getUserMedia = async () => {
      const context = new AudioContext();
      contexts.push(context);
      await context.resume();
      const tone = context.createOscillator();
      const gain = context.createGain();
      const output = context.createMediaStreamDestination();
      gain.gain.value = 0.08;
      tone.frequency.value = 440;
      tone.connect(gain).connect(output);
      tone.start();
      output.stream.getAudioTracks()[0].getSettings = () => ({ deviceId: "demo-tone" });
      return output.stream;
    };
    navigator.mediaDevices.enumerateDevices = async () => [{ deviceId: "demo-tone", groupId: "demo", kind: "audioinput", label: "Generated demo tone", toJSON: () => ({}) } as MediaDeviceInfo];
    window.addEventListener("pagehide", () => {
      navigator.mediaDevices.getUserMedia = getMedia;
      navigator.mediaDevices.enumerateDevices = enumerate;
      contexts.forEach((c) => void c.close());
      if (oldName) localStorage.setItem("ghostline-callsign", oldName);
      else localStorage.removeItem("ghostline-callsign");
    }, { once: true });
    setReady(true);
  };
  return <>
    <div style={{ background: "#183b2b", color: "white", padding: "8px 24px", font: "13px monospace", display: "flex", gap: 20, alignItems: "center" }}>
      <span>LOCAL DEMO · generated audio · real WebRTC + D1 · no physical microphone</span>
      {!ready ? <button onClick={setup}>Start demo</button> : <>
        <span>Bravo: {joined ? "joined" : "waiting for channel"}</span>
        <button onPointerDown={() => void remote.start()} onPointerUp={remote.stop} onPointerLeave={remote.stop}>Hold Bravo transmit</button>
      </>}
    </div>
    {ready && <Home />}
  </>;
}
