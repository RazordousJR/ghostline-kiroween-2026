"use client";
import { useEffect, useState } from "react";
import {
  Radio,
  ArrowUpRight,
  Signal,
  Volume2,
  VolumeX,
  Mic,
  Headphones,
  Copy,
  Check,
  Power,
  Plus,
  ArrowRight,
  Antenna,
  LockKeyhole,
  RadioTower,
  X,
} from "lucide-react";
import { useRadio } from "./use-radio";
import { QRInvite } from "./qr-invite";
export default function Home() {
  const r = useRadio();
  const [mode, setMode] = useState<"create" | "join">("create"),
    [name, setName] = useState(""),
    [roomName, setRoomName] = useState("Midnight crew"),
    [code, setCode] = useState(""),
    [copied, setCopied] = useState(false),
    [help, setHelp] = useState(false),
    [testing, setTesting] = useState(false),
    [micStatus, setMicStatus] = useState("");
  useEffect(() => {
    setName(localStorage.getItem("ghostline-callsign") || "");
    const fragment = location.hash
      .slice(1)
      .replace(/[^A-Z0-9]/gi, "")
      .toUpperCase();
    if (fragment) {
      setCode(fragment);
      setMode("join");
    }
  }, []);
  const connected = Object.values(r.links).filter(
      (v) => v === "connected",
    ).length,
    speakerName = r.members.find((m) => m.id === r.speaker)?.name;
  const formattedCode = r.session
    ? `${r.session.code.slice(0, 5)}-${r.session.code.slice(5)}`
    : "— — — — —";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        `${location.origin}/#${r.session!.code}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      r.setError(
        "Copy unavailable. Share the channel code shown on the radio.",
      );
    }
  };
  const testMic = async () => {
    setTesting(true);
    setMicStatus("");
    let stream: MediaStream | undefined, context: AudioContext | undefined;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      context = new AudioContext();
      await context.resume();
      const analyser = context.createAnalyser();
      context.createMediaStreamSource(stream).connect(analyser);
      const values = new Uint8Array(analyser.fftSize);
      setMicStatus("Say something…");
      let peak = 0;
      for (let i = 0; i < 30; i++) {
        analyser.getByteTimeDomainData(values);
        peak = Math.max(peak, ...Array.from(values, (v) => Math.abs(v - 128)));
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      setMicStatus(
        peak > 3
          ? "Mic ready. Loud and clear."
          : "Mic found, but no voice detected. Check your input.",
      );
    } catch {
      setMicStatus(
        "Mic unavailable. Check browser permissions and your input device.",
      );
    } finally {
      stream?.getTracks().forEach((t) => t.stop());
      await context?.close();
      setTesting(false);
    }
  };
  return (
    <main>
      <header className="topbar">
        <a className="brand" href="/" aria-label="Ghostline home">
          <span className="brand-icon">
            <Radio size={23} />
          </span>
          ghostline
          <span className="brand-dot" aria-hidden="true">
            ✳
          </span>
        </a>
        <div className="header-note">
          <span className="status-dot" /> A NEW LIFE FOR OLD FREQUENCIES
        </div>
        <button className="how-button" onClick={() => setHelp(true)}>
          Field guide <ArrowUpRight size={16} />
        </button>
      </header>
      <section className="intro">
        <div>
          <div className="eyebrow">
            <span /> THE WALKIE-TALKIE, RESURRECTED.
          </div>
          <h1>
            Good company.
            <br />
            Same <em>frequency.</em>
          </h1>
          <p>
            No feeds. No endless threads. Just your people,
            <br className="desktop-break" /> one button, and a little room on
            the airwaves.
          </p>
        </div>
        <div className="edition">
          <Antenna size={39} strokeWidth={1} />
          <span>FIELD UNIT / 001</span>
          <b>
            BUILT FOR YOUR CREW.
            <br />
            NOT YOUR FOLLOWERS.
          </b>
        </div>
      </section>
      <section className="workspace" aria-label="Radio workspace">
        <aside className="panel channel-panel">
          <div className="panel-heading">
            <span>01 / YOUR CHANNEL</span>
            <RadioTower size={17} />
          </div>
          {r.session ? (
            <div className="joined-state">
              <span className="onair-tag">
                <span className="status-dot" /> CHANNEL OPEN
              </span>
              <h2>{r.session.roomName}</h2>
              <p className="subtext">Your crew is one link away.</p>
              <div className="share-code">
                <span>PRIVATE FREQUENCY</span>
                <strong>{formattedCode}</strong>
              </div>
              <button className="primary-button" onClick={copy}>
                {copied ? <Check size={17} /> : <Copy size={17} />}{" "}
                {copied ? "Link copied" : "Copy invite link"}
              </button>
              <QRInvite code={r.session.code} />
              <p className="small-note">
                Anyone with the code can join. Share it with your crew only.
                Channels expire after 4 hours.
              </p>
              <button className="leave-button" onClick={r.leave}>
                <Power size={15} /> Leave channel
              </button>
            </div>
          ) : (
            <>
              <h2>
                A place for
                <br />
                your people.
              </h2>
              <p className="subtext">Open a channel. Bring the crew.</p>
              <div className="mode-tabs" aria-label="Channel action">
                <button
                  className={mode === "create" ? "selected" : ""}
                  onClick={() => setMode("create")}
                >
                  Create channel
                </button>
                <button
                  className={mode === "join" ? "selected" : ""}
                  onClick={() => setMode("join")}
                >
                  Join channel
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void r.join(mode, name, code, roomName);
                }}
              >
                <label htmlFor="callsign">
                  YOUR CALLSIGN <span>What should we call you?</span>
                </label>
                <input
                  id="callsign"
                  placeholder="e.g. Night owl"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={24}
                  autoComplete="nickname"
                  disabled={r.busy}
                />
                {mode === "create" ? (
                  <>
                    <label htmlFor="channel-name">CHANNEL NAME</label>
                    <input
                      id="channel-name"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      maxLength={32}
                      required
                      disabled={r.busy}
                    />
                  </>
                ) : (
                  <>
                    <label htmlFor="channel-code">CHANNEL CODE</label>
                    <input
                      id="channel-code"
                      className="code-input"
                      placeholder="ABCDE-FG234"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      required
                      maxLength={20}
                      autoComplete="off"
                      disabled={r.busy}
                    />
                  </>
                )}
                <button
                  className="primary-button"
                  disabled={r.busy || testing}
                  type="submit"
                >
                  {r.busy
                    ? "Tuning in…"
                    : mode === "create"
                      ? "Open a channel"
                      : "Tune in"}
                  {!r.busy && <ArrowRight size={18} />}
                </button>
              </form>
              <div className="private-note">
                <LockKeyhole size={13} />
                <span>No account. No recordings. Just voices.</span>
              </div>
            </>
          )}
          <div className="channel-bottom">
            <span className="mini-line" /> SMALL CREWS. BIG SIGNAL.
          </div>
        </aside>
        <div className={`radio-unit ${r.talking ? "is-transmitting" : ""}`}>
          <div className="screw s1" />
          <div className="screw s2" />
          <div className="screw s3" />
          <div className="screw s4" />
          <div className="radio-top">
            <span>
              GHOSTLINE<span className="model"> / GL–01</span>
            </span>
            <div className="rx-led">
              <i className={r.session ? "lit" : ""} />
              {r.talking ? "TX" : "RX"}
            </div>
          </div>
          <div className="speaker-grill" aria-hidden="true">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} />
            ))}
          </div>
          <div className="lcd">
            <div className="lcd-top">
              <span>CH {r.session ? "01" : "— —"}</span>
              <span>
                <Signal size={16} />
                {r.session ? "LINK" : "IDLE"}
              </span>
            </div>
            <div className="lcd-channel">
              {r.session ? r.session.roomName.toUpperCase() : "OFF THE GRID"}
            </div>
            <div
              className={`waveform ${r.speaker ? "active" : ""}`}
              aria-hidden="true"
            >
              {Array.from({ length: 45 }, (_, i) => (
                <i
                  key={i}
                  style={{
                    height: `${8 + ((i * 17 + 11) % 29)}px`,
                    animationDelay: `${i * 31}ms`,
                  }}
                />
              ))}
            </div>
            <div className="lcd-bottom">
              <span>
                {r.talking
                  ? "TRANSMITTING"
                  : r.speaker
                    ? `${speakerName || "CREW"} ON AIR`
                    : r.session
                      ? connected
                        ? "READY TO RECEIVE"
                        : "WAITING FOR CREW"
                      : "AWAITING FREQUENCY"}
              </span>
              <span>{String(r.members.length).padStart(2, "0")}/06</span>
            </div>
          </div>
          <div className="radio-controls">
            <span className="control-caption">
              <span className="status-dot" />
              {r.session
                ? connected
                  ? "SIGNAL CONNECTED"
                  : "CHANNEL OPEN"
                : "STANDING BY"}
            </span>
            <button
              className="volume-toggle"
              onClick={() => r.setMuted(!r.muted)}
              aria-label={
                r.muted ? "Unmute received audio" : "Mute received audio"
              }
            >
              {r.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>
          <button
            className="ptt-button"
            disabled={!r.session}
            aria-label="Hold to talk"
            aria-pressed={r.talking}
            onPointerDown={(e) => {
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              void r.start();
            }}
            onPointerUp={r.stop}
            onPointerCancel={r.stop}
            onLostPointerCapture={r.stop}
            onKeyDown={(e) => {
              if ((e.code === "Space" || e.code === "Enter") && !e.repeat) {
                e.preventDefault();
                void r.start();
              }
            }}
            onKeyUp={(e) => {
              if (e.code === "Space" || e.code === "Enter") {
                e.preventDefault();
                r.stop();
              }
            }}
            onContextMenu={(e) => e.preventDefault()}
          >
            <div className="ptt-inner">
              <Mic size={27} strokeWidth={1.6} />
              <strong>{r.talking ? "YOU’RE ON AIR" : "HOLD TO TALK"}</strong>
              <span>
                {r.session ? "RELEASE TO LISTEN" : "OPEN A CHANNEL TO BEGIN"}
              </span>
            </div>
          </button>
          <div className="radio-footer">
            <span>HALF DUPLEX / FULL CONNECTION</span>
            <span>◈</span>
          </div>
        </div>
        <aside className="right-column">
          <div className="panel crew-panel">
            <div className="panel-heading">
              <span>02 / ON THIS FREQUENCY</span>
              <span className="count-badge">{r.members.length}/6</span>
            </div>
            <div className="crew-heading">
              <h2>The crew</h2>
              {r.session && (
                <button
                  aria-label="Copy crew invite"
                  className="icon-button"
                  onClick={copy}
                >
                  {copied ? <Check size={17} /> : <Plus size={17} />}
                </button>
              )}
            </div>
            {r.members.length ? (
              <ul className="crew-list">
                {r.members.map((m) => (
                  <li key={m.id}>
                    <span
                      className={`avatar ${r.speaker === m.id ? "speaking" : ""}`}
                    >
                      {m.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <b>
                        {m.name}
                        {m.id === r.session?.id && <small> YOU</small>}
                      </b>
                      <span>
                        {r.retryingPeers.has(m.id)
                          ? "Retrying…"
                          : r.speaker === m.id
                            ? "On air"
                            : m.id === r.session?.id
                              ? "Standing by"
                              : r.links[m.id] === "connected"
                                ? "Connected"
                                : r.links[m.id] === "failed"
                                  ? "Connection failed"
                                  : "Connecting…"}
                      </span>
                    </div>
                    {m.id !== r.session?.id &&
                    (r.links[m.id] === "failed" ||
                      r.links[m.id] === "disconnected") ? (
                      <button
                        className="retry-button"
                        onClick={() => r.retryConnection(m.id)}
                        disabled={r.retryingPeers.has(m.id)}
                        aria-label={`Retry connection to ${m.name}`}
                      >
                        Retry
                      </button>
                    ) : (
                      <Signal
                        size={16}
                        className={
                          r.links[m.id] === "connected" ||
                          m.id === r.session?.id
                            ? "good-signal"
                            : "weak-signal"
                        }
                      />
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-crew">
                <span className="empty-icon">
                  <Headphones size={24} strokeWidth={1.4} />
                </span>
                <p>Your people belong here.</p>
                <span>Open a channel and send them the link.</span>
              </div>
            )}
            <div className="crew-hint">
              <span className="status-dot" />{" "}
              {r.session
                ? `${connected} peer${connected === 1 ? "" : "s"} connected`
                : "A little less scrolling. A little more talking."}
            </div>
          </div>
          <div className="panel audio-panel">
            <div className="panel-heading">
              <span>03 / SOUND CHECK</span>
              <Volume2 size={16} />
            </div>
            <div className="volume-label">
              <label htmlFor="volume">Receive volume</label>
              <span>{r.muted ? "MUTED" : `${r.volume}%`}</span>
            </div>
            <input
              id="volume"
              aria-label="Receive volume"
              type="range"
              min="0"
              max="100"
              value={r.volume}
              onChange={(e) => r.setVolume(Number(e.target.value))}
            />
            {r.session && r.devices.length > 0 && (
              <>
                <label htmlFor="microphone-select" className="mic-label">
                  Microphone
                </label>
                <select
                  id="microphone-select"
                  className="mic-select"
                  value={r.selectedDevice}
                  onChange={(e) => r.switchMicrophone(e.target.value)}
                  disabled={r.switchingMicrophone}
                >
                  {r.devices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </>
            )}
            <button
              className="mic-check"
              onClick={r.session ? r.enableAudio : testMic}
              disabled={testing}
            >
              <Mic size={14} />
              {r.session
                ? "Enable audio"
                : testing
                  ? "Listening for 3 seconds…"
                  : "Check your microphone"}
              <ArrowUpRight size={14} />
            </button>
            {micStatus && (
              <p className="mic-result" role="status">
                {micStatus}
              </p>
            )}
          </div>
        </aside>
      </section>
      {r.error && (
        <div className="error-banner" role="alert">
          <span>{r.error}</span>
          <button aria-label="Dismiss message" onClick={() => r.setError("")}>
            <X size={16} />
          </button>
        </div>
      )}
      <section className="below-radio">
        <div className="keyboard-tip">
          <span className="keycap">SPACE</span>
          <p>
            Hold to talk. Release to listen.
            <br />
            <span>Like the old days. Minus the batteries.</span>
          </p>
        </div>
        <div className="network-note">
          <LockKeyhole size={16} />
          <p>
            Live audio. Never recorded.
            <br />
            <span>
              {r.session
                ? r.session.hasTurn
                  ? "TURN relay available for restrictive networks."
                  : "Direct connections. Some networks may need a relay."
                : "Mic stays off until you hold the button."}
            </span>
          </p>
        </div>
      </section>
      <section className="activity-panel">
        <div className="panel-heading">
          <span>TRANSMISSION LOG</span>
          <span>LIVE SESSION ONLY</span>
        </div>
        {r.logs.length ? (
          <ul>
            {r.logs.slice(0, 4).map((log, i) => (
              <li key={`${log.time}-${i}`}>
                <time>{log.time}</time>
                <span>{log.text}</span>
                <span className="log-end">↗</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-log">
            <span>— — : — —</span> Quiet on the airwaves. Your story starts when
            you tune in.
          </div>
        )}
      </section>
      <footer className="page-footer">
        <span>
          ghostline<span className="footer-mark"> / </span> BRING BACK THE HUMAN
          SIGNAL.
        </span>
        <span>
          INTERNET REQUIRED <i /> MADE FOR SMALL CREWS
        </span>
      </footer>
      {help && (
        <div className="modal-backdrop" onClick={() => setHelp(false)}>
          <section
            className="guide-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="guide-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-guide"
              aria-label="Close field guide"
              onClick={() => setHelp(false)}
            >
              <X />
            </button>
            <div className="eyebrow">THE FIELD GUIDE</div>
            <h2 id="guide-title">A good old radio check.</h2>
            <ol>
              <li>
                <b>Find your callsign.</b>
                <p>
                  Create a channel and allow your microphone. Your mic starts
                  off.
                </p>
              </li>
              <li>
                <b>Bring your people.</b>
                <p>
                  Copy the invite link. Up to 6 radios can join; everyone needs
                  the site’s access permission. Channels last 4 hours.
                </p>
              </li>
              <li>
                <b>Hold. Talk. Release.</b>
                <p>
                  Hold the big button or Space to speak for up to 15 seconds.
                  One voice at a time. Use headphones to avoid echo.
                </p>
              </li>
            </ol>
            <p className="guide-note">
              Ghostline needs the internet and a supported browser. Audio
              travels through WebRTC and is not recorded by this app. Room and
              connection metadata are temporary. Restrictive networks may need a
              TURN relay; this preview is not an emergency communication
              service.
            </p>
            <button className="primary-button" onClick={() => setHelp(false)}>
              Copy that <Check size={17} />
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
