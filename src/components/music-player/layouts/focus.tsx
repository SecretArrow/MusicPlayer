"use client";

/**
 * OCEAN theme — "Wave Focus" layout.
 *
 * An immersive center stage (breathing cover glow, title, like, wave
 * visualizer) with a single bottom dock holding navigation, transport,
 * seek and volume. No sidebar, no top bar: browse views open inside a
 * full-screen sheet (z-30) that keeps the dock (z-40) reachable above it.
 */

import { useRef, useState, type CSSProperties } from "react";
import {
  AudioLines,
  ChartBar,
  Heart,
  History,
  Home,
  Library,
  ListMusic,
  MessageSquareText,
  Music2,
  Pause,
  Play,
  Plus,
  Repeat,
  Repeat1,
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  Waves,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  formatTime,
  useCurrentTrack,
  usePlayerStore,
  type View,
} from "@/store/player-store";
import { CreatePlaylistDialog } from "../playlist-dialogs";
import { NowPlayingOverlay } from "../now-playing-overlay";
import {
  EqPanelBody,
  MainContent,
  MaximizeButton,
  ToolbarActions,
} from "./shared";

const NAV_ITEMS: { id: View; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "search", label: "Search", icon: Search },
  { id: "library", label: "Your Library", icon: Library },
  { id: "recent", label: "Recently Played", icon: History },
  { id: "genre", label: "Genres", icon: AudioLines },
  { id: "stats", label: "Listening Stats", icon: ChartBar },
];

const VIEW_TITLES: Record<View, string> = {
  home: "Home",
  search: "Search",
  library: "Your Library",
  nowplaying: "Now Playing",
  queue: "Up Next",
  lyrics: "Lyrics",
  artist: "Artist",
  album: "Album",
  genre: "Genres",
  recent: "Recently Played",
  stats: "Listening Stats",
};

/** Static silhouette heights (%) for the 24 wave bars. */
const WAVE_HEIGHTS = [
  30, 55, 40, 70, 45, 85, 60, 95, 50, 75, 35, 88,
  62, 42, 78, 58, 92, 48, 66, 38, 82, 52, 72, 44,
];

const dockIconBtn =
  "flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-white";

