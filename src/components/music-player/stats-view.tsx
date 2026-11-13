"use client";

import { useMemo } from "react";
import { BarChart3, Heart, Music, Play, Timer, Users } from "lucide-react";
import { useAllTracks, usePlayerStore } from "@/store/player-store";

export function StatsView() {
  const playCounts = usePlayerStore((s) => s.playCounts);
  const likedTrackIds = usePlayerStore((s) => s.likedTrackIds);
  const recentPlayed = usePlayerStore((s) => s.recentPlayed);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const allTracks = useAllTracks();

  const trackMap = useMemo(
    () => new Map(allTracks.map((t) => [t.id, t])),
    [allTracks]
  );

  const { tracksPlayed, minutes, artistsExplored, topTracks, maxCount } =
    useMemo(() => {
      const entries = Object.entries(playCounts);
      const playedSum = entries.reduce((sum, [, c]) => sum + c, 0);
      const minutesSum = Math.round(
        entries.reduce(
          (sum, [id, c]) => sum + c * (trackMap.get(id)?.duration ?? 0),
          0
        ) / 60
      );
      const artistsSet = new Set(
        recentPlayed
          .map((id) => trackMap.get(id)?.artistId)
          .filter((id): id is string => Boolean(id))
      );
      const top = entries
        .slice()
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .flatMap(([id, count]) => {
          const t = trackMap.get(id);
          return t ? [{ track: t, count }] : [];
        });
      return {
        tracksPlayed: playedSum,
        minutes: minutesSum,
        artistsExplored: artistsSet.size,
        topTracks: top,
        maxCount: top.length > 0 ? top[0].count : 0,
      };
    }, [playCounts, recentPlayed, trackMap]);

  if (tracksPlayed === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-[color:var(--accent)]" />
          <h1 className="text-2xl font-bold text-white">Your Listening Stats</h1>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-12 text-center">
          <Music className="h-10 w-10 text-zinc-500" />
          <h2 className="text-lg font-semibold text-zinc-100">No listens yet</h2>
          <p className="max-w-sm text-sm text-zinc-400">
            Play something to see stats here.
          </p>
        </div>
      </div>
    );
  }

  const cards = [
    { label: "Tracks played", value: tracksPlayed, icon: Play },
    { label: "Liked songs", value: likedTrackIds.size, icon: Heart },
    { label: "Artists explored", value: artistsExplored, icon: Users },
    { label: "Minutes this session", value: minutes, icon: Timer },
  ];

  const topTrackIds = topTracks.map((x) => x.track.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-[color:var(--accent)]" />
        <h1 className="text-2xl font-bold text-white">Your Listening Stats</h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-lg border border-white/10 bg-white/[0.03] p-4"
          >
            <div className="flex items-center gap-2 text-zinc-400">
              <Icon className="h-4 w-4 text-[color:var(--accent)]" />
              <span className="text-xs font-medium uppercase tracking-wider">
                {label}
              </span>
            </div>
            <div className="mt-2 text-3xl font-bold tabular-nums text-white">
              {value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Top tracks */}
      <section>
        <h2 className="mb-3 text-xl font-bold text-white">Top tracks</h2>
        <div className="space-y-2">
          {topTracks.map(({ track, count }, i) => {
            const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
            return (
              <button
                key={track.id}
                onClick={() => playTrack(track.id, topTrackIds)}
                className="group w-full rounded-lg border border-white/10 bg-white/[0.03] p-3 text-left transition-colors hover:bg-white/[0.06]"
                aria-label={`Play ${track.title} by ${track.artist}`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center text-sm font-semibold tabular-nums text-zinc-500">
                    {i + 1}
                  </span>
                  <div
                    className="h-10 w-10 shrink-0 rounded"
                    style={{ background: track.cover }}
                    role="img"
                    aria-label={`Cover art for ${track.title}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-zinc-100 group-hover:text-white">
                      {track.title}
                    </div>
                    <div className="truncate text-xs text-zinc-400">
                      {track.artist}
                    </div>
                  </div>
                  <span className="text-xs tabular-nums text-zinc-400">
                    {count} {count === 1 ? "play" : "plays"}
                  </span>
                </div>
                <div className="mt-2.5 h-1 rounded bg-white/10 sm:ml-[88px]">
                  <div
                    className="h-1 rounded bg-[color:var(--accent)]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
