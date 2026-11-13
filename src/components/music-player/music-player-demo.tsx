"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Smartphone } from "lucide-react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { PcPlayer } from "./pc-player";
import { AndroidPlayer } from "./android-player";
import { AudioController } from "./audio-controller";
import { SettingsDialog } from "./settings-dialog";
import { ShortcutsDialog, useKeyboardShortcuts } from "./keyboard-shortcuts";
import { ShareDialog } from "./share-dialog";
import { usePlayerStore } from "@/store/player-store";

const emptySubscribe = () => () => {};

/**
 * Pure music player UI — no landing page, no survey.
 * PC mode fills the viewport like a desktop app (mode switch lives in its toolbar);
 * Android mode renders inside a phone frame with a floating switcher.
 */
export function MusicPlayerApp() {
  const mode = usePlayerStore((s) => s.uiMode);
  const setUiMode = usePlayerStore((s) => s.setUiMode);
  const accent = usePlayerStore((s) => s.accent);

  // True only after hydration (client), false during SSR — avoids hydration mismatch
  // for Zustand state + browser-only <audio> without setState-in-effect.
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  // Global keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <div
      className="relative h-dvh w-full overflow-hidden bg-zinc-950"
      style={{ "--accent": accent } as CSSProperties}
    >
      <AudioController />

      {/* Global dialogs */}
      <SettingsDialog />
      <ShortcutsDialog />
      <ShareDialog />

      {/* Floating mode switcher — Android mode only (PC has toolbar buttons) */}
      {mode === "android" && (
        <div className="absolute right-3 top-3 z-50 flex items-center gap-0.5 rounded-full border border-white/10 bg-zinc-900/80 p-1 shadow-xl backdrop-blur">
          <button
            onClick={() => setUiMode("pc")}
            aria-label="Switch to PC mode"
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors",
              "text-zinc-400 hover:text-white"
            )}
          >
            <Monitor className="h-4 w-4" />
          </button>
          <button
            aria-label="Android mode active"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--accent)] text-zinc-950"
          >
            <Smartphone className="h-4 w-4" />
          </button>
        </div>
      )}

      {!mounted ? (
        <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500">
          Loading player…
        </div>
      ) : mode === "pc" ? (
        /* PC mode — full viewport desktop app */
        <div className="h-full w-full">
          <PcPlayer />
        </div>
      ) : (
        /* Android mode — phone frame centered on dark backdrop */
        <div className="flex h-full w-full items-center justify-center bg-zinc-950 py-4">
          <div className="relative h-full max-h-[860px] w-[360px] max-w-full rounded-[2.5rem] border-[10px] border-zinc-800 bg-zinc-950 shadow-2xl">
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
  );
}
