"use client";

import { History } from "lucide-react";
import { usePlayerStore } from "@/store/player-store";
import { TrackTable } from "./track-list";

export function RecentView() {
  const recentPlayed = usePlayerStore((s) => s.recentPlayed);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <History className="h-5 w-5 text-[color:var(--accent)]" />
        <h1 className="text-2xl font-bold text-white">Recently played</h1>
      </div>

      {recentPlayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-12 text-center">
          <History className="h-10 w-10 text-zinc-500" />
          <h2 className="text-lg font-semibold text-zinc-100">Nothing played yet</h2>
          <p className="max-w-sm text-sm text-zinc-400">
            Press play on any track and it will show up here. Your listening history
            is kept for this session only.
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-zinc-400">
            {recentPlayed.length} {recentPlayed.length === 1 ? "track" : "tracks"} ·
            newest first
          </p>
          <TrackTable trackIds={recentPlayed} />
        </>
      )}
    </div>
  );
}
