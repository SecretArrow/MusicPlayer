"use client";

import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  Volume1,
  VolumeX,
  Heart,
  ListMusic,
  Mic2,
  Maximize2,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePlayerStore, useCurrentTrack, formatTime, type RepeatMode } from "@/store/player-store";

const repeatIcon: Record<RepeatMode, typeof Repeat> = {
  off: Repeat,
  all: Repeat,
  one: Repeat1,
};

export function PlayerControls({
  variant = "pc",
  onShowLyrics,
  onShowQueue,
}: {
  variant?: "pc" | "mobile";
  onShowLyrics?: () => void;
  onShowQueue?: () => void;
}) {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const seek = usePlayerStore((s) => s.seek);
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const toggleMute = usePlayerStore((s) => s.toggleMute);
  const track = useCurrentTrack();
  const likedTrackIds = usePlayerStore((s) => s.likedTrackIds);
  const toggleLike = usePlayerStore((s) => s.toggleLike);

  const isLiked = track ? likedTrackIds.has(track.id) : false;
  const dur = duration || track?.duration || 0;

  if (variant === "mobile") {
    return (
      <div className="flex w-full flex-col gap-3">
        <Slider
          value={[currentTime]}
          max={dur || 1}
          step={1}
          onValueChange={(v) => seek(v[0])}
          className="[&_[role=slider]]:h-3.5 [&_[role=slider]]:w-3.5 [&_[role=slider]]:bg-white [&_[role=slider]]:shadow-md"
        />
        <div className="flex items-center justify-between text-[10px] tabular-nums text-zinc-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(dur)}</span>
        </div>
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleShuffle}
            className={cn("h-10 w-10 text-zinc-400", shuffle && "text-emerald-400")}
          >
            <Shuffle className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={prev}
            className="h-12 w-12 text-white hover:text-emerald-400"
          >
            <SkipBack className="h-7 w-7" fill="currentColor" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePlay}
            className="h-16 w-16 rounded-full bg-white text-zinc-900 hover:bg-emerald-400 hover:text-emerald-950"
          >
            {isPlaying ? (
              <Pause className="h-8 w-8" fill="currentColor" />
            ) : (
              <Play className="ml-0.5 h-8 w-8" fill="currentColor" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={next}
            className="h-12 w-12 text-white hover:text-emerald-400"
          >
            <SkipForward className="h-7 w-7" fill="currentColor" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={cycleRepeat}
            className={cn("h-10 w-10 text-zinc-400", repeat !== "off" && "text-emerald-400")}
          >
            {(() => {
              const Icon = repeatIcon[repeat];
              return <Icon className="h-5 w-5" />;
            })()}
          </Button>
        </div>
        <div className="flex items-center justify-center gap-4">
          {onShowLyrics && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onShowLyrics}
              className="gap-1.5 text-xs text-zinc-400"
            >
              <Mic2 className="h-4 w-4" /> Lyrics
            </Button>
          )}
          {onShowQueue && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onShowQueue}
              className="gap-1.5 text-xs text-zinc-400"
            >
              <ListMusic className="h-4 w-4" /> Queue
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => track && toggleLike(track.id)}
            className={cn("gap-1.5 text-xs", isLiked ? "text-emerald-400" : "text-zinc-400")}
          >
            <Heart className={cn("h-4 w-4", isLiked && "fill-current")} /> {isLiked ? "Liked" : "Like"}
          </Button>
        </div>
      </div>
    );
  }

  // PC variant
  const VolIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2">
      {/* Center controls */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleShuffle}
          className={cn("h-8 w-8 text-zinc-400", shuffle && "text-emerald-400")}
          title="Shuffle"
        >
          <Shuffle className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={prev}
          className="h-8 w-8 text-zinc-200 hover:text-white"
          title="Previous"
        >
          <SkipBack className="h-5 w-5" fill="currentColor" />
        </Button>
        <Button
          variant="default"
          size="icon"
          onClick={togglePlay}
          className="h-10 w-10 rounded-full bg-white text-zinc-900 hover:scale-105 hover:bg-emerald-400 hover:text-emerald-950"
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" fill="currentColor" />
          ) : (
            <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={next}
          className="h-8 w-8 text-zinc-200 hover:text-white"
          title="Next"
        >
          <SkipForward className="h-5 w-5" fill="currentColor" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={cycleRepeat}
          className={cn("h-8 w-8 text-zinc-400", repeat !== "off" && "text-emerald-400")}
          title={`Repeat: ${repeat}`}
        >
          {(() => {
            const Icon = repeatIcon[repeat];
            return <Icon className="h-4 w-4" />;
          })()}
        </Button>
      </div>

      {/* Progress bar */}
      <div className="flex w-full max-w-xl items-center gap-2 text-[11px] tabular-nums text-zinc-400">
        <span className="w-9 text-right">{formatTime(currentTime)}</span>
        <Slider
          value={[currentTime]}
          max={dur || 1}
          step={1}
          onValueChange={(v) => seek(v[0])}
          className="flex-1"
        />
        <span className="w-9">{formatTime(dur)}</span>
      </div>
    </div>
  );
}

/** The right side of the PC bottom bar (volume + actions) */
export function PlayerRightControls({
  onShowLyrics,
  onShowQueue,
}: {
  onShowLyrics?: () => void;
  onShowQueue?: () => void;
}) {
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const toggleMute = usePlayerStore((s) => s.toggleMute);
  const track = useCurrentTrack();
  const likedTrackIds = usePlayerStore((s) => s.likedTrackIds);
  const toggleLike = usePlayerStore((s) => s.toggleLike);
  const isLiked = track ? likedTrackIds.has(track.id) : false;
  const VolIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => track && toggleLike(track.id)}
        className={cn("h-8 w-8", isLiked ? "text-emerald-400" : "text-zinc-400 hover:text-white")}
        title={isLiked ? "Remove from Liked" : "Add to Liked"}
      >
        <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
      </Button>
      {onShowLyrics && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onShowLyrics}
          className="h-8 w-8 text-zinc-400 hover:text-white"
          title="Lyrics"
        >
          <Mic2 className="h-4 w-4" />
        </Button>
      )}
      {onShowQueue && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onShowQueue}
          className="h-8 w-8 text-zinc-400 hover:text-white"
          title="Queue"
        >
          <ListMusic className="h-4 w-4" />
        </Button>
      )}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMute}
          className="h-8 w-8 text-zinc-400 hover:text-white"
          title={muted ? "Unmute" : "Mute"}
        >
          <VolIcon className="h-4 w-4" />
        </Button>
        <Slider
          value={[muted ? 0 : volume * 100]}
          max={100}
          step={1}
          onValueChange={(v) => setVolume(v[0] / 100)}
          className="w-24"
        />
      </div>
    </div>
  );
}
