"use client";

/**
 * VINYL layout — "Vinyl Lounge" (SUNSET theme).
 *
 * A warm hi-fi listening room rendered in serif type:
 *  - left "shelf" rail: navigation + record crates (playlists)
 *  - center: "The Listening Room" hosting the shared MainContent views
 *  - right: turntable console (spinning platter, tonearm, custom transport,
 *    volume, lyrics/queue shortcuts and a pull-up EQ drawer)
 * Below xl the console collapses and a compact bottom mini-bar keeps the
 * transport reachable on smaller screens.
 */

import { useRef, useState } from "react";
import {
  AudioLines,
  ChartBar,
  Heart,
  History,
  Home,
  Library,
  ListMusic,
  Music2,
  Pause,
  Play,
  Plus,
  Radio,
  Repeat,
  Repeat1,
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  formatTime,
  useCurrentTrack,
  usePlayerStore,
} from "@/store/player-store";
import { NowPlayingOverlay } from "../now-playing-overlay";
import { CreatePlaylistDialog } from "../playlist-dialogs";
import {
  EqPanelBody,
  MainContent,
  ToolbarActions,
  useLikedTracks,
} from "./shared";

type NavId = "home" | "search" | "library" | "recent" | "genre" | "stats";

const navItems: { id: NavId; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Collection", icon: Home },
  { id: "search", label: "Dig crates", icon: Search },
  { id: "library", label: "Shelves", icon: Library },
  { id: "recent", label: "Recently spun", icon: History },
  { id: "genre", label: "Sections", icon: AudioLines },
  { id: "stats", label: "Plays ledger", icon: ChartBar },
];

const PLATTER_GROOVES =
  "repeating-radial-gradient(circle, #09090b 0px, #18181b 2px, #09090b 4px)";
const FALLBACK_COVER = "linear-gradient(135deg,#3f3f46 0%,#18181b 100%)";

const railRow =
  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-semibold text-zinc-300 transition-colors hover:bg-white/5 hover:text-white";
const transportBtn =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-white/15 text-zinc-300 transition-colors hover:border-white/40 hover:text-white";
const ghostBtn =
  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-zinc-400 transition-colors hover:bg-white/5 hover:text-white";

/** Custom pointer-driven seek slider shared by the console and the mini-bar. */
function VinylSeek({ className }: { className?: string }) {
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const seek = usePlayerStore((s) => s.seek);
  const [dragging, setDragging] = useState(false);
  const barRef = useRef<HTMLDivElement | null>(null);

  const seekFromClientX = (clientX: number) => {
    const el = barRef.current;
    if (!el || duration <= 0) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    seek(ratio * duration);
  };

  const pct =
    duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <div
      ref={barRef}
      role="slider"
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={Math.max(0, Math.round(duration))}
      aria-valuenow={Math.round(currentTime)}
      aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
      tabIndex={0}
      className={cn(
        "group relative flex w-full touch-none select-none items-center rounded-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--accent)]",
        className
      )}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(true);
        seekFromClientX(e.clientX);
      }}
      onPointerMove={(e) => {
        if (dragging) seekFromClientX(e.clientX);
      }}
      onPointerUp={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
        setDragging(false);
      }}
      onPointerCancel={() => setDragging(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          seek(Math.min(duration, currentTime + 5));
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          seek(Math.max(0, currentTime - 5));
        } else if (e.key === "Home") {
          e.preventDefault();
          seek(0);
        } else if (e.key === "End" && duration > 0) {
          e.preventDefault();
          seek(duration);
        }
      }}
    >
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[color:var(--accent)]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow",
          dragging
            ? "opacity-100"
            : "opacity-0 transition-opacity group-hover:opacity-100"
        )}
        style={{ left: `${pct}%` }}
      />
    </div>
  );
}

