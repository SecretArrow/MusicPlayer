"use client";

import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { findTrack, usePlayerStore } from "@/store/player-store";

/**
 * Global keyboard shortcuts hook.
 * Registers a single capture-phase keydown listener; all state access goes
 * through usePlayerStore.getState() to avoid stale closures.
 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const state = usePlayerStore.getState();

      // Space — play / pause
      if (event.code === "Space" || event.key === " ") {
        event.preventDefault();
        state.togglePlay();
        return;
      }

      switch (event.code) {
        case "ArrowRight":
          event.preventDefault();
          state.seek(state.currentTime + 5);
          break;
        case "ArrowLeft":
          event.preventDefault();
          state.seek(Math.max(0, state.currentTime - 5));
          break;
        case "ArrowUp":
          event.preventDefault();
          state.setVolume(Math.min(1, state.volume + 0.05));
          break;
        case "ArrowDown":
          event.preventDefault();
          state.setVolume(Math.max(0, state.volume - 0.05));
          break;
        case "KeyN":
          state.next();
          break;
        case "KeyP":
          state.prev();
          break;
        case "KeyS":
          state.toggleShuffle();
          break;
        case "KeyR":
          state.cycleRepeat();
          break;
        case "KeyM":
          state.toggleMute();
          break;
        case "KeyL": {
          const currentId = state.queue[state.currentIndex];
          if (currentId && findTrack(currentId)) state.toggleLike(currentId);
          break;
        }
        case "KeyQ":
          state.setActiveView("queue");
          break;
        case "KeyY":
          state.setActiveView("lyrics");
          break;
        case "KeyF":
          state.setShowFullNowPlaying(true);
          break;
        case "Escape":
          state.setShowFullNowPlaying(false);
          state.setShowSettings(false);
          state.setShareTrack(null);
          state.setShowShortcuts(false);
          break;
        default:
          if (event.key === "?") {
            state.setShowShortcuts(!state.showShortcuts);
          }
          break;
      }
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, []);
}

const SHORTCUTS: { keys: string[]; description: string }[] = [
  { keys: ["Space"], description: "Play or pause" },
  { keys: ["→"], description: "Seek forward 5 seconds" },
  { keys: ["←"], description: "Seek backward 5 seconds" },
  { keys: ["↑"], description: "Volume up" },
  { keys: ["↓"], description: "Volume down" },
  { keys: ["N"], description: "Next track" },
  { keys: ["P"], description: "Previous track" },
  { keys: ["S"], description: "Toggle shuffle" },
  { keys: ["R"], description: "Cycle repeat mode" },
  { keys: ["M"], description: "Mute / unmute" },
  { keys: ["L"], description: "Like current track" },
  { keys: ["Q"], description: "Open queue view" },
  { keys: ["Y"], description: "Open lyrics view" },
  { keys: ["F"], description: "Open full now playing" },
  { keys: ["Esc"], description: "Close dialogs and overlays" },
  { keys: ["?"], description: "Toggle this shortcuts dialog" },
];

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-mono text-zinc-300">
      {children}
    </kbd>
  );
}

export function ShortcutsDialog() {
  const showShortcuts = usePlayerStore((s) => s.showShortcuts);
  const setShowShortcuts = usePlayerStore((s) => s.setShowShortcuts);

  return (
    <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
      <DialogContent className="max-w-lg border-white/10 bg-zinc-900 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Keyboard shortcuts</DialogTitle>
          <DialogDescription className="text-zinc-500">
            Speed up your listening with these keys.
          </DialogDescription>
        </DialogHeader>
        <div className="grid max-h-96 grid-cols-1 gap-x-6 overflow-y-auto sm:grid-cols-2">
          {SHORTCUTS.map(({ keys, description }) => (
            <div
              key={description}
              className="flex items-center justify-between gap-3 py-2"
            >
              <span className="min-w-0 truncate text-sm text-zinc-400">
                {description}
              </span>
              <span className="flex shrink-0 items-center gap-1">
                {keys.map((key) => (
                  <Kbd key={key}>{key}</Kbd>
                ))}
              </span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