export function FocusLayout() {
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
  const likedTrackIds = usePlayerStore((s) => s.likedTrackIds);
  const toggleLike = usePlayerStore((s) => s.toggleLike);

  const track = useCurrentTrack();

  const [eqOpen, setEqOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const seekBarRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const liked = track ? likedTrackIds.has(track.id) : false;
  const effectiveVolume = muted ? 0 : volume;
  const VolumeIcon = effectiveVolume === 0 ? VolumeX : Volume2;
  const progress =
    duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const openSheetView = (view: View) => {
    setActiveView(view);
    setSheetOpen(true);
  };

  const handleNav = (view: View) => {
    if (view === "genre") setActiveGenre(null);
    if (view !== "library") setActivePlaylist(null);
    openSheetView(view);
  };

  const seekToClientX = (clientX: number) => {
    const el = seekBarRef.current;
    if (!el || duration <= 0) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    seek(ratio * duration);
  };

  const releaseSeekCapture = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const waveBarStyle = (h: number, i: number): CSSProperties =>
    isPlaying
      ? {
          height: `${h}%`,
          animation: "wave 1.4s ease-in-out infinite",
          animationDelay: `${i * 70}ms`,
          background: "var(--accent)",
        }
      : { height: "15%" };

  return (
    <div className="relative h-full w-full overflow-hidden bg-zinc-950 text-zinc-100">
      <style>{`@keyframes wave { 0%, 100% { height: 15%; } 50% { height: 100%; } }`}</style>

      <NowPlayingOverlay />

      {/* Ambient accent blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full opacity-10 blur-3xl"
        style={{ background: "var(--accent)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-32 h-[28rem] w-[28rem] rounded-full opacity-10 blur-3xl"
        style={{ background: "var(--accent)" }}
      />

      {/* Stage */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 pb-40">
        {/* Floating chrome — themes/settings/import reachable straight from the stage */}
        <div className="absolute right-3 top-3 z-30 rounded-full border border-white/10 bg-white/[0.05] backdrop-blur-xl">
          <ToolbarActions eqOpen={eqOpen} onToggleEq={() => setEqOpen(!eqOpen)} />
        </div>
        <div className="pointer-events-none flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.35em] text-zinc-500">
          <Waves className="h-4 w-4" aria-hidden="true" />
          Ocean
        </div>

        {/* Cover with breathing glow */}
        <div className="group relative">
          <div
            aria-hidden="true"
            className={cn(
              "absolute -inset-6 rounded-[2.5rem]",
              isPlaying && "animate-pulse"
            )}
            style={{
              background:
                "radial-gradient(closest-side, color-mix(in srgb, var(--accent) 25%, transparent), transparent)",
            }}
          />
          <div className="relative h-72 w-72 overflow-hidden rounded-[2rem] shadow-2xl">
            {track ? (
              <div className="h-full w-full" style={{ background: track.cover }} />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-zinc-900">
                <Music2 className="h-16 w-16 text-zinc-600" aria-hidden="true" />
              </div>
            )}
          </div>
        </div>

        {/* Title + artist */}
        <div className="flex max-w-[min(92vw,640px)] flex-col items-center gap-1.5 px-4 text-center">
          <h1 className="text-3xl font-light tracking-tight">
            {track ? track.title : "Choose something to drift with"}
          </h1>
          {track && <div className="text-sm text-zinc-400">{track.artist}</div>}
        </div>

        {/* Like + maximize */}
        <div className="flex items-center gap-2">
          {track && (
            <button
              onClick={() => toggleLike(track.id)}
              title={liked ? "Unlike" : "Like"}
              aria-label={liked ? "Unlike" : "Like"}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-white/10",
                liked ? "text-[color:var(--accent)]" : "text-zinc-400 hover:text-white"
              )}
            >
              <Heart
                className="h-5 w-5"
                fill={liked ? "currentColor" : "none"}
                aria-hidden="true"
              />
            </button>
          )}
          <MaximizeButton />
        </div>

        {/* Wave visualizer strip */}
        <div className="flex h-10 items-end gap-1" aria-hidden="true">
          {WAVE_HEIGHTS.map((h, i) => (
            <div
              key={i}
              className="w-1 rounded-full bg-white/15"
              style={waveBarStyle(h, i)}
            />
          ))}
        </div>
      </div>

      {/* Browse sheet */}
      {sheetOpen && (
        <div className="absolute inset-0 z-30 flex flex-col bg-zinc-950/95 backdrop-blur-xl">
          <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
            <button
              onClick={() => setSheetOpen(false)}
              title="Back to stage"
              aria-label="Back to stage"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <h2 className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-200">
              {VIEW_TITLES[activeView]}
            </h2>
            <div className="flex shrink-0 items-center gap-1">
              <ToolbarActions
                eqOpen={eqOpen}
                onToggleEq={() => setEqOpen((v) => !v)}
              />
              <button
                onClick={() => setCreateOpen(true)}
                title="Create playlist"
                aria-label="Create playlist"
                className={dockIconBtn}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <MainContent />
            {/* Keep sheet content clear of the dock beneath */}
            <div className="h-44" aria-hidden="true" />
          </ScrollArea>
        </div>
      )}

      {/* Seek line + dock */}
      <div className="absolute inset-x-0 bottom-6 z-40 flex flex-col items-center gap-2">
        {/* Seek */}
        <div className="flex w-[min(92vw,640px)] items-center gap-3 text-[10px] tabular-nums text-zinc-500">
          <span>{formatTime(currentTime)}</span>
          <div
            ref={seekBarRef}
            role="slider"
            tabIndex={0}
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={Math.max(0, Math.round(duration))}
            aria-valuenow={Math.round(currentTime)}
            className="relative min-w-0 flex-1 cursor-pointer py-2"
            onPointerDown={(e) => {
              draggingRef.current = true;
              e.currentTarget.setPointerCapture(e.pointerId);
              seekToClientX(e.clientX);
            }}
            onPointerMove={(e) => {
              if (draggingRef.current) seekToClientX(e.clientX);
            }}
            onPointerUp={releaseSeekCapture}
            onPointerCancel={releaseSeekCapture}
            onKeyDown={(e) => {
              if (duration <= 0) return;
              if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                e.preventDefault();
                seek(Math.min(duration, currentTime + 5));
              } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                e.preventDefault();
                seek(Math.max(0, currentTime - 5));
              } else if (e.key === "Home") {
                e.preventDefault();
                seek(0);
              } else if (e.key === "End") {
                e.preventDefault();
                seek(duration);
              }
            }}
          >
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[color:var(--accent)]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Dock */}
        <div className="flex w-[min(96vw,760px)] items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.05] px-5 py-3 shadow-2xl backdrop-blur-2xl">
          {/* Left: view nav */}
          <div className="flex min-w-0 flex-1 items-center">
            <nav aria-label="Browse" className="hidden items-center gap-0.5 sm:flex">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  title={item.label}
                  aria-label={item.label}
                  className={cn(
                    "relative flex h-10 w-10 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-white",
                    activeView === item.id && "bg-white/10 text-white"
                  )}
                >
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                  {activeView === item.id && (
                    <span
                      aria-hidden="true"
                      className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-[color:var(--accent)]"
                    />
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Center: transport */}
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={toggleShuffle}
              title={shuffle ? "Shuffle on" : "Shuffle off"}
              aria-label={shuffle ? "Shuffle on" : "Shuffle off"}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-white",
                shuffle && "text-[color:var(--accent)]"
              )}
            >
              <Shuffle className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              onClick={prev}
              title="Previous track"
              aria-label="Previous track"
              className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-300 transition hover:bg-white/10 hover:text-white"
            >
              <SkipBack className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              onClick={togglePlay}
              title={isPlaying ? "Pause" : "Play"}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[color:var(--accent)] text-zinc-950 shadow-lg transition hover:opacity-90"
            >
              {isPlaying ? (
                <Pause className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Play
                  className="ml-0.5 h-6 w-6"
                  fill="currentColor"
                  aria-hidden="true"
                />
              )}
            </button>
            <button
              onClick={next}
              title="Next track"
              aria-label="Next track"
              className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-300 transition hover:bg-white/10 hover:text-white"
            >
              <SkipForward className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              onClick={cycleRepeat}
              title={
                repeat === "off"
                  ? "Repeat off"
                  : repeat === "all"
                    ? "Repeat all"
                    : "Repeat one"
              }
              aria-label={
                repeat === "off"
                  ? "Repeat off"
                  : repeat === "all"
                    ? "Repeat all"
                    : "Repeat one"
              }
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-white",
                repeat !== "off" && "text-[color:var(--accent)]"
              )}
            >
              {repeat === "one" ? (
                <Repeat1 className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Repeat className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Right: lyrics / queue / eq / volume */}
          <div className="flex min-w-0 flex-1 items-center justify-end">
            <div className="hidden items-center gap-1 md:flex">
              <button
                onClick={() => openSheetView("lyrics")}
                title="Lyrics"
                aria-label="Lyrics"
                className={dockIconBtn}
              >
                <MessageSquareText className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                onClick={() => openSheetView("queue")}
                title="Queue"
                aria-label="Queue"
                className={dockIconBtn}
              >
                <ListMusic className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                onClick={() => setEqOpen(true)}
                title="Equalizer"
                aria-label="Equalizer"
                className={cn(
                  dockIconBtn,
                  eqOpen && "text-[color:var(--accent)]"
                )}
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  title={muted ? "Unmute" : "Mute"}
                  aria-label={muted ? "Unmute" : "Mute"}
                  className={dockIconBtn}
                >
                  <VolumeIcon className="h-4 w-4" aria-hidden="true" />
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={effectiveVolume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  aria-label="Volume"
                  className="hidden w-24 cursor-pointer lg:block"
                  style={{ accentColor: "var(--accent)" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating EQ panel */}
      {eqOpen && (
        <div className="absolute bottom-28 left-1/2 z-40 flex max-h-[420px] w-[min(92vw,420px)] -translate-x-1/2 flex-col overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/95 shadow-2xl backdrop-blur-xl">
          <EqPanelBody onClose={() => setEqOpen(false)} />
        </div>
      )}

      <CreatePlaylistDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
