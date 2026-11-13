"use client";

/**
 * VIOLET NIGHT — "NEON TERMINAL" layout.
 * A cyberpunk HUD console: scanlines + grid backdrop, mono status strip,
 * clipped-corner content frame, bracket-styled transport deck.
 * Behaviour-critical pieces (content views, toolbar, EQ body, maximize)
 * are reused from the shared module so all themes stay identical.
 */

import { useState, type ReactNode } from "react";
import {
  Home,
  Search,
  Library,
  History,
  AudioLines,
  ChartBar,
  Plus,
  ListMusic,
  Maximize2,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Terminal,
  Disc3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  usePlayerStore,
  useCurrentTrack,
  formatTime,
  type View,
} from "@/store/player-store";
import { CoverArt } from "../cover-art";
import { NowPlayingOverlay } from "../now-playing-overlay";
import { CreatePlaylistDialog } from "../playlist-dialogs";
import {
  MainContent,
  ToolbarActions,
  EqPanelBody,
  MaximizeButton,
} from "./shared";

const NAV_ITEMS: { id: View; label: string; icon: typeof Home }[] = [
  { id: "home", label: "home", icon: Home },
  { id: "search", label: "search", icon: Search },
  { id: "library", label: "library", icon: Library },
  { id: "recent", label: "recent", icon: History },
  { id: "genre", label: "genre", icon: AudioLines },
  { id: "stats", label: "stats", icon: ChartBar },
];

const VIEW_LABELS: Record<View, string> = {
  home: "HOME",
  search: "SEARCH",
  library: "LIBRARY",
  nowplaying: "NOW_PLAYING",
  queue: "QUEUE",
  lyrics: "LYRICS",
  artist: "ARTIST",
  album: "ALBUM",
  genre: "GENRE",
  recent: "RECENT",
  stats: "STATS",
};

const SEGMENTS = 40;
const CORNER_POS = [
  "-left-1 -top-1",
  "-right-1 -top-1",
  "-left-1 -bottom-1",
  "-right-1 -bottom-1",
];

/** Mono transport button with accent corner brackets when active. */
function DeckButton({
  label,
  title,
  active = false,
  onClick,
  children,
}: {
  label: string;
  title: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn(
        "relative flex h-10 w-10 flex-col items-center justify-center gap-0.5 border transition-colors",
        active
          ? "border-[color:var(--accent)] text-[color:var(--accent)]"
          : "border-white/20 text-zinc-400 hover:border-white/40 hover:text-white"
      )}
      style={
        active
          ? { boxShadow: "0 0 12px color-mix(in srgb, var(--accent) 40%, transparent)" }
          : undefined
      }
    >
      {active &&
        CORNER_POS.map((pos) => (
          <span
            key={pos}
            className={cn("absolute h-1 w-1 bg-[color:var(--accent)]", pos)}
          />
        ))}
      {children}
      <span className="text-[8px] leading-none tracking-widest">{label}</span>
    </button>
  );
}

