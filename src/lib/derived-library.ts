"use client";

// Derived library collections.
//
// Artists and Albums are derived from the local track list whenever it
// changes (e.g. after import). We push the result back into the Zustand
// store so the Home/Library/Search/Artist/Album views can render them.

import { useEffect } from "react";
import { usePlayerStore, useAllTracks } from "@/store/player-store";
import type { Artist, Album } from "@/data/music";

const ARTIST_COVERS = [
  "linear-gradient(135deg,#7C3AED 0%,#DB2777 100%)",
  "linear-gradient(135deg,#0EA5E9 0%,#10B981 100%)",
  "linear-gradient(135deg,#F59E0B 0%,#EF4444 100%)",
  "linear-gradient(135deg,#06B6D4 0%,#3B82F6 100%)",
  "linear-gradient(135deg,#EAB308 0%,#F97316 100%)",
  "linear-gradient(135deg,#1E40AF 0%,#5B21B6 100%)",
  "linear-gradient(135deg,#14B8A6 0%,#84CC16 100%)",
  "linear-gradient(135deg,#DC2626 0%,#7F1D1D 100%)",
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function useDerivedLibrary(): void {
  const allTracks = useAllTracks();
  const artists = usePlayerStore((s) => s.artists);
  const albums = usePlayerStore((s) => s.albums);
  const setLibrary = usePlayerStore((s) => s.setLibrary);
  const tracks = usePlayerStore((s) => s.tracks);

  useEffect(() => {
    // Group tracks by artist
    const byArtist = new Map<string, { name: string; genre: string; albumIds: Set<string>; cover: string }>();
    const byAlbum = new Map<string, { title: string; artistName: string; artistId: string; year: number; trackIds: string[]; cover: string }>();

    for (const t of allTracks) {
      const aName = t.artist || "Unknown artist";
      const aId = t.artistId || `lib-${aName}`;
      if (!byArtist.has(aId)) {
        byArtist.set(aId, {
          name: aName,
          genre: t.genre || "Unknown",
          albumIds: new Set(),
          cover: ARTIST_COVERS[hashStr(aId) % ARTIST_COVERS.length],
        });
      }
      const artist = byArtist.get(aId)!;
      if (t.albumId) artist.albumIds.add(t.albumId);

      const alId = t.albumId || `lib-${t.album || "Unknown"}`;
      if (!byAlbum.has(alId)) {
        byAlbum.set(alId, {
          title: t.album || "Unknown album",
          artistName: aName,
          artistId: aId,
          year: t.year || 0,
          trackIds: [],
          cover: t.cover,
        });
      }
      byAlbum.get(alId)!.trackIds.push(t.id);
    }

    const derivedArtists: Artist[] = Array.from(byArtist.entries()).map(([id, a]) => ({
      id,
      name: a.name,
      genre: a.genre,
      listeners: `${a.albumIds.size} album${a.albumIds.size === 1 ? "" : "s"}`,
      bio: "",
      accent: "#A855F7",
      cover: a.cover,
      albumIds: Array.from(a.albumIds),
    }));

    const derivedAlbums: Album[] = Array.from(byAlbum.entries()).map(([id, al]) => ({
      id,
      title: al.title,
      artistId: al.artistId,
      artistName: al.artistName,
      year: al.year,
      trackIds: al.trackIds,
      cover: al.cover,
      accent: "#A855F7",
    }));

    // Only update if the derived shapes actually changed (shallow comparison
    // by length + first/last id) — avoids an infinite loop on every render.
    const sigArt = derivedArtists.map((a) => a.id).join("|");
    const sigAlb = derivedAlbums.map((a) => a.id).join("|");
    const curSigArt = artists.map((a) => a.id).join("|");
    const curSigAlb = albums.map((a) => a.id).join("|");
    if (sigArt !== curSigArt || sigAlb !== curSigAlb) {
      setLibrary(tracks, derivedArtists, derivedAlbums);
    }
  }, [allTracks, artists, albums, tracks, setLibrary]);
}
