"use client";

import { ListMusic, Play, GripVertical } from "lucide-react";
import { usePlayerStore, useCurrentTrack, formatTime } from "@/store/player-store";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CoverArt } from "./cover-art";

export function QueuePanel({ compact = false }: { compact?: boolean }) {
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const tracks = usePlayerStore((s) => s.tracks);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const track = useCurrentTrack();

  const upcoming = queue.slice(currentIndex + 1);
  const upcomingTracks = upcoming
    .map((id) => tracks.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center gap-2">
        <ListMusic className="h-5 w-5 text-emerald-400" />
        <h2 className="text-xl font-bold text-white">Queue</h2>
      </div>
      <ScrollArea className={cn("flex-1", compact ? "max-h-72" : "")}>
        {/* Now playing */}
        <div className="mb-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Now Playing
          </div>
          {track ? (
            <div className="flex items-center gap-3 rounded-md bg-white/[0.05] p-2">
              <CoverArt cover={track.cover} accent={track.accent} title={track.title} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-emerald-400">{track.title}</div>
                <div className="truncate text-xs text-zinc-400">{track.artist}</div>
              </div>
              <span className="text-xs tabular-nums text-zinc-500">
                {formatTime(track.duration)}
              </span>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Nothing playing yet.</p>
          )}
        </div>
        {/* Upcoming */}
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Next Up · {upcomingTracks.length}
          </div>
          <div className="space-y-1">
            {upcomingTracks.length === 0 && (
              <p className="px-2 py-4 text-sm text-zinc-500">End of queue.</p>
            )}
            {upcomingTracks.map((t, i) => (
              <div
                key={`${t.id}-${i}`}
                onClick={() => playTrack(t.id, queue)}
                className="group flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-white/[0.05]"
              >
                <GripVertical className="h-4 w-4 shrink-0 text-zinc-600 opacity-0 group-hover:opacity-100" />
                <CoverArt cover={t.cover} accent={t.accent} title={t.title} size="xs" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-white">{t.title}</div>
                  <div className="truncate text-xs text-zinc-400">{t.artist}</div>
                </div>
                <span className="text-xs tabular-nums text-zinc-500">{formatTime(t.duration)}</span>
                <button
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-emerald-950 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    playTrack(t.id, queue);
                  }}
                >
                  <Play className="ml-0.5 h-3 w-3" fill="currentColor" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
