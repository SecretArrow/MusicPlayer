"use client";

import { useMemo } from "react";
import { LayoutGrid, Music } from "lucide-react";
import { useAllTracks, usePlayerStore } from "@/store/player-store";
import { demoGenres } from "@/data/music";
import { CardRow, TrackTable } from "./track-list";

export function GenreBrowse() {
  const activeGenre = usePlayerStore((s) => s.activeGenre);
  const setActiveGenre = usePlayerStore((s) => s.setActiveGenre);
  const setActiveArtist = usePlayerStore((s) => s.setActiveArtist);
  const artists = usePlayerStore((s) => s.artists);
  const allTracks = useAllTracks();

  const tracksByGenre = useMemo(() => {
    const map = new Map<string, typeof allTracks>();
    for (const t of allTracks) {
      const list = map.get(t.genre);
      if (list) list.push(t);
      else map.set(t.genre, [t]);
    }
    return map;
  }, [allTracks]);

  // ----- Grid of all genres -----
  if (!activeGenre) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-[color:var(--accent)]" />
          <h1 className="text-2xl font-bold text-white">Browse genres</h1>
        </div>
        <p className="text-sm text-zinc-400">
          Pick a genre to explore its tracks and artists.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {demoGenres.map((g) => {
            const count = (tracksByGenre.get(g.name) ?? []).length;
            return (
              <button
                key={g.name}
                onClick={() => setActiveGenre(g.name)}
                className="group relative overflow-hidden rounded-lg p-5 text-left transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
                style={{ background: g.cover }}
                aria-label={`Browse ${g.name}, ${count} tracks`}
              >
                <div
                  className="absolute inset-0 bg-black/20 transition-colors group-hover:bg-black/5"
                  aria-hidden="true"
                />
                <div className="relative">
                  <div className="text-lg font-bold text-white">{g.name}</div>
                  <div className="mt-1 text-sm text-white/80">{count} tracks</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ----- Single genre detail -----
  const genreMeta = demoGenres.find((g) => g.name === activeGenre);
  const genreTracks = tracksByGenre.get(activeGenre) ?? [];
  const genreArtists = artists.filter((a) => a.genre === activeGenre);

  return (
    <div className="space-y-6">
      {/* Cover header strip */}
      <section className="relative overflow-hidden rounded-lg border border-white/10">
        <div
          className="absolute inset-0 opacity-50"
          style={{
            background:
              genreMeta?.cover ?? "linear-gradient(135deg,#52525B 0%,#18181B 100%)",
          }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-zinc-950/30"
          aria-hidden="true"
        />
        <div className="relative p-6">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-300">
            Genre
          </p>
          <h2 className="mt-1 text-4xl font-bold tracking-tight text-white">
            {activeGenre}
          </h2>
          <p className="mt-2 text-sm text-zinc-300">
            Explore {activeGenre} · {genreTracks.length}{" "}
            {genreTracks.length === 1 ? "track" : "tracks"}
          </p>
        </div>
      </section>

      {/* Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveGenre(null)}
          className="rounded-full border border-white/15 bg-white/[0.05] px-3.5 py-1.5 text-sm text-zinc-200 transition-colors hover:bg-white/10 hover:text-white"
        >
          All genres
        </button>
        <span className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-sm text-zinc-400">
          {genreTracks.length} tracks
        </span>
      </div>

      {/* Tracks */}
      {genreTracks.length > 0 ? (
        <section>
          <h3 className="mb-3 text-xl font-bold text-white">Tracks</h3>
          <TrackTable trackIds={genreTracks.map((t) => t.id)} />
        </section>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-10 text-center">
          <Music className="h-8 w-8 text-zinc-500" />
          <p className="text-sm text-zinc-400">No tracks in this genre yet.</p>
        </div>
      )}

      {/* Artists */}
      {genreArtists.length > 0 && (
        <section>
          <h3 className="mb-3 text-xl font-bold text-white">
            Artists in {activeGenre}
          </h3>
          <CardRow
            items={genreArtists.map((a) => ({
              id: a.id,
              title: a.name,
              subtitle: "Artist",
              cover: a.cover,
            }))}
            onSelect={(id) => setActiveArtist(id)}
          />
        </section>
      )}
    </div>
  );
}
