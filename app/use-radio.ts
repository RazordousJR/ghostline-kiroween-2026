"use client";
import { useCallback, useEffect, useRef, useState } from "react";
type Person = { id: string; name: string };
type Session = {
  id: string;
  secret: string;
  code: string;
  roomName: string;
  expires: number;
  iceServers: RTCIceServer[];
  hasTurn: boolean;
};
type Peer = {
  pc: RTCPeerConnection;
  audio: HTMLAudioElement;
  ice: RTCIceCandidateInit[];
  retrying: boolean;
  retryAttempts: number;
  retryTimer: ReturnType<typeof setTimeout> | null;
};
type RadioResponse = Session & {
  error?: string;
  granted: boolean;
  members: Person[];
  speaker: string | null;
  signals: { id: number; sender: string; body: string }[];
};
export function useRadio() {
  const [session, setSession] = useState<Session | null>(null),
    [members, setMembers] = useState<Person[]>([]),
    [speaker, setSpeaker] = useState<string | null>(null),
    [talking, setTalking] = useState(false),
    [busy, setBusy] = useState(false),
    [muted, setMuted] = useState(false),
    [volume, setVolume] = useState(75),
    [error, setError] = useState(""),
    [logs, setLogs] = useState<{ time: string; text: string }[]>([]),
    [links, setLinks] = useState<Record<string, string>>({}),
    [devices, setDevices] = useState<MediaDeviceInfo[]>([]),
    [selectedDevice, setSelectedDevice] = useState<string>(""),
    [switchingMicrophone, setSwitchingMicrophone] = useState(false),
    [retryingPeers, setRetryingPeers] = useState<Set<string>>(new Set());
  const current = useRef<Session | null>(null),
    mic = useRef<MediaStream | null>(null),
    peers = useRef(new Map<string, Peer>()),
    floor = useRef<string | null>(null),
    held = useRef(false),
    claiming = useRef(false),
    stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    prefs = useRef({ muted, volume }),
    switching = useRef(false);
  const addLog = useCallback(
    (text: string) =>
      setLogs((v) =>
        [
          {
            time: new Date().toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            text,
          },
          ...v,
        ].slice(0, 12),
      ),
    [],
  );
  const api = useCallback(
    async (
      action: string,
      extra: Record<string, unknown> = {},
      s = current.current,
    ) => {
      const response = await fetch("/api/radio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          id: s?.id,
          secret: s?.secret,
          ...extra,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      const data = (await response.json()) as RadioResponse;
      if (!response.ok)
        throw new Error(data.error || "Radio service unavailable.");
      return data;
    },
    [],
  );
  const syncAudio = useCallback(() => {
    for (const [id, p] of peers.current) {
      p.audio.volume = prefs.current.volume / 100;
      p.audio.muted = prefs.current.muted || floor.current !== id;
    }
  }, []);
  useEffect(() => {
    prefs.current = { muted, volume };
    syncAudio();
  }, [muted, volume, syncAudio]);
  const stop = useCallback(() => {
    held.current = false;
    mic.current?.getAudioTracks().forEach((t) => {
      t.enabled = false;
    });
    setTalking(false);
    if (stopTimer.current) clearTimeout(stopTimer.current);
    if (current.current) void api("floor", { claim: false }).catch(() => {});
  }, [api]);
  const cleanup = useCallback(() => {
    held.current = false;
    switching.current = false;
    if (stopTimer.current) clearTimeout(stopTimer.current);
    mic.current?.getTracks().forEach((t) => t.stop());
    mic.current = null;
    for (const p of peers.current.values()) {
      if (p.retryTimer) clearTimeout(p.retryTimer);
      p.pc.close();
      p.audio.pause();
      p.audio.srcObject = null;
    }
    peers.current.clear();
    current.current = null;
    floor.current = null;
    setSession(null);
    setMembers([]);
    setSpeaker(null);
    setTalking(false);
    setLinks({});
    setDevices([]);
    setSelectedDevice("");
    setSwitchingMicrophone(false);
    setRetryingPeers(new Set());
  }, []);
  const leave = useCallback(() => {
    const s = current.current;
    stop();
    cleanup();
    if (s) {
      void api("leave", {}, s).catch(() => {});
      addLog("You signed off. Over and out.");
    }
  }, [api, cleanup, stop, addLog]);
  const join = async (
    action: "create" | "join",
    name: string,
    code: string,
    roomName: string,
  ) => {
    setError("");
    setBusy(true);
    let stream: MediaStream | null = null;
    try {
      if (!name.trim()) throw new Error("Choose a callsign first.");
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          "Microphone access needs HTTPS or localhost in a supported browser.",
        );
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      stream.getAudioTracks().forEach((t) => {
        t.enabled = false;
      });
      const s: Session = await api(action, { name, code, roomName });
      mic.current = stream;
      current.current = s;
      setSession(s);
      setMembers([{ id: s.id, name }]);
      addLog(`Tuned in to ${s.roomName}. Waiting for your crew.`);
      localStorage.setItem("ghostline-callsign", name);
      history.replaceState(null, "", `#${s.code}`);

      // Enumerate devices after permission granted
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        // (5) Guard enumeration results against different session
        if (current.current !== s) return;
        const audioInputs = allDevices.filter((d) => d.kind === "audioinput");
        setDevices(audioInputs);
        const activeTrack = stream.getAudioTracks()[0];
        const activeDeviceId = activeTrack?.getSettings().deviceId || "";
        setSelectedDevice(activeDeviceId);
      } catch {
        // Device enumeration failed, continue without selection UI
      }
    } catch (e) {
      stream?.getTracks().forEach((t) => t.stop());
      setError(
        e instanceof Error && e.name === "NotAllowedError"
          ? "Microphone blocked. Allow microphone access in your browser, then try again."
          : e instanceof Error
            ? e.message
            : "Could not tune in.",
      );
    } finally {
      setBusy(false);
    }
  };

  const switchMicrophone = useCallback(async (deviceId: string) => {
    if (!current.current || switching.current) return;

    // Allow switching after device removal even when mic.current is null
    const oldStream = mic.current;
    const oldTrack = oldStream?.getAudioTracks()[0];

    // Allow switching even if selectedDevice matches but track ended
    if (deviceId === selectedDevice && oldTrack?.readyState === "live") return;

    switching.current = true;
    setSwitchingMicrophone(true);
    const s = current.current;

    // (1) Stop transmission and release floor at switch start
    stop();

    const senders = new Map<RTCRtpSender, MediaStreamTrack | null>();

    // Collect current senders and their tracks
    for (const [id, peer] of peers.current) {
      const sender = peer.pc.getSenders().find((s) => s.track?.kind === "audio");
      if (sender) senders.set(sender, sender.track);
    }

    let newStream: MediaStream | null = null;

    try {
      newStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      // Guard: check if we left or joined a different session during getUserMedia
      if (current.current !== s || !newStream) {
        newStream?.getTracks().forEach((t) => t.stop());
        if (current.current === s) {
          switching.current = false;
          setSwitchingMicrophone(false);
        }
        return;
      }

      const newTrack = newStream.getAudioTracks()[0];
      if (!newTrack) throw new Error("No audio track in new stream");

      // Keep new track disabled
      newTrack.enabled = false;

      // (2) Replace track for all peers using allSettled
      const results = await Promise.allSettled(
        Array.from(senders.keys()).map((sender) => sender.replaceTrack(newTrack))
      );

      // Guard: check again after replaceTrack
      if (current.current !== s) {
        newStream.getTracks().forEach((t) => t.stop());
        return;
      }

      // Check if any replacement failed
      const failures = results.filter((r) => r.status === "rejected");

      if (failures.length > 0) {
        // Roll back successful replacements to original live track
        const rollbacks = Array.from(senders.entries()).map(([sender, originalTrack]) =>
          sender.replaceTrack(originalTrack).catch(() => {})
        );
        await Promise.allSettled(rollbacks);

        newStream.getTracks().forEach((t) => t.stop());

        if (current.current === s) {
          switching.current = false;
          setSwitchingMicrophone(false);
          setError("Could not switch microphone. Connection issue with one or more peers.");
        }
        return;
      }

      // Success: stop old stream only after all replacements succeed
      oldStream?.getTracks().forEach((t) => t.stop());

      mic.current = newStream;

      if (current.current === s) {
        setSelectedDevice(deviceId);
        addLog("Microphone switched.");
      }

    } catch (e) {
      newStream?.getTracks().forEach((t) => t.stop());

      if (current.current === s) {
        if (e instanceof Error && e.name === "NotFoundError") {
          setError("Selected microphone is unavailable. Choose another or check your device.");
        } else {
          setError(e instanceof Error ? e.message : "Could not switch microphone.");
        }
      }
    } finally {
      if (current.current === s) {
        switching.current = false;
        setSwitchingMicrophone(false);
      }
    }
  }, [selectedDevice, stop, addLog]);

  // Monitor device changes
  useEffect(() => {
    if (!session) return;

    const s = session;
    const handleDeviceChange = async () => {
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();

        // (5) Guard devicechange results against different session
        if (current.current !== s) return;

        const audioInputs = allDevices.filter((d) => d.kind === "audioinput");
        setDevices(audioInputs);

        // Check if selected device still exists
        if (selectedDevice && !audioInputs.some((d) => d.deviceId === selectedDevice)) {
          // Selected device disappeared
          stop();
          mic.current?.getTracks().forEach((t) => t.stop());
          mic.current = null;
          setError("Your microphone was disconnected. Reconnect it and select it to resume.");
        }
      } catch {
        // Ignore enumeration errors
      }
    };

    navigator.mediaDevices?.addEventListener("devicechange", handleDeviceChange);
    return () => {
      navigator.mediaDevices?.removeEventListener("devicechange", handleDeviceChange);
    };
  }, [session, selectedDevice, stop]);
  const start = useCallback(async () => {
    if (!current.current || held.current || claiming.current || switching.current) return;

    // Check for missing/ended mic BEFORE floor request
    const track = mic.current?.getAudioTracks()[0];
    if (!track || track.readyState !== "live") {
      setError("Microphone unavailable. Check your device or select a microphone.");
      return;
    }

    if (
      ![...peers.current.values()].some(
        (p) => p.pc.connectionState === "connected",
      )
    ) {
      setError("No connected radios yet. Invite your crew first.");
      return;
    }
    held.current = true;
    claiming.current = true;
    const s = current.current;
    setError("");
    try {
      const result = await api("floor", { claim: true }, s);
      if (!held.current || current.current !== s) {
        void api("floor", { claim: false }, s).catch(() => {});
        return;
      }
      if (!result.granted) {
        held.current = false;
        setError("Channel busy. Release and try again when they finish.");
        return;
      }

      // Check for missing/ended mic AFTER floor grant
      const trackAfter = mic.current?.getAudioTracks()[0];
      if (!trackAfter || trackAfter.readyState !== "live") {
        held.current = false;
        void api("floor", { claim: false }, s).catch(() => {});
        setError("Microphone unavailable. Check your device or select a microphone.");
        return;
      }

      mic.current?.getAudioTracks().forEach((t) => {
        t.enabled = true;
      });
      floor.current = s.id;
      setSpeaker(s.id);
      syncAudio();
      setTalking(true);
      stopTimer.current = setTimeout(() => {
        stop();
        addLog("Transmission limit reached (15s). Release and press again.");
      }, 15_000);
    } catch (e) {
      held.current = false;
      setError(e instanceof Error ? e.message : "Could not transmit.");
    } finally {
      claiming.current = false;
    }
  }, [api, stop, syncAudio, addLog]);

  // Unified retry helper for both manual and incoming restart requests
  const performRetry = useCallback(async (peerId: string, s: Session, peer: Peer) => {
    // Guard: verify session and peer still valid
    if (current.current !== s || peers.current.get(peerId) !== peer || peer.retrying || peer.retryAttempts >= 3) return;

    // Stop transmission before retry
    stop();

    // Prevent overlapping offers
    if (peer.pc.signalingState !== "stable") {
      setError("Connection negotiation in progress. Wait a moment and try again.");
      return;
    }

    // Keep all tracks disabled
    const track = mic.current?.getAudioTracks()[0];
    if (track) track.enabled = false;

    peer.retrying = true;
    peer.retryAttempts++;
    setRetryingPeers((prev) => new Set(prev).add(peerId));

    const timeoutId = setTimeout(() => {
      if (current.current === s && peers.current.get(peerId) === peer && peer.retryTimer === timeoutId) {
        peer.retrying = false;
        peer.retryTimer = null;
        setRetryingPeers((prev) => {
          const next = new Set(prev);
          next.delete(peerId);
          return next;
        });
        setError("Retry timed out. Try again or rejoin the channel.");
        if (peer.pc.signalingState === "have-local-offer")
          void peer.pc.setLocalDescription({ type: "rollback" }).catch(() => {});
      }
    }, 10_000);

    peer.retryTimer = timeoutId;

    try {
      // Only lower session ID creates ICE-restart offer
      if (s.id < peerId) {
        const offer = await peer.pc.createOffer({ iceRestart: true });

        // Guard after async operation
        if (current.current !== s || peers.current.get(peerId) !== peer || peer.retryTimer !== timeoutId) return;

        await peer.pc.setLocalDescription(offer);

        // Guard after async operation
        if (current.current !== s || peers.current.get(peerId) !== peer || peer.retryTimer !== timeoutId) return;

        await api("signal", { to: peerId, payload: { type: "offer", description: peer.pc.localDescription } }, s);

        // Guard after async operation
        if (current.current !== s || peers.current.get(peerId) !== peer || peer.retryTimer !== timeoutId) return;

        addLog("Retry initiated. Waiting for response…");
      } else {
        // Higher ID sends restart-request signal
        await api("signal", { to: peerId, payload: { type: "restart-request" } }, s);

        // Guard after async operation
        if (current.current !== s || peers.current.get(peerId) !== peer || peer.retryTimer !== timeoutId) return;

        addLog("Retry requested. Waiting for peer…");
      }
    } catch (e) {
      if (current.current === s && peers.current.get(peerId) === peer) {
        // Clear timeout and state on error
        if (peer.retryTimer === timeoutId) {
          clearTimeout(timeoutId);
          peer.retryTimer = null;
          peer.retrying = false;
          setRetryingPeers((prev) => {
            const next = new Set(prev);
            next.delete(peerId);
            return next;
          });
        }
        setError(e instanceof Error ? e.message : "Retry failed. Try again or rejoin.");
      }
    }
    // Do NOT clear timeout in finally - keep it pending through negotiation
  }, [api, stop, addLog]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false,
      timer: ReturnType<typeof setTimeout>,
      after = 0,
      failures = 0;
    let previous = new Map<string, string>();
    const send = (to: string, payload: unknown) =>
      api("signal", { to, payload }, session);
    const connect = (person: Person) => {
      const pc = new RTCPeerConnection({ iceServers: session.iceServers }),
        audio = new Audio();
      audio.autoplay = true;
      const p: Peer = { pc, audio, ice: [], retrying: false, retryAttempts: 0, retryTimer: null };
      peers.current.set(person.id, p);
      mic.current?.getTracks().forEach((t) => pc.addTrack(t, mic.current!));
      pc.onicecandidate = (e) => {
        if (e.candidate && !cancelled)
          void send(person.id, {
            type: "ice",
            candidate: e.candidate.toJSON(),
          }).catch(() => {});
      };
      pc.ontrack = (e) => {
        audio.srcObject = e.streams[0] || new MediaStream([e.track]);
        syncAudio();
        void audio.play().catch(() => {
          if (!cancelled) setError("Tap “Enable audio” to hear your crew.");
        });
      };
      pc.onconnectionstatechange = () => {
        if (cancelled) return;
        setLinks((v) => ({ ...v, [person.id]: pc.connectionState }));
        if (pc.connectionState === "connected") {
          // Clear retry timer and state on successful connection
          if (p.retryTimer) {
            clearTimeout(p.retryTimer);
            p.retryTimer = null;
          }
          p.retrying = false;
          setRetryingPeers((prev) => {
            const next = new Set(prev);
            next.delete(person.id);
            return next;
          });
          // Reset attempt budget after full negotiation completes
          p.retryAttempts = 0;
          addLog(`${person.name} connected. Radio check complete.`);
        }
        if (pc.connectionState === "failed") {
          setError(
            `Cannot connect to ${person.name}. Tap Retry or rejoin the channel.`,
          );
        }
      };
      return p;
    };
    const tick = async () => {
      try {
        const data = await api("poll", { after }, session);
        if (cancelled) return;
        failures = 0;
        const people: Person[] = data.members;
        setMembers(people);
        if (!held.current) {
          floor.current = data.speaker;
          setSpeaker(data.speaker);
          syncAudio();
        }
        for (const person of people) {
          if (person.id === session.id) continue;
          if (!previous.has(person.id)) addLog(`${person.name} tuned in.`);
          // Pause new-peer creation while switching or when no live audio track
          const liveTrack = mic.current?.getAudioTracks()[0];
          if (!peers.current.has(person.id) && !switching.current && liveTrack?.readyState === "live") {
            const p = connect(person);
            if (session.id < person.id) {
              await p.pc.setLocalDescription(await p.pc.createOffer());
              await send(person.id, {
                type: "offer",
                description: p.pc.localDescription,
              });
            }
          }
        }
        const ids = new Set(people.map((p) => p.id));
        for (const [id, p] of peers.current)
          if (!ids.has(id)) {
            if (p.retryTimer) clearTimeout(p.retryTimer);
            p.pc.close();
            p.audio.pause();
            p.audio.srcObject = null;
            peers.current.delete(id);
            addLog(`${previous.get(id) || "A radio"} signed off.`);
            setLinks((v) => {
              const n = { ...v };
              delete n[id];
              return n;
            });
          }
        previous = new Map(people.map((p) => [p.id, p.name]));
        for (const message of data.signals) {
          const p = peers.current.get(message.sender);
          if (!p) {
            // A microphone switch can temporarily defer this member's peer.
            // Leave its offer at the cursor rather than losing it permanently.
            if (ids.has(message.sender)) break;
            after = Math.max(after, message.id);
            continue;
          }
          const payload = JSON.parse(message.body);
          try {
            if (payload.type === "offer" || payload.type === "answer") {
              await p.pc.setRemoteDescription(payload.description);
              for (const candidate of p.ice.splice(0))
                await p.pc.addIceCandidate(candidate);
              if (payload.type === "offer") {
                await p.pc.setLocalDescription(await p.pc.createAnswer());
                await send(message.sender, {
                  type: "answer",
                  description: p.pc.localDescription,
                });
              }
              if (p.pc.signalingState === "stable") {
                // An ICE restart can stay connected throughout negotiation,
                // so both peers must also finish on the offer/answer path.
                if (p.retryTimer) {
                  clearTimeout(p.retryTimer);
                  p.retryTimer = null;
                }
                p.retrying = false;
                if (p.pc.connectionState === "connected") p.retryAttempts = 0;
                setRetryingPeers((prev) => {
                  const next = new Set(prev);
                  next.delete(message.sender);
                  return next;
                });
              }
            } else if (payload.type === "ice") {
              if (p.pc.remoteDescription)
                await p.pc.addIceCandidate(payload.candidate);
              else p.ice.push(payload.candidate);
            } else if (payload.type === "restart-request") {
              // Handle restart-request only from higher ID, count attempts, stop first
              if (session.id < message.sender && p.retryAttempts < 3) {
                if (!p.retrying) {
                  await performRetry(message.sender, session, p);
                }
              }
            }
          } catch (e) {
            // Clear retry state on thrown errors
            if (p.retryTimer) {
              clearTimeout(p.retryTimer);
              p.retryTimer = null;
            }
            p.retrying = false;
            setRetryingPeers((prev) => {
              const next = new Set(prev);
              next.delete(message.sender);
              return next;
            });
            addLog(
              `Signal interrupted with ${previous.get(message.sender) || "a radio"}. Rejoin if needed.`,
            );
          }
          after = Math.max(after, message.id);
        }
      } catch (e) {
        if (cancelled) return;
        failures++;
        stop();
        setError(e instanceof Error ? e.message : "Connection interrupted.");
        if (failures >= 5) {
          cleanup();
          addLog("Signal lost. Rejoin to reconnect.");
          return;
        }
      }
      if (!cancelled) timer = setTimeout(tick, failures ? 2000 : 650);
    };
    void tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [session, api, addLog, cleanup, stop, syncAudio, performRetry]);
  useEffect(() => {
    const release = () => stop(),
      hidden = () => {
        if (document.hidden) stop();
      };
    const down = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (
        e.code === "Space" &&
        !["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(tag) &&
        !e.repeat
      ) {
        e.preventDefault();
        void start();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        if (held.current) e.preventDefault();
        stop();
      }
    };
    const unload = () => {
      const s = current.current;
      if (s)
        navigator.sendBeacon(
          "/api/radio",
          new Blob(
            [JSON.stringify({ action: "leave", id: s.id, secret: s.secret })],
            { type: "application/json" },
          ),
        );
      mic.current?.getTracks().forEach((t) => t.stop());
    };
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("pagehide", unload);
    return () => {
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("pagehide", unload);
    };
  }, [stop, start]);

  const retryConnection = useCallback(async (peerId: string) => {
    const s = current.current;
    if (!s) return;

    const peer = peers.current.get(peerId);
    if (!peer) return;

    // Per-peer busy guard
    if (peer.retrying) return;

    // At most three attempts per failure episode
    if (peer.retryAttempts >= 3) {
      setError("Maximum retry attempts reached. Rejoin the channel to reconnect.");
      return;
    }

    await performRetry(peerId, s, peer);
  }, [performRetry]);

  const enableAudio = () => {
    for (const p of peers.current.values())
      void p.audio
        .play()
        .then(() => setError(""))
        .catch(() => setError("Audio is still blocked by the browser."));
  };
  return {
    session,
    members,
    speaker,
    talking,
    busy,
    muted,
    setMuted,
    volume,
    setVolume,
    error,
    setError,
    logs,
    links,
    join,
    leave,
    start,
    stop,
    enableAudio,
    devices,
    selectedDevice,
    switchMicrophone,
    switchingMicrophone,
    retryConnection,
    retryingPeers,
  };
}
