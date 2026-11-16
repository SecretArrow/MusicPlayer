"use client";

import { useState } from "react";
import { ChevronDown, Heart, Disc3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlayerStore, useCurrentTrack, formatTime } from "@/store/player-store";
import { CoverArt } from "./cover-art";
import { Visualizer } from "./visualizer";
import { LyricsPanel } from "./lyrics-panel";
import { QueuePanel } from "./queue-panel";
import { AbRepeatControls } from "./playback-extras";
import { PlayerControls } from "./player-controls";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

type Tab = "lyrics" | "queue" | "visual";

/** Fullscreen Now Playing overlay for PC mode (open with F / maximize button). */
export function NowPlayingOverlay() {
  const show = usePlayerStore((s) => s.showFullNowPlaying);
  const setShow = usePlayerStore((s) => s.setShowFullNowPlaying);
  const track = useCurrentTrack();
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const seek = usePlayerStore((s) => s.seek);
  const likedTrackIds = usePlayerStore((s) => s.likedTrackIds);
  const toggleLike = usePlayerStore((s) => s.toggleLike);
  const accent = usePlayerStore((s) => s.accent);
  const [tab, setTab] = useState<Tab>("visual");

  if (!show || !track) return null;
  const isLiked = likedTrackIds.has(track.id);
  const dur = duration || track.duration;

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-zinc-950/95 backdrop-blur-xl">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-400">
          <Disc3 className="h-4 w-4 animate-spin [animation-duration:3s]" style={{ color: accent }} />
          Now Playing
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShow(false)}
          className="text-zinc-300 hover:text-white"
          aria-label="Close full screen"
        >
          <ChevronDown className="h-5 w-5" />
        </Button>
      </div>

      {/* Main split */}
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 pb-4 lg:flex-row lg:items-center lg:overflow-hidden">
        {/* Left: art + info + visualizer */}
        <div className="flex flex-1 flex-col items-center justify-center gap-5">
          <CoverArt
            cover={track.cover}
            accent={track.accent}
            title={track.title}
            size="2xl"
            rounded="rounded-xl"
            className="shadow-2xl"
          />
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white">{track.title}</h2>
            <p className="mt-1 text-sm text-zinc-400">
              {track.artist} · {track.album} · {track.year}
            </p>
          </div>
          <Visualizer height={90} className="w-full max-w-lg" />
          {/* Progress */}
          <div className="w-full max-w-lg">
            <Slider
              value={[currentTime]}
              max={dur || 1}
              step={1}
              onValueChange={(v) => seek(v[0])}
            />
            <div className="mt-1 flex justify-between text-[11px] tabular-nums text-zinc-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(dur)}</span>
            </div>
          </div>
          <PlayerControls variant="pc" />
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggleLike(track.id)}
              className={cn(
                "h-8 w-8",
                isLiked ? "text-[color:var(--accent)]" : "text-zinc-400 hover:text-white"
              )}
            >
              <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
            </Button>
            <AbRepeatControls />
          </div>
        </div>

        {/* Right: tabs panel */}
        <div className="flex w-full flex-col rounded-lg border border-white/10 bg-white/[0.03] p-4 lg:h-full lg:w-96">
          <div className="mb-3 flex gap-1 rounded-lg bg-zinc-900 p-1">
            {(["visual", "lyrics", "queue"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "flex-1 rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
                  tab === t
                    ? "bg-[color:var(--accent)] text-zinc-950"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                {t === "visual" ? "Art & Bars" : t}
              </button>
            ))}
          </div>
          <div className="min-h-64 flex-1 overflow-y-auto">
            {tab === "lyrics" && <LyricsPanel compact />}
            {tab === "queue" && <QueuePanel compact />}
            {tab === "visual" && (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <CoverArt
                  cover={track.cover}
                  accent={track.accent}
                  title={track.title}
                  size="xl"
                  rounded="rounded-lg"
                />
                <div className="text-sm text-zinc-400">
                  <span className="font-semibold text-white">{track.album}</span> · {track.genre} ·{" "}
                  {track.plays} plays
                </div>
                <Visualizer height={70} className="w-full" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