export function CyberLayout() {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const seek = usePlayerStore((s) => s.seek);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const toggleMute = usePlayerStore((s) => s.toggleMute);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const activeView = usePlayerStore((s) => s.activeView);
  const setActiveView = usePlayerStore((s) => s.setActiveView);
  const setActivePlaylist = usePlayerStore((s) => s.setActivePlaylist);
  const setActiveGenre = usePlayerStore((s) => s.setActiveGenre);
  const activePlaylistId = usePlayerStore((s) => s.activePlaylistId);
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const setShowFullNowPlaying = usePlayerStore((s) => s.setShowFullNowPlaying);

  const track = useCurrentTrack();

  const [eqOpen, setEqOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const progress = duration > 0 ? currentTime / duration : 0;

  const seekFromEvent = (e: React.PointerEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    seek(ratio * duration);
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-zinc-950 font-mono text-zinc-100">
      {/* Keyframes for the HUD (EQ bars + cursor blink) */}
      <style>{`
        @keyframes eqb { 0%, 100% { height: 20%; } 50% { height: 100%; } }
        @keyframes blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
      `}</style>

      <NowPlayingOverlay />

      {/* Background layers: scanlines + grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 3px)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* TOP STATUS STRIP */}
      <header className="z-10 flex h-10 shrink-0 items-center gap-3 border-b border-white/10 bg-zinc-950/80 px-3 text-[11px] tracking-widest text-zinc-400">
        <div className="flex min-w-0 items-center gap-2">
          <Terminal aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[color:var(--accent)]" />
          <span className="truncate">
            <span className="text-[color:var(--accent)]">SYS://</span>
            MUSIC_PLAYER v2.0
          </span>
          <span
            aria-hidden="true"
            className="text-[color:var(--accent)]"
            style={{ animation: "blink 1.1s steps(2, start) infinite" }}
          >
            ▮
          </span>
        </div>
        <div className="hidden min-w-0 items-center gap-3 md:flex">
          <span className="truncate">VIEW:{activeView.toUpperCase()}</span>
          <span className="flex shrink-0 items-center gap-1.5">
            SIG:OK
            <span
              className={cn("h-1.5 w-1.5 rounded-full", isPlaying && "animate-pulse")}
              style={{
                background: isPlaying ? "var(--accent)" : "rgba(255,255,255,0.2)",
                boxShadow: isPlaying
                  ? "0 0 8px color-mix(in srgb, var(--accent) 60%, transparent)"
                  : undefined,
              }}
            />
          </span>
        </div>
        <div className="ml-auto flex shrink-0 items-center">
          <ToolbarActions eqOpen={eqOpen} onToggleEq={() => setEqOpen(!eqOpen)} />
        </div>
      </header>

      {/* BODY */}
      <div className="z-10 flex min-h-0 flex-1 gap-2 p-2">
        {/* LEFT RAIL */}
        <nav
          aria-label="Primary navigation"
          className="hidden w-16 shrink-0 flex-col gap-2 md:flex"
        >
          <div className="flex flex-col gap-2">
            {NAV_ITEMS.map((item) => {
              const active = activeView === item.id && !activePlaylistId;
              return (
                <button
                  key={item.id}
                  type="button"
                  title={item.label}
                  aria-label={item.label}
                  onClick={() => {
                    setActiveView(item.id);
                    if (item.id === "genre") setActiveGenre(null);
                    if (item.id !== "library") setActivePlaylist(null);
                  }}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-md border transition-colors",
                    active
                      ? "border-[color:var(--accent)] bg-white/10 text-[color:var(--accent)]"
                      : "border-white/10 bg-zinc-900/60 text-zinc-400 hover:border-white/30 hover:text-white"
                  )}
                  style={
                    active
                      ? { boxShadow: "0 0 12px color-mix(in srgb, var(--accent) 40%, transparent)" }
                      : undefined
                  }
                >
                  <item.icon className="h-5 w-5" />
                </button>
              );
            })}
          </div>
          <div className="mt-auto flex flex-col gap-2">
            <button
              type="button"
              title="New node"
              aria-label="New node"
              onClick={() => setCreateOpen(true)}
              className="flex aspect-square items-center justify-center rounded-md border border-white/10 bg-zinc-900/60 text-zinc-400 transition-colors hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
            >
              <Plus className="h-5 w-5" />
            </button>
            <button
              type="button"
              title="queue"
              aria-label="queue"
              onClick={() => setActiveView("queue")}
              className={cn(
                "flex aspect-square items-center justify-center rounded-md border transition-colors",
                activeView === "queue"
                  ? "border-[color:var(--accent)] bg-white/10 text-[color:var(--accent)]"
                  : "border-white/10 bg-zinc-900/60 text-zinc-400 hover:border-white/30 hover:text-white"
              )}
              style={
                activeView === "queue"
                  ? { boxShadow: "0 0 12px color-mix(in srgb, var(--accent) 40%, transparent)" }
                  : undefined
              }
            >
              <ListMusic className="h-5 w-5" />
            </button>
            <button
              type="button"
              title="Full screen"
              aria-label="Full screen"
              onClick={() => setShowFullNowPlaying(true)}
              className="flex aspect-square items-center justify-center rounded-md border border-white/10 bg-zinc-900/60 text-zinc-400 transition-colors hover:border-white/30 hover:text-white"
            >
              <Maximize2 className="h-5 w-5" />
            </button>
          </div>
        </nav>

        {/* CENTER */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {/* NOW-PLAYING HUD MODULE */}
          <section className="flex shrink-0 items-center gap-3 rounded-md border border-white/10 bg-zinc-900/60 p-3">
            {track ? (
              <CoverArt
                cover={track.cover}
                accent={track.accent}
                title={track.title}
                size="md"
                rounded="rounded-none"
              />
            ) : (
              <div
                aria-hidden="true"
                className="flex h-14 w-14 shrink-0 items-center justify-center border border-white/10 bg-zinc-900"
              >
                <Terminal className="h-5 w-5 text-zinc-600" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-[9px] tracking-[0.3em] text-zinc-500">{"> NOW_PLAYING"}</div>
              {track ? (
                <>
                  <div className="truncate text-base font-bold tracking-wide text-zinc-100">
                    {track.title}
                  </div>
                  <div className="truncate text-[11px] text-zinc-400">{track.artist}</div>
                </>
              ) : (
                <div className="truncate text-base font-bold tracking-wide text-zinc-500">
                  NO SIGNAL // INSERT MEDIA
                </div>
              )}
            </div>
            <div className="flex h-6 shrink-0 items-end gap-[3px]" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={cn("w-1 bg-[color:var(--accent)]", !isPlaying && "h-1.5")}
                  style={
                    isPlaying
                      ? {
                          animation: "eqb 0.9s ease-in-out infinite",
                          animationDelay: `${i * 120}ms`,
                        }
                      : undefined
                  }
                />
              ))}
            </div>
            <MaximizeButton />
          </section>

          {/* CONTENT FRAME (clipped corners) */}
          <section className="flex min-h-0 flex-1 flex-col rounded-md border border-white/10 bg-zinc-900/40">
            <div
              className="flex min-h-0 flex-1 flex-col"
              style={{
                clipPath:
                  "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))",
              }}
            >
              <div className="flex h-8 shrink-0 items-center gap-3 border-b border-white/10 px-3 text-[10px] tracking-[0.25em] text-zinc-400">
                <span className="truncate">
                  {"> "}
                  {VIEW_LABELS[activeView]}_MODULE
                </span>
                <div className="ml-auto flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    title="Create a new playlist node"
                    onClick={() => setCreateOpen(true)}
                    className="hidden text-[10px] tracking-[0.25em] text-zinc-400 transition-colors hover:text-[color:var(--accent)] sm:inline"
                  >
                    [+ NEW_NODE]
                  </button>
                  <button
                    type="button"
                    title="Lyrics view"
                    onClick={() => setActiveView("lyrics")}
                    className="text-[10px] tracking-[0.25em] text-zinc-400 transition-colors hover:text-[color:var(--accent)]"
                  >
                    [LYRICS]
                  </button>
                  <button
                    type="button"
                    title="Queue view"
                    onClick={() => setActiveView("queue")}
                    className="text-[10px] tracking-[0.25em] text-zinc-400 transition-colors hover:text-[color:var(--accent)]"
                  >
                    [QUEUE]
                  </button>
                </div>
              </div>
              <ScrollArea className="min-h-0 flex-1">
                <MainContent />
              </ScrollArea>
            </div>
          </section>
        </div>

        {/* RIGHT HUD PANEL (EQ) */}
        {eqOpen && (
          <aside className="hidden w-80 shrink-0 flex-col overflow-hidden rounded-md border border-white/10 bg-zinc-900/95 backdrop-blur md:flex">
            <EqPanelBody onClose={() => setEqOpen(false)} />
          </aside>
        )}
      </div>

      {/* BOTTOM DECK */}
      <footer className="z-10 flex h-24 shrink-0 items-center gap-4 border-t border-white/10 bg-zinc-950/90 px-4">
        {/* Volume */}
        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <button
            type="button"
            title={muted ? "Unmute" : "Mute"}
            aria-label={muted ? "Unmute" : "Mute"}
            onClick={toggleMute}
            className={cn(
              "flex h-8 w-8 items-center justify-center border transition-colors",
              muted
                ? "border-[color:var(--accent)] text-[color:var(--accent)]"
                : "border-white/20 text-zinc-400 hover:border-white/40 hover:text-white"
            )}
          >
            {muted || volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            aria-label="Volume"
            className="h-1 w-28 cursor-pointer"
            style={{ accentColor: "var(--accent)" }}
          />
        </div>

        {/* Transport + seek */}
        <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <div
            role="slider"
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            aria-valuenow={Math.round(currentTime)}
            tabIndex={0}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              seekFromEvent(e);
            }}
            onPointerMove={(e) => {
              if (e.buttons & 1) seekFromEvent(e);
            }}
            onKeyDown={(e) => {
              if (duration <= 0) return;
              if (e.key === "ArrowRight") seek(Math.min(duration, currentTime + 5));
              if (e.key === "ArrowLeft") seek(Math.max(0, currentTime - 5));
            }}
            className="flex w-full max-w-2xl cursor-pointer items-center py-1"
          >
            <div className="flex w-full gap-[2px]">
              {Array.from({ length: SEGMENTS }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 flex-1",
                    i / SEGMENTS <= progress ? "bg-[color:var(--accent)]" : "bg-white/10"
                  )}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DeckButton
              label="SHUF"
              title="Toggle shuffle"
              active={shuffle}
              onClick={toggleShuffle}
            >
              <Shuffle className="h-4 w-4" />
            </DeckButton>
            <DeckButton label="PREV" title="Previous track" onClick={prev}>
              <SkipBack className="h-4 w-4" />
            </DeckButton>
            <button
              type="button"
              title={isPlaying ? "Pause" : "Play"}
              aria-label={isPlaying ? "Pause" : "Play"}
              onClick={togglePlay}
              className="flex h-12 w-12 items-center justify-center border border-[color:var(--accent)] bg-[color:var(--accent)] text-zinc-950 transition-transform hover:scale-[1.03]"
              style={{ boxShadow: "0 0 16px color-mix(in srgb, var(--accent) 55%, transparent)" }}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" fill="currentColor" />
              ) : (
                <Play className="h-5 w-5" fill="currentColor" />
              )}
            </button>
            <DeckButton label="NEXT" title="Next track" onClick={next}>
              <SkipForward className="h-4 w-4" />
            </DeckButton>
            <DeckButton
              label="LOOP"
              title={`Repeat mode: ${repeat}`}
              active={repeat !== "off"}
              onClick={cycleRepeat}
            >
              {repeat === "one" ? (
                <Repeat1 className="h-4 w-4" />
              ) : (
                <Repeat className="h-4 w-4" />
              )}
            </DeckButton>
          </div>
        </div>

        {/* Status */}
        <div className="hidden shrink-0 flex-col items-end gap-1 text-[10px] tracking-widest text-zinc-500 md:flex">
          <span className="flex items-center gap-2">
            <Disc3
              aria-hidden="true"
              className={cn("h-3.5 w-3.5", isPlaying && "animate-spin text-[color:var(--accent)]")}
            />
            {`TRK_${String(currentIndex + 1).padStart(2, "0")} // ${queue.length} NODES`}
          </span>
          <span>{`${formatTime(currentTime)} / ${formatTime(duration)}`}</span>
        </div>
      </footer>

      <CreatePlaylistDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
