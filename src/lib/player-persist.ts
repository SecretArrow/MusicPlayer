// Persistence layer for the player store.
// We persist only user-mutable, "session-restorable" state — never transient
// playback flags that should reset on reload (isPlaying, currentTime, sleep
// timer, abRepeat, showSettings, etc. are intentionally excluded).
//
// `localTracks` is also excluded: their `src` is an object URL that becomes
// invalid after reload, so we keep them in-memory only.

import { persist } from "zustand/middleware";
import type { PersistStorage, StorageValue } from "zustand/middleware";

interface PersistShape {
  // Playback prefs
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: string;
  playbackRate: number;
  crossfade: boolean;
  normalize: boolean;
  audioQuality: string;
  visualizerStyle: string;

  // EQ
  eq: {
    enabled: boolean;
    preset: string;
    preamp: number;
    bands: number[];
  };

  // Appearance
  accent: string;
  accentKey: string;
  themeKey: string;
  settingsTab: string;

  // Library mutations
  playlists: unknown[];
  likedTrackIds: Array<string>;
  recentPlayed: string[];
  playCounts: Record<string, number>;
  searchHistory: string[];
  librarySort: string;
}

// Custom storage wraps native localStorage with SSR safety.
export const persistenceStorage: PersistStorage<PersistShape> = {
  getItem: async (name) => {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(name);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StorageValue<PersistShape>;
    } catch {
      return null;
    }
  },
  setItem: async (name, value) => {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(name, JSON.stringify(value));
  },
  removeItem: async (name) => {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(name);
  },
};

/**
 * Build the persist config bound to the player store's full state type.
 * We pass the State type explicitly so partialize's `s` argument is typed
 * (instead of `Record<string, unknown>`).
 */
export function buildPersistConfig<S extends object>() {
  return {
    name: "aurora-player-v1",
    version: 1,
    storage: persistenceStorage satisfies PersistStorage<PersistShape>,
    // Only persist the fields listed in PersistShape — everything else stays
    // in-memory with its default initializer.
    partialize: (s: S): PersistShape => {
      const state = s as unknown as Record<string, unknown>;
      return {
        volume: state.volume as number,
        muted: state.muted as boolean,
        shuffle: state.shuffle as boolean,
        repeat: state.repeat as string,
        playbackRate: state.playbackRate as number,
        crossfade: state.crossfade as boolean,
        normalize: state.normalize as boolean,
        audioQuality: state.audioQuality as string,
        visualizerStyle: state.visualizerStyle as string,
        eq: state.eq as PersistShape["eq"],
        accent: state.accent as string,
        accentKey: state.accentKey as string,
        themeKey: state.themeKey as string,
        settingsTab: state.settingsTab as string,
        playlists: state.playlists as unknown[],
        // Set → array (and back via merge) — JSON has no Set.
        likedTrackIds: Array.from((state.likedTrackIds as Set<string>) ?? []),
        recentPlayed: state.recentPlayed as string[],
        playCounts: state.playCounts as Record<string, number>,
        searchHistory: state.searchHistory as string[],
        librarySort: state.librarySort as string,
      };
    },
    // After hydration, restore Set from array.
    merge: (persisted, current) => {
      const p = (persisted ?? {}) as Partial<PersistShape>;
      return {
        ...current,
        ...p,
        likedTrackIds: new Set<string>(p.likedTrackIds ?? []),
      } as typeof current;
    },
  };
}

export { persist };


