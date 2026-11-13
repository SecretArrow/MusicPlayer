"use client";

/**
 * COFFEE theme — "Radio Console" broadcast studio desk.
 *
 * Chrome layout (top to bottom): masthead with station plate + console nav
 * keys, a tuning-dial strip, then either the STUDIO GRID (program schedule +
 * live studio desk) or the shared <MainContent />, an optional EQ panel and a
 * bottom signal status bar. Numeric readouts use font-mono; colors stay on
 * zinc / white-alpha with var(--accent) highlights only.
 */

import { useState } from "react";
import {
  AudioLines,
  ChartBar,
  History,
  Home,
  Library,
  MessageSquareText,
  Mic2,
  Pause,
  Play,
  Podcast,
  Plus,
  Radio,
  Repeat,
  Repeat1,
  Search,
  Shuffle,
  Signal,
  SignalHigh,
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
import { CoverArt } from "../cover-art";
import { CreatePlaylistDialog } from "../playlist-dialogs";
import { NowPlayingOverlay } from "../now-playing-overlay";
import { EqPanelBody, MainContent, ToolbarActions } from "./shared";

type NavId = "home" | "search" | "library" | "recent" | "genre" | "stats";

interface NavItem {
  id: NavId;
  label: string;
  icon: typeof Home;
}

const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "search", label: "Search", icon: Search },
  { id: "library", label: "Library", icon: Library },
  { id: "recent", label: "Recent", icon: History },
  { id: "genre", label: "Genres", icon: AudioLines },
  { id: "stats", label: "Stats", icon: ChartBar },
];

/** Fake air-times cycled across the program schedule rows. */
const AIR_TIMES = [
  "06:00",
  "09:00",
  "12:00",
  "15:00",
  "18:00",
  "21:00",
  "00:00",
  "03:00",
];

const TUNER_TICKS = Array.from({ length: 11 }, (_, i) => 88 + i * 2);
const VU_BAR_COUNT = 12;
const FALLBACK_COVER = "linear-gradient(135deg,#52525B 0%,#18181B 100%)";

const KEYFRAMES = `
@keyframes vu {
  0%, 100% { transform: scaleY(0.2); }
  50% { transform: scaleY(1); }
}
@keyframes onair-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
`;

const transportKeyBtn =
  "flex h-10 w-10 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/5 hover:text-white";

