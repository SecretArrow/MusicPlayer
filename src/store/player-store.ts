"use client";

import { useMemo } from "react";
import { create } from "zustand";
import {
  demoTracks,
  demoPlaylists,
  demoArtists,
  demoAlbums,
  accentPresets,
  type Track,
  type Playlist,
  type Artist,
  type Album,
} from "@/data/music";
import { THEMES } from "@/data/themes";

export type RepeatMode = "off" | "all" | "one";
export type View =
  | "home" | "search" | "library" | "nowplaying" | "queue" | "lyrics"
  | "artist" | "album" | "genre" | "recent" | "stats";

export type SortKey = "custom" | "title" | "artist" | "duration" | "plays";

export type SettingsTab = "playback" | "appearance" | "about";

export interface EqSettings {
  enabled: boolean;
  preset: string;
  preamp: number; // dB -12..+12, applied after the EQ chain
  bands: number[]; // 10 bands, dB -12..+12
}

export interface SleepTimer {
  mode: "off" | "time" | "end-of-track";
  endsAt: number | null; // epoch ms
}

interface PlayerState {
  // Library
  tracks: Track[];
  playlists: Playlist[];
  artists: Artist[];
  albums: Album[];
  localTracks: Track[];

  // Queue
  queue: string[];
  currentIndex: number;

  // Playback
  isPlaying: boolean;
  currentTime: number;
  /** Bumped on explicit seeks so the audio element can be re-synced (avoids feedback loop) */
  seekNonce: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  playbackRate: number;

  // Audio extras
  eq: EqSettings;
  crossfade: boolean; // smooth fade transitions
  normalize: boolean; // volume normalization (simulated)
  audioQuality: "low" | "high" | "lossless";
  visualizerStyle: "bars" | "wave" | "off";
  sleep: SleepTimer;
  abRepeat: { a: number | null; b: number | null };

  // Appearance
  accent: string; // hex color
  accentKey: string;
  themeKey: string; // built-in theme id (see src/data/themes.ts)
  settingsTab: SettingsTab;

  // History & stats
  recentPlayed: string[];
  playCounts: Record<string, number>;
  sessionStart: number;

  // UI state
  activeView: View;
  uiMode: "pc" | "android";
  activePlaylistId: string | null;
  activeArtistId: string | null;
  activeAlbumId: string | null;
  activeGenre: string | null;
  likedTrackIds: Set<string>;
  showSettings: boolean;
  showShortcuts: boolean;
  showFullNowPlaying: boolean;
  shareTrackId: string | null;
  connectedDevice: string | null;
  librarySort: SortKey;
  searchHistory: string[];

  // Actions — playback
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
  setPlaybackRate: (r: number) => void;

  // Actions — audio extras
  setEqBand: (index: number, value: number) => void;
  applyEqPreset: (preset: string, bands: number[]) => void;
  setPreamp: (db: number) => void;
  toggleEq: () => void;
  setCrossfade: (v: boolean) => void;
  setNormalize: (v: boolean) => void;
  setAudioQuality: (q: PlayerState["audioQuality"]) => void;
  setVisualizerStyle: (v: PlayerState["visualizerStyle"]) => void;
  startSleepTimer: (minutes: number) => void;
  setSleepEndOfTrack: () => void;
  cancelSleepTimer: () => void;
  setAbA: () => void;
  setAbB: () => void;
  clearAbRepeat: () => void;

  // Actions — appearance
  setAccent: (key: string, color: string) => void;
  setTheme: (key: string) => void;
  setSettingsTab: (tab: SettingsTab) => void;
  openSettings: (tab?: SettingsTab) => void;

  // Actions — library management
  addToPlaylist: (playlistId: string, trackId: string) => void;
  removeFromPlaylist: (playlistId: string, trackId: string) => void;
  createPlaylist: (title: string, description?: string) => string;
  deletePlaylist: (playlistId: string) => void;
  addLocalTracks: (tracks: Track[]) => void;
  playNext: (trackId: string) => void;
  addToQueue: (trackId: string) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (from: number, to: number) => void;
  clearQueueUpcoming: () => void;

  // Actions — history
  recordPlay: (trackId: string) => void;

