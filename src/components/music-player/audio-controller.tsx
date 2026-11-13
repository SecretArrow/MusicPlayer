"use client";

import { useEffect, useRef } from "react";
import { usePlayerStore } from "@/store/player-store";

/**
 * A hidden <audio> element synced to the Zustand player store.
 * Mounted once at the top level of the player demo.
 */
export function AudioController() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const tracks = usePlayerStore((s) => s.tracks);
  const setTime = usePlayerStore((s) => s.setTime);
  const setDuration = usePlayerStore((s) => s.setDuration);
  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying);
  const next = usePlayerStore((s) => s.next);
  const currentTime = usePlayerStore((s) => s.currentTime);

  const currentTrackId = queue[currentIndex];
  const currentTrack = tracks.find((t) => t.id === currentTrackId);

  // Load src when track changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (audio.src !== currentTrack.src) {
      audio.src = currentTrack.src;
      audio.load();
    }
  }, [currentTrack]);

  // Play / pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (isPlaying) {
      audio.play().catch(() => {
        setIsPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, currentTrack]);

  // Volume / mute
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = muted ? 0 : volume;
  }, [volume, muted]);

  // Seek when store time changes externally (e.g. slider drag)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    // Only seek if there's a meaningful drift to avoid feedback loops
    if (Math.abs(audio.currentTime - currentTime) > 1) {
      audio.currentTime = currentTime;
    }
  }, [currentTime]);

  return (
    <audio
      ref={audioRef}
      onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
      onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      onEnded={() => next()}
      preload="metadata"
      className="hidden"
    />
  );
}
