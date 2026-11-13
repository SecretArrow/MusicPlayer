"use client";

import { useEffect, useState } from "react";
import { Monitor, Smartphone, Headphones } from "lucide-react";
import { cn } from "@/lib/utils";
import { PcPlayer } from "./pc-player";
import { AndroidPlayer } from "./android-player";
import { AudioController } from "./audio-controller";

type Mode = "pc" | "android";

export function MusicPlayerDemo() {
  const [mode, setMode] = useState<Mode>("pc");
  const [mounted, setMounted] = useState(false);

  // Only render the interactive demo on the client to avoid SSR hydration mismatches
  // (the player uses Zustand state + browser-only <audio>).
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section id="player" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-400">
            <Headphones className="h-3 w-3" /> Interactive Demo
          </div>
          <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Music Player Design
          </h2>
          <p className="mt-2 max-w-2xl text-zinc-400">
            A single design system that adapts to both desktop and mobile. Press play on either
            layout — the same underlying player state drives both. Tracks stream from a
            royalty-free source so you can actually hear it work.
          </p>
        </div>

        {/* Mode switcher */}
        <div className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1">
          <button
            onClick={() => setMode("pc")}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              mode === "pc"
                ? "bg-emerald-500 text-emerald-950"
                : "text-zinc-300 hover:text-white"
            )}
          >
            <Monitor className="h-4 w-4" /> PC Mode
          </button>
          <button
            onClick={() => setMode("android")}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              mode === "android"
                ? "bg-emerald-500 text-emerald-950"
                : "text-zinc-300 hover:text-white"
            )}
          >
            <Smartphone className="h-4 w-4" /> Android Mode
          </button>
        </div>
      </div>

      {/* Player surface */}
      <AudioController />
      <div className="relative">
        {!mounted ? (
          <div className="flex h-[680px] w-full items-center justify-center rounded-2xl border border-white/10 bg-zinc-900 text-sm text-zinc-500">
            Loading player…
          </div>
        ) : mode === "pc" ? (
          <div className="h-[680px] w-full overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
            <PcPlayer />
          </div>
        ) : (
          <div className="flex justify-center py-4">
            {/* Phone frame */}
            <div className="relative h-[680px] w-[340px] rounded-[2.5rem] border-[10px] border-zinc-800 bg-zinc-950 p-0 shadow-2xl">
              {/* Notch */}
              <div className="absolute left-1/2 top-0 z-50 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-zinc-800" />
              {/* Screen */}
              <div className="relative h-full w-full overflow-hidden rounded-[2rem] bg-zinc-950">
                <AndroidPlayer />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Feature list */}
      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Real audio playback", icon: "♪" },
          { label: "PC layout (sidebar)", icon: "◧" },
          { label: "Mobile bottom nav", icon: "▤" },
          { label: "Synced lyrics", icon: "♫" },
          { label: "Queue & playlists", icon: "≡" },
          { label: "Shuffle / repeat / like", icon: "♥" },
        ].map((f) => (
          <div
            key={f.label}
            className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-center"
          >
            <div className="mb-1 text-lg text-emerald-400">{f.icon}</div>
            <div className="text-[11px] font-medium text-zinc-300">{f.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