export function VinylLayout() {
  const activeView = usePlayerStore((s) => s.activeView);
  const setActiveView = usePlayerStore((s) => s.setActiveView);
  const playlists = usePlayerStore((s) => s.playlists);
  const activePlaylistId = usePlayerStore((s) => s.activePlaylistId);
  const setActivePlaylist = usePlayerStore((s) => s.setActivePlaylist);
  const setActiveGenre = usePlayerStore((s) => s.setActiveGenre);
  const setActiveArtist = usePlayerStore((s) => s.setActiveArtist);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const toggleMute = usePlayerStore((s) => s.toggleMute);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);

  const track = useCurrentTrack();
  const likedTracks = useLikedTracks();

  const [eqOpen, setEqOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const handleVolume = (value: number) => setVolume(value / 100);

  return (
    <div className="flex h-full w-full flex-col bg-zinc-950 font-serif text-zinc-100">
      <NowPlayingOverlay />

      <div className="flex min-h-0 flex-1">
        {/* ---------- Left shelf rail ---------- */}
        <aside className="m-2 mr-0 hidden w-60 shrink-0 flex-col rounded-lg bg-zinc-900 p-3 md:flex">
          <div className="flex items-center gap-2 px-1 py-2">
            <Radio className="h-5 w-5 shrink-0 text-[color:var(--accent)]" />
            <span className="truncate text-lg font-bold text-white">
              Vinyl Lounge
            </span>
          </div>

          <nav className="flex flex-col gap-1" aria-label="Vinyl Lounge sections">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.id);
                  if (item.id === "genre") setActiveGenre(null);
                  if (item.id !== "library") setActivePlaylist(null);
                }}
                className={cn(
                  railRow,
                  activeView === item.id &&
                    !activePlaylistId &&
                    "bg-white/10 text-white"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-4 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Crates
          </div>

          <ScrollArea className="mt-1 min-h-0 flex-1">
            <div className="flex flex-col gap-1 pb-2 pr-1">
              <button
                onClick={() => {
                  setActiveView("library");
                  setActivePlaylist("liked");
                }}
                className={cn(
                  railRow,
                  activePlaylistId === "liked" && "bg-white/10 text-white"
                )}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-white/15 to-white/5">
                  <Heart
                    className="h-4 w-4 text-[color:var(--accent)]"
                    fill="currentColor"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">Liked Songs</span>
                  <span className="block truncate text-xs font-normal text-zinc-500">
                    {likedTracks.length} songs
                  </span>
                </span>
              </button>

              {playlists.map((pl) => (
                <button
                  key={pl.id}
                  onClick={() => {
                    setActiveView("library");
                    setActivePlaylist(pl.id);
                  }}
                  className={cn(
                    railRow,
                    activePlaylistId === pl.id && "bg-white/10 text-white"
                  )}
                >
                  <span
                    className="h-10 w-10 shrink-0 rounded-md"
                    style={{ background: pl.cover }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{pl.title}</span>
                    <span className="block truncate text-xs font-normal text-zinc-500">
                      {pl.curator}
                    </span>
                  </span>
                </button>
              ))}

              <button
                onClick={() => setCreateOpen(true)}
                title="Create playlist"
                className={cn(railRow, "text-zinc-400")}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-dashed border-white/20">
                  <Plus className="h-4 w-4" />
                </span>
                <span className="truncate">New crate</span>
              </button>
            </div>
          </ScrollArea>
        </aside>

        {/* ---------- Center: The Listening Room ---------- */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-baseline justify-between gap-4 px-5 pb-1 pt-4">
            <h1 className="text-xl font-bold text-white">The Listening Room</h1>
            <p className="hidden truncate text-xs text-zinc-500 sm:block">
              Records spin while you browse
            </p>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="mx-4 pb-4">
              <MainContent />
            </div>
          </ScrollArea>
        </main>

        {/* ---------- Right turntable console ---------- */}
        <aside className="m-2 hidden w-[400px] shrink-0 flex-col overflow-y-auto overflow-x-hidden rounded-lg bg-zinc-900 p-5 xl:flex">
          {/* Chrome row: label + shared toolbar (EQ toggle lives in ToolbarActions) */}
          <div className="flex shrink-0 flex-wrap items-center gap-y-2">
            <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-400">
              Now Spinning
            </span>
            <div className="ml-auto">
              <ToolbarActions
                eqOpen={eqOpen}
                onToggleEq={() => setEqOpen(!eqOpen)}
              />
            </div>
          </div>

          {/* Turntable */}
          <div className="relative mt-4 flex h-[300px] shrink-0 items-center justify-center">
            <div
              className={cn("relative shrink-0", isPlaying && "animate-spin")}
              style={{
                animationDuration: "5s",
                animationTimingFunction: "linear",
              }}
            >
              <div
                className="relative flex h-[260px] w-[260px] items-center justify-center rounded-full border border-white/10 shadow-2xl"
                style={{ background: PLATTER_GROOVES }}
              >
                <div
                  className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full"
                  style={{ background: track?.cover ?? FALLBACK_COVER }}
                  title={track ? `${track.title} — ${track.artist}` : "No record"}
                >
                  <span className="relative h-2.5 w-2.5 rounded-full bg-zinc-950 ring-1 ring-white/20" />
                </div>
              </div>
            </div>

            {/* Tonearm + pivot */}
            <div
              aria-hidden="true"
              className="absolute right-8 top-4 h-36 w-1.5 origin-top rotate-[25deg] rounded-full bg-gradient-to-b from-zinc-400 to-zinc-600"
            />
            <div
              aria-hidden="true"
              className="absolute right-[26px] top-2 h-4 w-4 rounded-full bg-zinc-500"
            />

            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] tracking-widest text-zinc-500">
              33⅓ RPM · SIDE A
            </div>
          </div>

          {/* Console info */}
          <div className="mt-2 min-w-0 shrink-0 px-1 text-center">
            {track ? (
              <>
                <div className="truncate text-2xl font-bold text-white">
                  {track.title}
                </div>
                <button
                  onClick={() => setActiveArtist(track.artistId)}
                  className="mt-0.5 max-w-full truncate text-sm text-zinc-400 transition-colors hover:text-white hover:underline"
                >
                  {track.artist}
                </button>
                <div className="mt-0.5 truncate text-xs text-zinc-500">
                  {track.album} · {track.year}
                </div>
              </>
            ) : (
              <>
                <div className="truncate text-2xl font-bold text-white">
                  Place a record on the platter
                </div>
                <div className="mt-0.5 truncate text-sm text-zinc-500">
                  Pick something from the shelves to start spinning
                </div>
              </>
            )}
          </div>

          {/* Seek */}
          <div className="mt-3 shrink-0">
            <VinylSeek className="h-5" />
            <div className="mt-1 flex items-center justify-between text-xs tabular-nums text-zinc-500">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Transport */}
          <div className="mt-3 flex shrink-0 items-center justify-center gap-3">
            <button
              onClick={toggleShuffle}
              aria-label="Shuffle"
              aria-pressed={shuffle}
              title="Shuffle"
              className={cn(
                transportBtn,
                shuffle && "border-[color:var(--accent)] text-[color:var(--accent)]"
              )}
            >
              <Shuffle className="h-4 w-4" />
            </button>
            <button
              onClick={prev}
              aria-label="Previous track"
              title="Previous track"
              className={transportBtn}
            >
              <SkipBack className="h-5 w-5" />
            </button>
            <button
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
              title={isPlaying ? "Pause" : "Play"}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[color:var(--accent)] text-zinc-950 transition-transform hover:scale-105"
            >
              {isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6" />
              )}
            </button>
            <button
              onClick={next}
              aria-label="Next track"
              title="Next track"
              className={transportBtn}
            >
              <SkipForward className="h-5 w-5" />
            </button>
            <button
              onClick={cycleRepeat}
              aria-label={`Repeat: ${repeat}`}
              title={`Repeat: ${repeat}`}
              className={cn(
                transportBtn,
                repeat !== "off" &&
                  "border-[color:var(--accent)] text-[color:var(--accent)]"
              )}
            >
              {repeat === "one" ? (
                <Repeat1 className="h-4 w-4" />
              ) : (
                <Repeat className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Volume */}
          <div className="mt-3 flex shrink-0 items-center gap-2">
            <button
              onClick={toggleMute}
              aria-label={muted ? "Unmute" : "Mute"}
              title={muted ? "Unmute" : "Mute"}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
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
              max={100}
              value={muted ? 0 : Math.round(volume * 100)}
              onInput={(e) => handleVolume(Number(e.currentTarget.value))}
              /* onChange mirrors onInput so React's controlled-input check stays happy */
              onChange={(e) => handleVolume(Number(e.currentTarget.value))}
              aria-label="Volume"
              className="min-w-0 flex-1 cursor-pointer"
              style={{ accentColor: "var(--accent)" }}
            />
          </div>

          {/* Lyrics / queue shortcuts */}
          <div className="mt-2 flex shrink-0 items-center justify-center gap-1">
            <button
              onClick={() => setActiveView("lyrics")}
              className={cn(ghostBtn, activeView === "lyrics" && "bg-white/10 text-white")}
            >
              <Music2 className="h-4 w-4" />
              Lyrics
            </button>
            <button
              onClick={() => setActiveView("queue")}
              className={cn(ghostBtn, activeView === "queue" && "bg-white/10 text-white")}
            >
              <ListMusic className="h-4 w-4" />
              Queue
            </button>
          </div>

          {/* EQ drawer */}
          {eqOpen && (
            <div className="mt-3 h-[380px] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-zinc-950/60 p-2">
              <EqPanelBody onClose={() => setEqOpen(false)} />
            </div>
          )}
        </aside>
      </div>

      {/* ---------- Compact mini-bar (below xl, where the console hides) ---------- */}
      <footer className="relative mx-2 mb-2 flex h-16 shrink-0 items-center gap-2 rounded-lg bg-zinc-900 px-3 xl:hidden">
        <span
          className="h-10 w-10 shrink-0 rounded-full border border-white/10"
          style={{ background: track?.cover ?? FALLBACK_COVER }}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1 pb-2">
          <div className="truncate text-sm font-semibold text-white">
            {track ? track.title : "Place a record on the platter"}
          </div>
          {track ? (
            <button
              onClick={() => setActiveArtist(track.artistId)}
              className="max-w-full truncate text-xs text-zinc-400 transition-colors hover:text-white hover:underline"
            >
              {track.artist}
            </button>
          ) : (
            <div className="truncate text-xs text-zinc-500">
              The lounge is quiet
            </div>
          )}
        </div>
        <span className="hidden shrink-0 text-xs tabular-nums text-zinc-500 sm:block">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
        <button
          onClick={toggleShuffle}
          aria-label="Shuffle"
          aria-pressed={shuffle}
          title="Shuffle"
          className={cn(
            "hidden h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/5 hover:text-white sm:flex",
            shuffle && "text-[color:var(--accent)]"
          )}
        >
          <Shuffle className="h-4 w-4" />
        </button>
        <button
          onClick={prev}
          aria-label="Previous track"
          title="Previous track"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
        >
          <SkipBack className="h-4 w-4" />
        </button>
        <button
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
          title={isPlaying ? "Pause" : "Play"}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--accent)] text-zinc-950"
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5" />
          )}
        </button>
        <button
          onClick={next}
          aria-label="Next track"
          title="Next track"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
        >
          <SkipForward className="h-4 w-4" />
        </button>
        <button
          onClick={cycleRepeat}
          aria-label={`Repeat: ${repeat}`}
          title={`Repeat: ${repeat}`}
          className={cn(
            "hidden h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/5 hover:text-white sm:flex",
            repeat !== "off" && "text-[color:var(--accent)]"
          )}
        >
          {repeat === "one" ? (
            <Repeat1 className="h-4 w-4" />
          ) : (
            <Repeat className="h-4 w-4" />
          )}
        </button>
        <div className="absolute inset-x-3 bottom-0.5">
          <VinylSeek className="h-3" />
        </div>
      </footer>

      <CreatePlaylistDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
