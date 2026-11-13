"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePlayerStore, useCurrentTrack } from "@/store/player-store";
import { demoLyrics } from "@/data/music";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic2 } from "lucide-react";

export function LyricsPanel({ compact = false }: { compact?: boolean }) {
  const track = useCurrentTrack();
  const currentTime = usePlayerStore((s) => s.currentTime);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Compute the active lyric line directly from currentTime
  const activeIndex = useMemo(() => {
    let idx = 0;
    for (let i = 0; i < demoLyrics.length; i++) {
      if (currentTime >= demoLyrics[i].time) idx = i;
      else break;
    }
    return idx;
  }, [currentTime]);

  // Auto-scroll to the active line
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const active = el.querySelector<HTMLElement>(`[data-line="${activeIndex}"]`);
    if (active) {
      const offsetTop = active.offsetTop - el.clientHeight / 2 + active.clientHeight / 2;
      el.scrollTo({ top: offsetTop, behavior: "smooth" });
    }
  }, [activeIndex]);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center gap-2">
        <Mic2 className="h-5 w-5 text-emerald-400" />
        <h2 className="text-xl font-bold text-white">Lyrics</h2>
      </div>
      {track && (
        <p className="mb-4 text-xs text-zinc-500">
          {track.title} · {track.artist}
        </p>
      )}
      <div
        ref={scrollRef}
        className={cn(
          "flex-1 overflow-y-auto",
          compact ? "max-h-72" : ""
        )}
      >
        <div className="space-y-3 py-4 text-center">
          {demoLyrics.map((line, i) => (
            <p
              key={i}
              data-line={i}
              className={cn(
                "transition-all duration-300",
                i === activeIndex
                  ? "text-xl font-bold text-white"
                  : "text-base text-zinc-600",
                i < activeIndex && "opacity-50"
              )}
            >
              {line.text}
            </p>
          ))}
        </div>
      </div>
      <p className="mt-3 text-center text-[10px] text-zinc-600">
        Lyrics are synchronized to playback. Demo lines for the first track.
      </p>
    </div>
  );
}