  // Actions — UI
  setActiveView: (v: View) => void;
  setUiMode: (m: "pc" | "android") => void;
  setActivePlaylist: (id: string | null) => void;
  setActiveArtist: (id: string | null) => void;
  setActiveAlbum: (id: string | null) => void;
  setActiveGenre: (g: string | null) => void;
  toggleLike: (trackId: string) => void;
  setShowSettings: (v: boolean) => void;
  setShowShortcuts: (v: boolean) => void;
  setShowFullNowPlaying: (v: boolean) => void;
  setShareTrack: (id: string | null) => void;
  setConnectedDevice: (d: string | null) => void;
  setLibrarySort: (s: SortKey) => void;
  pushSearchHistory: (q: string) => void;
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

/**
 * 10-band EQ presets (bands: 32 Hz … 16 kHz, dB -12..+12).
 * 23 built-in presets covering genres, use-cases and hardware compensation.
 */
export const EQ_PRESETS: Record<string, number[]> = {
  flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  "bass boost": [8, 6, 4, 2, 0, 0, 0, 0, 0, 0],
  "bass reducer": [-8, -6, -4, -2, 0, 0, 0, 0, 0, 0],
  "treble boost": [0, 0, 0, 0, 0, 2, 4, 6, 8, 8],
  "treble reducer": [0, 0, 0, 0, 0, -2, -4, -6, -8, -8],
  vocal: [-3, -2, 0, 3, 5, 5, 3, 1, 0, -1],
  rock: [5, 4, 2, -1, -2, 0, 3, 5, 5, 4],
  pop: [-2, -1, 2, 4, 5, 3, 0, -1, -1, -2],
  jazz: [4, 3, 1, 2, -1, -1, 0, 1, 3, 4],
  classical: [4, 3, 2, 0, -1, -1, 0, 2, 3, 4],
  electronic: [6, 5, 1, 0, -2, 2, 1, 3, 5, 6],
  dance: [8, 6, 2, 0, -2, 1, 3, 5, 6, 7],
  "hip-hop": [8, 6, 3, 1, -1, -1, 1, 3, 4, 4],
  acoustic: [4, 3, 2, 1, 1, 2, 2, 3, 4, 3],
  "r&b": [6, 4, 2, 0, -2, 1, 3, 4, 5, 4],
  latin: [3, 3, 1, 0, 1, 2, 3, 3, 4, 4],
  reggae: [2, 1, 0, 2, 3, 3, 1, 0, 1, 2],
  metal: [5, 4, 3, 0, -1, 0, 3, 4, 5, 5],
  country: [3, 1, 0, 1, 2, 2, 2, 1, 1, 2],
  speech: [-6, -4, -1, 2, 4, 4, 3, 1, 0, -2],
  loudness: [7, 5, 0, -2, -3, -2, 0, 3, 6, 7],
  "small speakers": [6, 5, 3, 1, 0, 0, 1, 2, 2, 2],
  soft: [0, 1, 2, 3, 3, 2, 1, 0, -1, -2],
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  tracks: demoTracks,
  playlists: demoPlaylists,
  artists: demoArtists,
  albums: demoAlbums,
  localTracks: [],

  queue: demoTracks.map((t) => t.id),
  currentIndex: 0,

  isPlaying: false,
  currentTime: 0,
  seekNonce: 0,
  duration: 0,
  volume: 0.7,
  muted: false,
  shuffle: false,
  repeat: "off",
  playbackRate: 1,

  eq: { enabled: false, preset: "flat", preamp: 0, bands: [...EQ_PRESETS.flat] },
  crossfade: false,
  normalize: false,
  audioQuality: "high",
  visualizerStyle: "bars",
  sleep: { mode: "off", endsAt: null },
  abRepeat: { a: null, b: null },

  accent: accentPresets[0].color,
  accentKey: accentPresets[0].key,
  themeKey: THEMES[0].key,
  settingsTab: "playback",

  recentPlayed: [],
  playCounts: {},
  sessionStart: Date.now(),

  activeView: "home",
  uiMode: "pc",
  activePlaylistId: null,
  activeArtistId: null,
  activeAlbumId: null,
  activeGenre: null,
  likedTrackIds: new Set(["t1", "t7"]),
  showSettings: false,
  showShortcuts: false,
  showFullNowPlaying: false,
  shareTrackId: null,
  connectedDevice: null,
  librarySort: "custom",
  searchHistory: [],

  playTrack: (trackId, queueIds) => {
    const ids = queueIds ?? get().queue;
    const idx = ids.indexOf(trackId);
    const finalIdx = idx >= 0 ? idx : 0;
    set({
      queue: ids,
      currentIndex: finalIdx,
      isPlaying: true,
      currentTime: 0,
      seekNonce: get().seekNonce + 1,
      abRepeat: { a: null, b: null },
    });
    get().recordPlay(trackId);
  },

  playPlaylist: (playlistId) => {
    const pl = get().playlists.find((p) => p.id === playlistId);
    if (!pl || pl.trackIds.length === 0) return;
    const queue = get().shuffle ? buildShuffledQueue(pl.trackIds) : pl.trackIds;
    set({
      queue,
      currentIndex: 0,
      isPlaying: true,
      currentTime: 0,
      activePlaylistId: playlistId,
      abRepeat: { a: null, b: null },
    });
    get().recordPlay(queue[0]);
  },

  togglePlay: () => set({ isPlaying: !get().isPlaying }),

  next: () => {
    const { queue, currentIndex, repeat } = get();
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
    set({ currentIndex: nextIdx, currentTime: 0, abRepeat: { a: null, b: null } });
    get().recordPlay(queue[nextIdx]);
  },

  prev: () => {
    const { queue, currentIndex, currentTime } = get();
    if (queue.length === 0) return;
    if (currentTime > 3) {
      set({ currentTime: 0 });
      return;
    }
    let prevIdx = currentIndex - 1;
    if (prevIdx < 0) prevIdx = queue.length - 1;
    set({ currentIndex: prevIdx, currentTime: 0, abRepeat: { a: null, b: null } });
    get().recordPlay(queue[prevIdx]);
  },

  seek: (time) =>
    set({ currentTime: time, seekNonce: get().seekNonce + 1 }),
  setVolume: (v) => set({ volume: v, muted: v === 0 }),
  toggleMute: () => set({ muted: !get().muted }),
  toggleShuffle: () => {
    const { shuffle, queue, currentIndex } = get();
    if (!shuffle) {
      // Shuffle from current position
      const rest = queue.slice(currentIndex + 1);
      const shuffled = buildShuffledQueue(rest);
      set({
        shuffle: true,
        queue: [...queue.slice(0, currentIndex + 1), ...shuffled],
      });
    } else {
      set({ shuffle: false });
    }
  },
  cycleRepeat: () => {
    const order: RepeatMode[] = ["off", "all", "one"];
    const i = order.indexOf(get().repeat);
    set({ repeat: order[(i + 1) % order.length] });
  },
  setPlaybackRate: (r) => set({ playbackRate: r }),

  setEqBand: (index, value) => {
    const eq = get().eq;
    const bands = [...eq.bands];
    bands[index] = value;
    set({ eq: { ...eq, bands, preset: "custom" } });
  },
  applyEqPreset: (preset, bands) =>
    set({ eq: { ...get().eq, preset, bands: [...bands] } }),
  setPreamp: (db) => set({ eq: { ...get().eq, preamp: db } }),
  toggleEq: () => set({ eq: { ...get().eq, enabled: !get().eq.enabled } }),
  setCrossfade: (v) => set({ crossfade: v }),
  setNormalize: (v) => set({ normalize: v }),
  setAudioQuality: (q) => set({ audioQuality: q }),
  setVisualizerStyle: (v) => set({ visualizerStyle: v }),
  startSleepTimer: (minutes) =>
    set({ sleep: { mode: "time", endsAt: Date.now() + minutes * 60_000 } }),
  setSleepEndOfTrack: () => set({ sleep: { mode: "end-of-track", endsAt: null } }),
  cancelSleepTimer: () => set({ sleep: { mode: "off", endsAt: null } }),
  setAbA: () => set({ abRepeat: { ...get().abRepeat, a: get().currentTime } }),
  setAbB: () => set({ abRepeat: { ...get().abRepeat, b: get().currentTime } }),
  clearAbRepeat: () => set({ abRepeat: { a: null, b: null } }),

  setAccent: (key, color) => set({ accentKey: key, accent: color }),
  setTheme: (key) => {
    const theme = THEMES.find((t) => t.key === key) ?? THEMES[0];
    set({ themeKey: theme.key, accent: theme.accent, accentKey: theme.key });
  },
  setSettingsTab: (tab) => set({ settingsTab: tab }),
  openSettings: (tab) =>
    set({ showSettings: true, ...(tab ? { settingsTab: tab } : {}) }),

  addToPlaylist: (playlistId, trackId) => {
    set({
      playlists: get().playlists.map((p) =>
        p.id === playlistId && !p.trackIds.includes(trackId)
          ? { ...p, trackIds: [...p.trackIds, trackId] }
          : p
      ),
    });
  },
  removeFromPlaylist: (playlistId, trackId) => {
    set({
      playlists: get().playlists.map((p) =>
        p.id === playlistId
          ? { ...p, trackIds: p.trackIds.filter((t) => t !== trackId) }
          : p
      ),
    });
  },
  createPlaylist: (title, description) => {
    const id = `up-${Date.now()}`;
    const pl: Playlist = {
      id,
      title,
      description: description ?? "Your playlist",
      trackIds: [],
      cover: "linear-gradient(135deg,#52525B 0%,#18181B 100%)",
      accent: get().accent,
      curator: "You",
      editable: true,
    };
    set({ playlists: [pl, ...get().playlists] });
    return id;
  },
  deletePlaylist: (playlistId) => {
    set({
      playlists: get().playlists.filter((p) => p.id !== playlistId),
      activePlaylistId:
        get().activePlaylistId === playlistId ? null : get().activePlaylistId,
    });
  },
  addLocalTracks: (tracks) => set({ localTracks: [...get().localTracks, ...tracks] }),

  playNext: (trackId) => {
    const { queue, currentIndex } = get();
    const filtered = queue.filter((id, i) => !(id === trackId && i !== currentIndex));
    const nextQueue = [
      ...filtered.slice(0, currentIndex + 1),
      trackId,
      ...filtered.slice(currentIndex + 1),
    ];
    set({ queue: nextQueue });
  },
  addToQueue: (trackId) => set({ queue: [...get().queue, trackId] }),
  removeFromQueue: (index) => {
    const { queue, currentIndex } = get();
    if (index === currentIndex) return; // can't remove currently playing
    const newQueue = queue.filter((_, i) => i !== index);
    set({
      queue: newQueue,
      currentIndex: index < currentIndex ? currentIndex - 1 : currentIndex,
    });
  },
  reorderQueue: (from, to) => {
    const { queue, currentIndex } = get();
    if (from === currentIndex || to === currentIndex) return;
    const arr = [...queue];
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    // Recompute current index after reorder
    const currentId = queue[currentIndex];
    const newCurrentIndex = arr.indexOf(currentId);
    set({ queue: arr, currentIndex: newCurrentIndex >= 0 ? newCurrentIndex : currentIndex });
  },
  clearQueueUpcoming: () => {
    const { queue, currentIndex } = get();
    set({ queue: queue.slice(0, currentIndex + 1) });
  },

  recordPlay: (trackId) => {
    const recent = [trackId, ...get().recentPlayed.filter((id) => id !== trackId)].slice(0, 20);
    set({
      recentPlayed: recent,
      playCounts: { ...get().playCounts, [trackId]: (get().playCounts[trackId] ?? 0) + 1 },
    });
  },

  setActiveView: (v) => set({ activeView: v }),
  setUiMode: (m) => set({ uiMode: m }),
  setActivePlaylist: (id) => set({ activePlaylistId: id }),
  setActiveArtist: (id) => set({ activeArtistId: id, activeView: id ? "artist" : get().activeView }),
  setActiveAlbum: (id) => set({ activeAlbumId: id, activeView: id ? "album" : get().activeView }),
  setActiveGenre: (g) => set({ activeGenre: g, activeView: g ? "genre" : get().activeView }),
  toggleLike: (trackId) => {
    const liked = new Set(get().likedTrackIds);
    if (liked.has(trackId)) liked.delete(trackId);
    else liked.add(trackId);
    set({ likedTrackIds: liked });
  },
  setShowSettings: (v) => set({ showSettings: v }),
  setShowShortcuts: (v) => set({ showShortcuts: v }),
  setShowFullNowPlaying: (v) => set({ showFullNowPlaying: v }),
  setShareTrack: (id) => set({ shareTrackId: id }),
  setConnectedDevice: (d) => set({ connectedDevice: d }),
  setLibrarySort: (s) => set({ librarySort: s }),
  pushSearchHistory: (q) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    const hist = [trimmed, ...get().searchHistory.filter((h) => h !== trimmed)].slice(0, 8);
    set({ searchHistory: hist });
  },
  setTime: (t) => set({ currentTime: t }),
  setDuration: (d) => set({ duration: d }),
  setIsPlaying: (p) => set({ isPlaying: p }),
}));

// ---------- Selector helpers ----------

export const useCurrentTrack = (): Track | null => {
  return usePlayerStore((s) => {
    const id = s.queue[s.currentIndex];
    return s.tracks.find((t) => t.id === id) ?? s.localTracks.find((t) => t.id === id) ?? null;
  });
};

// NOTE: must NOT return a fresh array from the selector itself — Zustand v5 uses
// useSyncExternalStore and an unstable snapshot causes an infinite render loop.
// Subscribe to stable slices, combine with useMemo.
export const useAllTracks = (): Track[] => {
  const tracks = usePlayerStore((s) => s.tracks);
  const localTracks = usePlayerStore((s) => s.localTracks);
  return useMemo(() => [...tracks, ...localTracks], [tracks, localTracks]);
};

export const findTrack = (id: string): Track | null => {
  const s = usePlayerStore.getState();
  return s.tracks.find((t) => t.id === id) ?? s.localTracks.find((t) => t.id === id) ?? null;
};

export const formatTime = (sec: number): string => {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};
