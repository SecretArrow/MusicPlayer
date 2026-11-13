"use client";

import { useEffect, useState } from "react";
import { Check, Gauge, Moon, Repeat, Timer, X } from "lucide-react";
import { toast } from "sonner";
import { formatTime, usePlayerStore } from "@/store/player-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];
const SLEEP_MINUTES = [15, 30, 45, 60, 90];

const TONE_IDLE =
  "border-white/10! bg-white/[0.04]! text-zinc-300! hover:bg-white/[0.08]!";
const TONE_ACTIVE =
  "border-[color:var(--accent)]/60! bg-[color:var(--accent)]/10! text-[color:var(--accent)]!";

export function PlaybackSpeedMenu({
  className,
  showLabel = true,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const playbackRate = usePlayerStore((s) => s.playbackRate);
  const setPlaybackRate = usePlayerStore((s) => s.setPlaybackRate);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-1.5", TONE_IDLE, className)}
          aria-label="Playback speed"
        >
          <Gauge className="size-3.5" aria-hidden />
          {showLabel && (
            <span className="tabular-nums">{playbackRate}x</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-32 border-white/10!">
        {PLAYBACK_RATES.map((r) => (
          <DropdownMenuItem
            key={r}
            onSelect={() => {
              setPlaybackRate(r);
              toast(`Speed ${r}x`);
            }}
            className="justify-between"
          >
            <span>{r}x</span>
            {playbackRate === r && (
              <Check
                className="size-3.5 text-[color:var(--accent)]"
                aria-hidden
              />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SleepTimerMenu({
  className,
  showLabel = true,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const sleep = usePlayerStore((s) => s.sleep);
  const startSleepTimer = usePlayerStore((s) => s.startSleepTimer);
  const setSleepEndOfTrack = usePlayerStore((s) => s.setSleepEndOfTrack);
  const cancelSleepTimer = usePlayerStore((s) => s.cancelSleepTimer);
  const [, setTick] = useState(0);

  // 1s re-render tick while a timed sleep is running; the remaining time
  // itself is computed from Date.now() at render for an accurate first frame.
  useEffect(() => {
    if (sleep.mode !== "time" || sleep.endsAt === null) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [sleep.mode, sleep.endsAt]);

  const remainingSec =
    sleep.mode === "time" && sleep.endsAt !== null
      ? Math.max(0, Math.ceil((sleep.endsAt - Date.now()) / 1000))
      : null;

  const triggerLabel =
    sleep.mode === "time" && remainingSec !== null
      ? formatTime(remainingSec)
      : sleep.mode === "end-of-track"
        ? "End of track"
        : "Sleep";

  const headerLabel =
    sleep.mode === "time" && remainingSec !== null
      ? `Stops in ${formatTime(remainingSec)}`
      : sleep.mode === "end-of-track"
        ? "Stops after current track"
        : "No timer set";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-1.5",
            sleep.mode !== "off" ? TONE_ACTIVE : TONE_IDLE,
            className
          )}
          aria-label="Sleep timer"
        >
          <Timer className="size-3.5" aria-hidden />
          {showLabel && (
            <span className="tabular-nums">{triggerLabel}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-44 border-white/10!">
        <DropdownMenuLabel className="text-xs! font-medium text-zinc-400!">
          {headerLabel}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SLEEP_MINUTES.map((m) => (
          <DropdownMenuItem
            key={m}
            onSelect={() => {
              startSleepTimer(m);
              toast(`Sleep timer set for ${m} minutes`);
            }}
            className="justify-between"
          >
            <span>{m} minutes</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem
          onSelect={() => {
            setSleepEndOfTrack();
            toast("Will stop after the current track");
          }}
          className="justify-between"
        >
          <span className="flex items-center gap-2">
            <Moon className="size-3.5 text-zinc-400" aria-hidden />
            End of current track
          </span>
          {sleep.mode === "end-of-track" && (
            <Check
              className="size-3.5 text-[color:var(--accent)]"
              aria-hidden
            />
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={sleep.mode === "off"}
          onSelect={() => {
            cancelSleepTimer();
            toast("Sleep timer cancelled");
          }}
        >
          <X className="size-3.5" aria-hidden />
          Cancel timer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AbRepeatControls({ className }: { className?: string }) {
  const abRepeat = usePlayerStore((s) => s.abRepeat);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const setAbA = usePlayerStore((s) => s.setAbA);
  const setAbB = usePlayerStore((s) => s.setAbB);
  const clearAbRepeat = usePlayerStore((s) => s.clearAbRepeat);

  const abActive = (set: boolean) => (set ? TONE_ACTIVE : TONE_IDLE);

  return (
    <div
      className={cn("flex items-center gap-1.5", className)}
      role="group"
      aria-label="A-B repeat"
    >
      <Repeat
        className={cn(
          "size-3.5",
          abRepeat.a !== null && abRepeat.b !== null
            ? "text-[color:var(--accent)]"
            : "text-zinc-500"
        )}
        aria-hidden
      />
      <Button
        variant="outline"
        className={cn(
          "h-7! gap-1 px-2! text-xs!",
          abActive(abRepeat.a !== null)
        )}
        onClick={setAbA}
        title={
          abRepeat.a !== null
            ? `Point A at ${formatTime(abRepeat.a)}`
            : `Set point A at ${formatTime(currentTime)}`
        }
      >
        {abRepeat.a !== null ? `A ${formatTime(abRepeat.a)}` : "Set A"}
      </Button>
      <Button
        variant="outline"
        className={cn(
          "h-7! gap-1 px-2! text-xs!",
          abActive(abRepeat.b !== null)
        )}
        onClick={setAbB}
        disabled={abRepeat.a === null}
        title={
          abRepeat.b !== null
            ? `Point B at ${formatTime(abRepeat.b)}`
            : `Set point B at ${formatTime(currentTime)}`
        }
      >
        {abRepeat.b !== null ? `B ${formatTime(abRepeat.b)}` : "Set B"}
      </Button>
      <Button
        variant="ghost"
        className="h-7! gap-1 px-2! text-xs! text-zinc-400!"
        onClick={clearAbRepeat}
        disabled={abRepeat.a === null && abRepeat.b === null}
        title="Clear A-B repeat"
      >
        <X className="size-3" aria-hidden />
        Clear
      </Button>
    </div>
  );
}
