"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { getAudioEngine } from "@/lib/audio-engine";
import { usePlayerStore } from "@/store/player-store";

/**
 * Hidden <audio> element synced to the Zustand store.
 * Also wires the Web Audio engine (EQ, analyser, gain) and handles:
 * playback rate, sleep timer, A-B repeat, fade transitions.
 */
export function AudioController() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const tracks = usePlayerStore((s) => s.tracks);
  const localTracks = usePlayerStore((s) => s.localTracks);
  const playbackRate = usePlayerStore((s) => s.playbackRate);
  const eq = usePlayerStore((s) => s.eq);
  const normalize = usePlayerStore((s) => s.normalize);
  const crossfade = usePlayerStore((s) => s.crossfade);
  const sleep = usePlayerStore((s) => s.sleep);
  const abRepeat = usePlayerStore((s) => s.abRepeat);
  const repeat = usePlayerStore((s) => s.repeat);

  const setTime = usePlayerStore((s) => s.setTime);
  const setDuration = usePlayerStore((s) => s.setDuration);
  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying);
  const next = usePlayerStore((s) => s.next);
  const cancelSleep = usePlayerStore((s) => s.cancelSleepTimer);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const seekNonce = usePlayerStore((s) => s.seekNonce);

  // Explicit seeks / replay-same-track: push store time into the audio element.
  // Timeupdate-driven store updates don't bump the nonce, so no feedback loop.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || seekNonce === 0) return;
    const target = usePlayerStore.getState().currentTime;
    if (isFinite(target) && Math.abs(audio.currentTime - target) > 0.01) {
      audio.currentTime = target;
    }
  }, [seekNonce]);

  const currentTrackId = queue[currentIndex];
  const currentTrack =
    tracks.find((t) => t.id === currentTrackId) ??
    localTracks.find((t) => t.id === currentTrackId);

  // Load src when track changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (audio.src !== currentTrack.src) {
      audio.src = currentTrack.src;
      audio.load();
    }
  }, [currentTrack]);

  // Play / pause (+ engine resume + fade)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    const engine = getAudioEngine();
    if (isPlaying) {
      engine.ensureContext(audio);
      // Context may have just been created — push current EQ/preamp state into it
      engine.applyEq(eq.enabled, eq.bands);
      engine.setPreamp(eq.preamp);
      audio.playbackRate = playbackRate;
      if (crossfade) engine.rampGain(1, 400);
      audio.play().catch(() => {
        setIsPlaying(false);
      });
    } else {
      if (crossfade) {
        engine.rampGain(0, 300);
        const t = setTimeout(() => audio.pause(), 320);
        return () => clearTimeout(t);
      }
      audio.pause();
    }
  }, [isPlaying, currentTrack, playbackRate, crossfade, eq]);

  // Restore gain after fade-out pause
  useEffect(() => {
    if (!isPlaying && crossfade) {
      const engine = getAudioEngine();
      const t = setTimeout(() => engine.setGain(volume || 1), 350);
      return () => clearTimeout(t);
    }
  }, [isPlaying, crossfade, volume]);

  // Playback rate
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = playbackRate;
  }, [playbackRate]);

  // Volume / mute / normalization (Web Audio gain, fallback to element volume)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const engine = getAudioEngine();
    const eff = (muted ? 0 : volume) * (normalize ? 0.85 : 1);
    if (engine.ctx) {
      engine.setGain(eff);
      audio.volume = 1;
    } else {
      audio.volume = eff;
    }
  }, [volume, muted, normalize]);

  // EQ apply
  useEffect(() => {
    getAudioEngine().applyEq(eq.enabled, eq.bands);
  }, [eq]);

  // Preamp apply
  useEffect(() => {
    getAudioEngine().setPreamp(eq.preamp);
  }, [eq.preamp]);

  // Time update → sleep timer + AB repeat handled here
  const sleepFired = useRef(false);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      const t = audio.currentTime;
      // AB repeat loop
      const { a, b } = usePlayerStore.getState().abRepeat;
      if (a !== null && b !== null && t >= b) {
        audio.currentTime = a;
      }
      // Sleep timer
      const st = usePlayerStore.getState().sleep;
      if (st.mode === "time" && st.endsAt && Date.now() >= st.endsAt) {
        if (!sleepFired.current) {
          sleepFired.current = true;
          audio.pause();
          usePlayerStore.getState().setIsPlaying(false);
          cancelSleep();
          toast("Sleep timer ended — playback paused", {
            description: "Sweet dreams.",
          });
          setTimeout(() => (sleepFired.current = false), 1000);
        }
      }
    };
    audio.addEventListener("timeupdate", onTime);
    return () => audio.removeEventListener("timeupdate", onTime);
  }, [cancelSleep]);

  return (
    <audio
      ref={audioRef}
      onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
      onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      onEnded={() => {
        const st = usePlayerStore.getState().sleep;
        if (st.mode === "end-of-track") {
          setIsPlaying(false);
          cancelSleep();
          toast("Sleep timer — stopped at end of track");
        } else {
          next();
        }
      }}
      preload="metadata"
      className="hidden"
    />
  );
}
