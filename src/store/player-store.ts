"use client";

import { create } from "zustand";
import { demoTracks, demoPlaylists, type Track, type Playlist } from "@/data/music";

export type RepeatMode = "off" | "all" | "one";
export type View = "home" | "search" | "library" | "nowplaying" | "queue" | "lyrics";

interface PlayerState {
  // Library
  tracks: Track[];
  playlists: Playlist[];
  // Queue
  queue: string[]; // track ids
  currentIndex: number;
  // Playback
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  // UI
  activeView: View;
  activePlaylistId: string | null;
  likedTrackIds: Set<string>;
  // Actions
  playTrack: (trackId: string, queueIds?: string[]) => void;
  playPlaylist: (playlistId: string) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seek: (time: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setActiveView: (v: View) => void;
  setActivePlaylist: (id: string | null) => void;
  toggleLike: (trackId: string) => void;
  setTime: (t: number) => void;
  setDuration: (d: number) => void;
  setIsPlaying: (p: boolean) => void;
}

function buildShuffledQueue(ids: string[]): string[] {
  const arr = [...ids];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  tracks: demoTracks,
  playlists: demoPlaylists,
  queue: demoTracks.map((t) => t.id),
  currentIndex: 0,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.7,
  muted: false,
  shuffle: false,
  repeat: "off",
  activeView: "home",
  activePlaylistId: null,
  likedTrackIds: new Set(["t1", "t7"]),

  playTrack: (trackId, queueIds) => {
    const ids = queueIds ?? get().queue;
    const idx = ids.indexOf(trackId);
    const finalIdx = idx >= 0 ? idx : 0;
    set({
      queue: ids,
      currentIndex: finalIdx,
      isPlaying: true,
      currentTime: 0,
    });
  },

  playPlaylist: (playlistId) => {
    const pl = get().playlists.find((p) => p.id === playlistId);
    if (!pl) return;
    const queue = get().shuffle ? buildShuffledQueue(pl.trackIds) : pl.trackIds;
    set({
      queue,
      currentIndex: 0,
      isPlaying: true,
      currentTime: 0,
      activePlaylistId: playlistId,
    });
  },

  togglePlay: () => set({ isPlaying: !get().isPlaying }),

  next: () => {
    const { queue, currentIndex, repeat, shuffle } = get();
    if (queue.length === 0) return;
    if (repeat === "one") {
      set({ currentTime: 0, isPlaying: true });
      return;
    }
    let nextIdx = currentIndex + 1;
    if (nextIdx >= queue.length) {
      if (repeat === "all") nextIdx = 0;
      else {
        set({ isPlaying: false, currentTime: 0 });
        return;
      }
    }
    set({ currentIndex: nextIdx, currentTime: 0, isPlaying: true });
  },

  prev: () => {
    const { queue, currentIndex, currentTime } = get();
    if (queue.length === 0) return;
    // If more than 3s in, restart current track
    if (currentTime > 3) {
      set({ currentTime: 0 });
      return;
    }
    let prevIdx = currentIndex - 1;
    if (prevIdx < 0) prevIdx = queue.length - 1;
    set({ currentIndex: prevIdx, currentTime: 0, isPlaying: true });
  },

  seek: (time) => set({ currentTime: time }),
  setVolume: (v) => set({ volume: v, muted: v === 0 }),
  toggleMute: () => set({ muted: !get().muted }),
  toggleShuffle: () => set({ shuffle: !get().shuffle }),
  cycleRepeat: () => {
    const order: RepeatMode[] = ["off", "all", "one"];
    const i = order.indexOf(get().repeat);
    set({ repeat: order[(i + 1) % order.length] });
  },
  setActiveView: (v) => set({ activeView: v }),
  setActivePlaylist: (id) => set({ activePlaylistId: id }),
  toggleLike: (trackId) => {
    const liked = new Set(get().likedTrackIds);
    if (liked.has(trackId)) liked.delete(trackId);
    else liked.add(trackId);
    set({ likedTrackIds: liked });
  },
  setTime: (t) => set({ currentTime: t }),
  setDuration: (d) => set({ duration: d }),
  setIsPlaying: (p) => set({ isPlaying: p }),
}));

// Selector helpers
export const useCurrentTrack = (): Track | null => {
  return usePlayerStore((s) => {
    const id = s.queue[s.currentIndex];
    return s.tracks.find((t) => t.id === id) ?? null;
  });
};

export const formatTime = (sec: number): string => {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};
