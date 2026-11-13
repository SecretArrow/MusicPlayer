// Web Media Session bridge — the web-standard counterpart of Android's
// MediaSession framework. Metadata, artwork and remote actions (play, pause,
// next/prev, seek, stop) are exposed to the OS so lock screen, Bluetooth
// headsets, wearables and Android Auto projection can control playback.

import type { Track } from "@/data/music";

const MEDIA_ACTIONS = [
  "play",
  "pause",
  "previoustrack",
  "nexttrack",
  "seekbackward",
  "seekforward",
  "seekto",
  "stop",
] as const;

export const MEDIA_SESSION_ACTIONS: MediaSessionAction[] = [...MEDIA_ACTIONS];

export function mediaSessionSupported(): boolean {
  return typeof navigator !== "undefined" && "mediaSession" in navigator;
}

const artworkCache = new Map<string, string>();

/**
 * Render a track's CSS-gradient cover into a PNG data URL so it can be used
 * as MediaMetadata artwork (lock screen / car display thumbnails).
 */
export function gradientArtwork(track: Track, size = 512): string | null {
  const cacheKey = `${track.id}|${track.cover}`;
  const cached = artworkCache.get(cacheKey);
  if (cached) return cached;
  if (typeof document === "undefined") return null;

  const colors = track.cover.match(/#[0-9A-Fa-f]{6}/g) ?? [];
  if (colors.length === 0) return null;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Reproduce linear-gradient(135deg, ...) on canvas
  const angle = (135 * Math.PI) / 180;
  const half = (Math.SQRT2 * size) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const grad = ctx.createLinearGradient(
    cx - Math.cos(angle) * half,
    cy - Math.sin(angle) * half,
    cx + Math.cos(angle) * half,
    cy + Math.sin(angle) * half
  );
  colors.forEach((c, i) =>
    grad.addColorStop(colors.length === 1 ? 0 : i / (colors.length - 1), c)
  );
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const url = canvas.toDataURL("image/png");
  artworkCache.set(cacheKey, url);
  return url;
}

/** Push current position/rate/duration to remote displays (car, lock screen). */
export function pushPositionState(audio: HTMLAudioElement | null): void {
  if (!audio || !mediaSessionSupported()) return;
  if (!isFinite(audio.duration) || audio.duration <= 0) return;
  try {
    navigator.mediaSession.setPositionState({
      duration: audio.duration,
      playbackRate: audio.playbackRate,
      position: Math.min(audio.currentTime, audio.duration),
    });
  } catch {
    // invalid state transition — ignore
  }
}
