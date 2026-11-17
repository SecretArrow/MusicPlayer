"use client";

// Library bridge: maps between IndexedDB-stored File blobs and the in-memory
// Track[]/Playlist[] that the Zustand store consumes.
//
// Tracks with id "loc-..." keep metadata in IDB; their `src` is a freshly
// minted object URL on each page load. Playlists created via folder import
// also live in IDB so they survive reloads.

import { useEffect, useState } from "react";
import {
  getAllFiles,
  getAllPlaylists,
  primeUrlCache,
  type StoredFile,
  type StoredPlaylist,
} from "@/lib/library-db";
import { usePlayerStore } from "@/store/player-store";
import type { Track, Playlist } from "@/data/music";

const IMPORT_COVERS = [
  { cover: "linear-gradient(135deg,#7C3AED 0%,#DB2777 100%)", accent: "#AC31B2" },
  { cover: "linear-gradient(135deg,#10B981 0%,#06B6D4 100%)", accent: "#0BB8AB" },
  { cover: "linear-gradient(135deg,#F59E0B 0%,#EF4444 100%)", accent: "#F27128" },
  { cover: "linear-gradient(135deg,#06B6D4 0%,#3B82F6 100%)", accent: "#219CE5" },
  { cover: "linear-gradient(135deg,#EAB308 0%,#F97316 100%)", accent: "#F2930F" },
  { cover: "linear-gradient(135deg,#EC4899 0%,#8B5CF6 100%)", accent: "#BC52C8" },
];

function coverFor(id: string, fallback?: { cover: string; accent: string }) {
  if (fallback) return fallback;
  const h = [...id].reduce((a, c) => a + c.charCodeAt(0), 0);
  return IMPORT_COVERS[h % IMPORT_COVERS.length];
}

function storedFileToTrack(rec: StoredFile): Track {
  const palette = coverFor(rec.id);
  return {
    id: rec.id,
    title: rec.meta.title,
    artist: rec.meta.artist,
    artistId: `lib-${rec.meta.albumArtist || rec.meta.artist}`,
    album: rec.meta.album,
    albumId: `lib-${rec.meta.album}`,
    genre: rec.meta.genre,
    year: rec.meta.year,
    duration: rec.meta.duration || 0,
    src: primeUrlCache(rec.id, rec.file),
    cover: rec.meta.cover ?? palette.cover,
    accent: palette.accent,
    plays: "—",
  };
}

function storedPlaylistToPlaylist(p: StoredPlaylist): Playlist {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    trackIds: p.trackIds,
    cover: p.cover,
    accent: p.accent,
    curator: p.folderOrigin ? "Folder import" : "You",
    editable: true,
  };
}

/**
 * Restore library + playlists from IndexedDB on app mount.
 * Returns true once the initial hydration attempt has settled (success or fail).
 */
export function useLibraryHydration(): boolean {
  const [done, setDone] = useState(false);
  const addLocalTracks = usePlayerStore((s) => s.addLocalTracks);
  const setPlaylists = usePlayerStore((s) => s.setPlaylists);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [files, playlists] = await Promise.all([
          getAllFiles(),
          getAllPlaylists(),
        ]);
        if (cancelled) return;
        if (files.length > 0) {
          const tracks = files.map(storedFileToTrack);
          addLocalTracks(tracks);
        }
        if (playlists.length > 0) {
          setPlaylists(playlists.map(storedPlaylistToPlaylist));
        }
      } catch (err) {
        console.warn("Library hydration failed:", err);
      } finally {
        if (!cancelled) setDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return done;
}