export function BroadcastLayout() {
  const activeView = usePlayerStore((s) => s.activeView);
  const setActiveView = usePlayerStore((s) => s.setActiveView);
  const activePlaylistId = usePlayerStore((s) => s.activePlaylistId);
  const setActivePlaylist = usePlayerStore((s) => s.setActivePlaylist);
  const setActiveGenre = usePlayerStore((s) => s.setActiveGenre);
  const setActiveArtist = usePlayerStore((s) => s.setActiveArtist);
  const playlists = usePlayerStore((s) => s.playlists);
  const playPlaylist = usePlayerStore((s) => s.playPlaylist);
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

  const track = useCurrentTrack();

  const [eqOpen, setEqOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [studioMode, setStudioMode] = useState(true);

  const liveShow = playlists.find((p) => p.id === activePlaylistId) ?? null;
  const stationLabel = liveShow ? liveShow.title : track ? track.title : "OFF AIR";

  // Studio desk only when sitting on the broadcast home with nothing selected.
  const showMain = !studioMode || activeView !== "home" || activePlaylistId !== null;

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const handleNav = (id: NavId) => {
    if (id === "home") {
      setActivePlaylist(null);
      setActiveView("home");
      setStudioMode(true);
      return;
    }
    if (id === "genre") setActiveGenre(null);
    if (id !== "library") setActivePlaylist(null);
    setStudioMode(false);
    setActiveView(id);
  };

  const openShow = (playlistId: string) => {
    setActiveView("library");
    setActivePlaylist(playlistId);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    seek(ratio * duration);
  };

  const handleSeekKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      seek(Math.min(duration, currentTime + 5));
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      seek(Math.max(0, currentTime - 5));
    }
  };

  return (
    <div className="flex h-full w-full flex-col gap-2 bg-zinc-950 p-2 text-zinc-100">
      <style>{KEYFRAMES}</style>

      <NowPlayingOverlay />

      {/* Masthead */}
      <header className="flex shrink-0 items-center gap-4 rounded-lg border border-white/10 bg-zinc-900 px-4 py-3">
        <Radio className="h-5 w-5 shrink-0 text-[color:var(--accent)]" />
        <div className="min-w-0">
          <div className="truncate text-lg font-extrabold tracking-tight text-white">
            COFFEE FM
          </div>
          <div className="truncate text-[11px] text-zinc-500">
            101.3 MHz — your daily blend
          </div>
        </div>

        {/* Console nav keys */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Station sections">
          {NAV_ITEMS.map((item) => {
            const active =
              item.id === "home"
                ? activeView === "home" && studioMode
                : activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                title={item.label}
                className={cn(
                  "flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-[color:var(--accent)] text-zinc-950 hover:bg-[color:var(--accent)] hover:opacity-90"
                    : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="ml-auto shrink-0">
          <ToolbarActions eqOpen={eqOpen} onToggleEq={() => setEqOpen((v) => !v)} />
        </div>
      </header>

      {/* Tuner strip */}
      <div className="flex shrink-0 items-center gap-4 rounded-lg border border-white/10 bg-zinc-950 px-4 py-2">
        <div className="relative h-9 min-w-0 flex-1">
          <div className="flex h-full items-start justify-between">
            {TUNER_TICKS.map((freq) => (
              <div key={freq} className="flex flex-col items-center gap-1">
                <span className="h-2 w-px bg-white/20" aria-hidden="true" />
                <span className="font-mono text-[9px] text-zinc-500">{freq}</span>
              </div>
            ))}
          </div>
          <div
            className="absolute inset-y-0 left-[62%] w-0.5 bg-[color:var(--accent)]"
            style={{ boxShadow: "0 0 8px var(--accent)" }}
            aria-hidden="true"
          />
        </div>
        <span className="max-w-[240px] truncate font-mono text-xs text-[color:var(--accent)]">
          NOW: {stationLabel}
        </span>
      </div>

      {/* Studio grid — content on the left, Live studio (transport) always on air */}
      <section
        className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto px-3 pb-3 xl:grid-cols-[1fr_400px]"
        aria-label="Broadcast studio"
      >
      {showMain ? (
        /* Shared content area (library / playlist / artist / lyrics / …) */
        <main className="flex h-[620px] min-h-0 flex-col overflow-hidden rounded-lg border border-white/10 bg-zinc-900 xl:h-full">
          <ScrollArea className="min-h-0 flex-1">
            <MainContent />
          </ScrollArea>
        </main>
      ) : (
        /* Program schedule */
        <div className="rounded-lg border border-white/10 bg-zinc-900 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Podcast className="h-4 w-4 shrink-0 text-zinc-400" />
              <span className="text-sm font-bold text-white">Program schedule</span>
              <button
                onClick={() => setCreateOpen(true)}
                className="ml-auto flex items-center gap-1 rounded-md bg-white/5 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                New show
              </button>
            </div>

            <div className="flex flex-col gap-1">
              {playlists.map((pl, index) => {
                const isPlayingThisShow = activePlaylistId === pl.id && isPlaying;
                return (
                  <div
                    key={pl.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openShow(pl.id)}
                    onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openShow(pl.id);
                      }
                    }}
                    className="flex cursor-pointer items-center gap-3 rounded-md p-2 transition-colors hover:bg-white/5"
                  >
                    <span className="w-12 shrink-0 font-mono text-xs text-zinc-500">
                      {AIR_TIMES[index % AIR_TIMES.length]}
                    </span>
                    <div
                      className="h-10 w-10 shrink-0 rounded"
                      style={{ background: pl.cover }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-white">
                        {pl.title}
                      </div>
                      <div className="truncate text-xs text-zinc-500">{pl.curator}</div>
                    </div>
                    {isPlayingThisShow && (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span
                          className="h-1.5 w-1.5 animate-pulse rounded-full"
                          style={{ background: "var(--accent)" }}
                          aria-hidden="true"
                        />
                        <span
                          className="text-[9px] font-bold tracking-widest"
                          style={{ color: "var(--accent)" }}
                        >
                          ON AIR
                        </span>
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isPlayingThisShow) togglePlay();
                        else playPlaylist(pl.id);
                      }}
                      title={isPlayingThisShow ? `Pause ${pl.title}` : `Play ${pl.title}`}
                      aria-label={isPlayingThisShow ? `Pause ${pl.title}` : `Play ${pl.title}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--accent)] text-zinc-950 transition-transform hover:scale-105"
                    >
                      {isPlayingThisShow ? (
                        <Pause className="h-4 w-4" fill="currentColor" />
                      ) : (
                        <Play className="h-4 w-4" fill="currentColor" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Live studio */}
        <div className="flex flex-col gap-4 rounded-lg border border-white/10 bg-zinc-900 p-5">
            <div className="flex items-center gap-2">
              <SignalHigh className="h-4 w-4 shrink-0 text-zinc-400" />
              <span className="text-sm font-bold text-white">Live studio</span>
              <span
                className={cn(
                  "ml-auto rounded border px-2 py-1 text-[10px] font-bold tracking-[0.25em]",
                  isPlaying
                    ? "border-[color:var(--accent)]/60 text-[color:var(--accent)]"
                    : "border-white/15 text-zinc-500"
                )}
                style={
                  isPlaying
                    ? { animation: "onair-blink 1.6s ease-in-out infinite" }
                    : undefined
                }
              >
                ON AIR
              </span>
            </div>

            <CoverArt
              cover={track?.cover ?? FALLBACK_COVER}
              accent={track?.accent ?? "var(--accent)"}
              title={track?.title ?? "No signal"}
              size="xl"
              rounded="rounded-lg"
              className="mx-auto"
            />

            <div className="min-w-0 text-center">
              <div className="truncate text-xl font-bold text-white">
                {track ? track.title : "No signal"}
              </div>
              {track && (
                <button
                  onClick={() => setActiveArtist(track.artistId)}
                  title={`Open artist ${track.artist}`}
                  className="mx-auto max-w-full truncate text-sm text-zinc-400 hover:underline"
                >
                  {track.artist}
                </button>
              )}
            </div>

            {/* Custom transport */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={toggleShuffle}
                title="Shuffle"
                aria-label="Shuffle"
                className={cn(
                  transportKeyBtn,
                  shuffle && "text-[color:var(--accent)]"
                )}
              >
                <Shuffle className="h-4 w-4" />
              </button>
              <button
                onClick={prev}
                title="Previous"
                aria-label="Previous"
                className={transportKeyBtn}
              >
                <SkipBack className="h-4 w-4" fill="currentColor" />
              </button>
              <button
                onClick={togglePlay}
                title={isPlaying ? "Pause" : "Play"}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--accent)] text-zinc-950 transition-transform hover:scale-105"
              >
                {isPlaying ? (
                  <Pause className="h-6 w-6" fill="currentColor" />
                ) : (
                  <Play className="h-6 w-6" fill="currentColor" />
                )}
              </button>
              <button
                onClick={next}
                title="Next"
                aria-label="Next"
                className={transportKeyBtn}
              >
                <SkipForward className="h-4 w-4" fill="currentColor" />
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
                aria-label="Repeat mode"
                className={cn(
                  transportKeyBtn,
                  repeat !== "off" && "text-[color:var(--accent)]"
                )}
              >
                {repeat === "one" ? (
                  <Repeat1 className="h-4 w-4" />
                ) : (
                  <Repeat className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Seek strip */}
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-zinc-400">
                {formatTime(currentTime)}
              </span>
              <div
                role="slider"
                aria-label="Seek"
                aria-valuemin={0}
                aria-valuemax={Math.max(1, Math.round(duration))}
                aria-valuenow={Math.round(currentTime)}
                tabIndex={0}
                onClick={handleSeek}
                onKeyDown={handleSeekKey}
                className="flex h-4 min-w-0 flex-1 cursor-pointer items-center"
              >
                <div className="h-1.5 w-full rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${progressPct}%`,
                      background: "var(--accent)",
                    }}
                  />
                </div>
              </div>
              <span className="font-mono text-xs text-zinc-400">
                {formatTime(duration)}
              </span>
            </div>

            {/* VU meter */}
            <div className="flex h-8 items-end justify-center gap-1" aria-hidden="true">
              {Array.from({ length: VU_BAR_COUNT }, (_, i) => (
                <span
                  key={i}
                  className="h-full w-1.5 rounded-t-sm bg-white/15"
                  style={
                    isPlaying
                      ? {
                          background: "var(--accent)",
                          transformOrigin: "bottom",
                          animation: `vu 0.8s ease-in-out ${(i * 0.08).toFixed(2)}s infinite`,
                        }
                      : undefined
                  }
                />
              ))}
            </div>

            {/* Call-in / request line */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveView("lyrics")}
                title="Lyrics"
                aria-label="Lyrics"
                className="flex flex-1 items-center justify-center gap-2 rounded-md bg-white/5 px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Mic2 className="h-4 w-4" />
                Call-in
              </button>
              <button
                onClick={() => setActiveView("queue")}
                title="Queue"
                aria-label="Queue"
                className="flex flex-1 items-center justify-center gap-2 rounded-md bg-white/5 px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                <MessageSquareText className="h-4 w-4" />
                Request line
              </button>
            </div>
          </div>
      </section>

      {/* EQ panel */}
      {eqOpen && (
        <section className="h-[360px] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-zinc-950">
          <EqPanelBody onClose={() => setEqOpen(false)} />
        </section>
      )}

      {/* Bottom status bar */}
      <footer className="flex h-12 shrink-0 items-center gap-3 rounded-lg border border-white/10 bg-zinc-900 px-4">
        <Signal className="h-4 w-4 shrink-0 text-zinc-400" />
        <span className="text-[10px] font-medium tracking-widest text-zinc-400">
          SIGNAL STRONG
        </span>
        <span className="rounded border border-white/15 px-1.5 py-0.5 text-[10px] text-zinc-400">
          320 kbps
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            title={muted || volume === 0 ? "Unmute" : "Mute"}
            aria-label={muted || volume === 0 ? "Unmute" : "Mute"}
            className="text-zinc-400 transition-colors hover:text-white"
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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setVolume(Number(e.target.value))
            }
            aria-label="Volume"
            className="w-28"
            style={{ accentColor: "var(--accent)" }}
          />
        </div>
        <div className="hidden items-center gap-1 sm:flex">
          <button
            onClick={() => setActiveView("lyrics")}
            title="Lyrics"
            aria-label="Lyrics"
            className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Mic2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setActiveView("queue")}
            title="Queue"
            aria-label="Queue"
            className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <MessageSquareText className="h-4 w-4" />
          </button>
        </div>
      </footer>

      <CreatePlaylistDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
