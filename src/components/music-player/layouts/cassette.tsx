"use client";

/**
 * ROSEWOOD — "Cassette Deck" layout (SD-800).
 * The whole app is styled as a 1980s hi-fi component stack:
 *  - top faceplate with brand plate, twin VU meters, LCD counter, badges
 *  - body row: tape-library rail (left) + cassette window & J-card (center)
 *  - graphic-EQ bay (when open) + chunky physical transport deck (bottom)
 */

import {
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  AudioLines,
  CassetteTape,
  ChartBar,
  FastForward,
  Heart,
  History,
  Home,
  Library,
  ListMusic,
  Music2,
  Pause,
  Play,
  Plus,
  Repeat,
  Repeat1,
  Rewind,
  Search,
  Shuffle,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  formatTime,
  useCurrentTrack,
  usePlayerStore,
  type View,
} from "@/store/player-store";
import { NowPlayingOverlay } from "../now-playing-overlay";
import { CreatePlaylistDialog } from "../playlist-dialogs";
import {
  EqPanelBody,
  MainContent,
  ToolbarActions,
  useLikedTracks,
} from "./shared";

const navItems: { id: View; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "search", label: "Search", icon: Search },
  { id: "library", label: "Library", icon: Library },
  { id: "recent", label: "Recent", icon: History },
  { id: "genre", label: "Genre", icon: AudioLines },
  { id: "stats", label: "Stats", icon: ChartBar },
];

/* ---------- Faceplate widgets ---------- */

function VuMeter({ channel, playing }: { channel: string; playing: boolean }) {
  const heights = ["h-1", "h-2", "h-3"];
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[9px] tracking-[0.25em] text-zinc-500">{channel}</span>
      <div className="flex h-6 items-end gap-[2px]">
        {Array.from({ length: 14 }, (_, i) => (
          <div
            key={i}
            className={cn(
              "w-1 rounded-sm",
              heights[i % 3],
              playing ? "bg-[color:var(--accent)]" : "bg-white/15"
            )}
            style={
              playing
                ? {
                    animation: "vu 1s ease-in-out infinite",
                    animationDelay: `${i * 90}ms`,
                    transformOrigin: "bottom",
                  }
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}

function Reel({ side, spinning }: { side: "left" | "right"; spinning: boolean }) {
  return (
    <div
      className={cn(
        "absolute top-1/2 -translate-y-1/2",
        side === "left" ? "left-4" : "right-4",
        spinning && "animate-spin"
      )}
      style={{ animationDuration: "3s", animationTimingFunction: "linear" }}
    >
      <div className="relative h-16 w-16 rounded-full border-4 border-white/20 bg-zinc-950">
        <div className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-white/20" />
        <div className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 rotate-[60deg] bg-white/20" />
        <div className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 rotate-[120deg] bg-white/20" />
        <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-zinc-900" />
      </div>
    </div>
  );
}

/* ---------- Transport keys ---------- */

function DeckKey({
  icon,
  label,
  onClick,
  active,
  led,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  led?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active === undefined ? undefined : active}
      className={cn(
        "flex flex-col items-center gap-1 rounded-md border border-b-4 border-white/15 bg-white/5 px-3 py-2 text-[10px] uppercase tracking-[0.15em] text-zinc-300 transition-colors hover:bg-white/10 active:translate-y-0.5 active:border-b-0",
        active && "border-[color:var(--accent)]/60 bg-[color:var(--accent)]/15 text-white"
      )}
    >
      {icon}
      <span className="flex items-center gap-1">
        {led !== undefined && (
          <span
            className={cn(
              "h-1 w-1 rounded-full",
              active ? "bg-[color:var(--accent)]" : "bg-white/15"
            )}
          />
        )}
        {label}
      </span>
    </button>
  );
}

function KeyDivider() {
  return <div className="hidden h-9 w-px bg-white/10 sm:block" />;
}

/* ---------- Layout ---------- */

export function CassetteLayout() {
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
  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying);
  const activeView = usePlayerStore((s) => s.activeView);
  const setActiveView = usePlayerStore((s) => s.setActiveView);
  const playlists = usePlayerStore((s) => s.playlists);
  const activePlaylistId = usePlayerStore((s) => s.activePlaylistId);
  const setActivePlaylist = usePlayerStore((s) => s.setActivePlaylist);
  const setActiveGenre = usePlayerStore((s) => s.setActiveGenre);
  const track = useCurrentTrack();
  const likedTracks = useLikedTracks();

  const [eqOpen, setEqOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const handleSeek = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = rect.width > 0 ? (e.clientX - rect.left) / rect.width : 0;
    seek(Math.min(Math.max(ratio, 0), 1) * duration);
  };

  const handleSeekKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") seek(Math.min(duration, currentTime + 5));
    else if (e.key === "ArrowLeft") seek(Math.max(0, currentTime - 5));
  };

  const handleStop = () => {
    setIsPlaying(false);
    seek(0);
  };

  return (
    <div className="flex h-full w-full flex-col gap-2 bg-zinc-950 p-2 font-mono text-zinc-100">
      <style>{`@keyframes vu { 0%, 100% { transform: scaleY(0.4); } 50% { transform: scaleY(1.35); } }`}</style>

      <NowPlayingOverlay />

      {/* ---- TOP FACEPLATE ---- */}
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-white/10 bg-zinc-900 p-3">
        {/* brand plate */}
        <div className="rounded border border-white/15 px-2 py-1">
          <div className="text-xs tracking-[0.3em] text-zinc-100">ROSEWOOD Hi-Fi</div>
          <div className="text-[9px] tracking-[0.2em] text-zinc-500">
            STEREO CASSETTE DECK SD-800
          </div>
        </div>

        {/* twin VU meters */}
        <div className="hidden items-center gap-4 xl:flex">
          <VuMeter channel="L" playing={isPlaying} />
          <VuMeter channel="R" playing={isPlaying} />
        </div>

        {/* LCD counter */}
        <div className="flex flex-col gap-1">
          <span className="text-[9px] tracking-[0.25em] text-zinc-500">COUNTER</span>
          <div className="rounded border border-white/10 bg-zinc-950 px-3 py-1 font-mono text-xl tabular-nums tracking-widest text-[color:var(--accent)]">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        {/* badges */}
        <div className="hidden flex-col gap-1 sm:flex">
          <span className="rounded border border-white/15 px-1.5 py-0.5 text-[9px] tracking-[0.15em] text-zinc-500">
            DOLBY NR
          </span>
          <span className="rounded border border-white/15 px-1.5 py-0.5 text-[9px] tracking-[0.15em] text-zinc-500">
            METAL
          </span>
        </div>

        <div className="ml-auto flex shrink-0 items-center">
          <ToolbarActions eqOpen={eqOpen} onToggleEq={() => setEqOpen(!eqOpen)} />
        </div>
      </header>

      {/* ---- BODY ROW ---- */}
      <div className="flex min-h-0 flex-1 gap-2">
        {/* LEFT RAIL — tape library */}
        <aside className="hidden w-48 shrink-0 flex-col rounded-lg border border-white/10 bg-zinc-900 p-2 lg:flex">
          <div className="px-1 pb-2 text-[9px] tracking-[0.25em] text-zinc-500">
            TAPE LIBRARY
          </div>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const lit = activeView === item.id && !activePlaylistId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveView(item.id);
                    if (item.id === "genre") setActiveGenre(null);
                    if (item.id !== "library") setActivePlaylist(null);
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-[10px] uppercase tracking-[0.15em] transition-colors hover:bg-white/10",
                    lit ? "bg-white/10 text-white" : "text-zinc-300"
                  )}
                  title={item.label}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      lit ? "bg-[color:var(--accent)]" : "bg-white/15"
                    )}
                  />
                  <item.icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="px-1 pb-2 pt-3 text-[9px] tracking-[0.25em] text-zinc-500">
            TAPES
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col gap-1 pr-1">
              <button
                type="button"
                onClick={() => {
                  setActiveView("library");
                  setActivePlaylist("liked");
                }}
                className={cn(
                  "flex h-8 w-full items-center overflow-hidden rounded border border-transparent bg-white/5 text-left transition-colors hover:bg-white/10",
                  activePlaylistId === "liked" && "border-[color:var(--accent)]/60"
                )}
                title="Liked songs"
              >
                <span className="flex h-full w-6 shrink-0 items-center justify-center bg-white/10">
                  <Heart className="h-3 w-3 text-zinc-300" fill="currentColor" />
                </span>
                <span className="truncate px-2 text-[10px] uppercase tracking-[0.12em] text-zinc-300">
                  Liked
                </span>
                <span className="ml-auto pr-2 text-[10px] text-zinc-500">
                  {likedTracks.length}
                </span>
              </button>

              {playlists.map((pl) => (
                <button
                  key={pl.id}
                  type="button"
                  onClick={() => {
                    setActiveView("library");
                    setActivePlaylist(pl.id);
                  }}
                  className={cn(
                    "flex h-8 w-full items-center overflow-hidden rounded border border-transparent bg-white/5 text-left transition-colors hover:bg-white/10",
                    activePlaylistId === pl.id && "border-[color:var(--accent)]/60"
                  )}
                  title={pl.title}
                >
                  <span className="h-full w-6 shrink-0" style={{ background: pl.cover }} />
                  <span className="truncate px-2 text-[10px] uppercase tracking-[0.12em] text-zinc-300">
                    {pl.title}
                  </span>
                </button>
              ))}
            </div>
          </ScrollArea>

          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="mt-2 flex h-8 w-full shrink-0 items-center justify-center gap-1.5 rounded-md border border-dashed border-white/15 bg-white/5 text-[10px] uppercase tracking-[0.15em] text-zinc-300 transition-colors hover:bg-white/10"
            title="Create playlist"
          >
            <Plus className="h-3.5 w-3.5" />
            New Tape
          </button>
        </aside>

        {/* CENTER — cassette window + J-card */}
        <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
          {/* cassette window */}
          <div className="shrink-0 rounded-lg border border-white/10 bg-zinc-900 p-4">
            <div className="flex items-center justify-between px-1 pb-3">
              <span className="text-[9px] tracking-[0.25em] text-zinc-500">
                TAPE COMPARTMENT
              </span>
              <span className="text-[9px] tracking-[0.25em] text-zinc-500">
                SIDE A · SD-800
              </span>
            </div>
            <div className="relative rounded-xl border-2 border-white/15 bg-zinc-950 p-4">
              {/* label strip */}
              <div className="flex h-10 items-center gap-2 rounded-sm bg-white/10 px-3">
                <CassetteTape className="h-4 w-4 shrink-0 text-zinc-400" />
                <span className="truncate text-sm tracking-wide text-zinc-100">
                  {track?.title ?? "NO TAPE LOADED"}
                </span>
                <span className="ml-auto hidden truncate pl-2 text-xs text-zinc-400 sm:block">
                  {track?.artist ?? "—"}
                </span>
              </div>
              {/* reel window */}
              <div className="relative mt-3 h-24 overflow-hidden rounded-lg border border-white/10 bg-zinc-900">
                <div className="absolute left-1/4 right-1/4 top-1/2 h-px bg-white/20" />
                <Reel side="left" spinning={isPlaying} />
                <Reel side="right" spinning={isPlaying} />
              </div>
            </div>
          </div>

          {/* J-card (main content) */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-white/10 bg-zinc-900">
            <div className="flex items-center gap-2 px-4 pb-1 pt-3">
              <span className="text-[9px] tracking-[0.25em] text-zinc-500">J-CARD</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <MainContent />
            </ScrollArea>
          </div>
        </section>
      </div>

      {/* ---- GRAPHIC EQ BAY ---- */}
      {eqOpen && (
        <section className="h-[360px] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-zinc-950">
          <EqPanelBody onClose={() => setEqOpen(false)} />
        </section>
      )}

      {/* ---- TRANSPORT DECK ---- */}
      <footer className="shrink-0 rounded-lg border border-white/10 bg-zinc-900 p-3">
        {/* seek strip */}
        <div
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(currentTime)}
          tabIndex={0}
          onClick={handleSeek}
          onKeyDown={handleSeekKey}
          className="relative h-2 cursor-pointer rounded-full bg-zinc-950"
        >
          <div
            className="h-full rounded-full bg-[color:var(--accent)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* LCD time row */}
        <div className="mt-2 flex items-center justify-between px-1 font-mono text-xs tabular-nums tracking-widest text-[color:var(--accent)]">
          <span>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <span>-{formatTime(Math.max(0, duration - currentTime))}</span>
        </div>

        {/* keys row */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <DeckKey icon={<Rewind className="h-4 w-4" />} label="Rew" onClick={prev} />
          <DeckKey
            icon={isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            label={isPlaying ? "Pause" : "Play"}
            onClick={togglePlay}
            active={isPlaying}
          />
          <DeckKey icon={<FastForward className="h-4 w-4" />} label="FF" onClick={next} />
          <DeckKey icon={<Square className="h-4 w-4" />} label="Stop" onClick={handleStop} />
          <KeyDivider />
          <DeckKey
            icon={<Shuffle className="h-4 w-4" />}
            label="Shuffle"
            onClick={toggleShuffle}
            active={shuffle}
            led
          />
          <DeckKey
            icon={repeat === "one" ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
            label={repeat.toUpperCase()}
            onClick={cycleRepeat}
            active={repeat !== "off"}
            led
          />
          <KeyDivider />
          <DeckKey
            icon={<Music2 className="h-4 w-4" />}
            label="Lyrics"
            onClick={() => setActiveView("lyrics")}
            active={activeView === "lyrics"}
          />
          <DeckKey
            icon={<ListMusic className="h-4 w-4" />}
            label="Queue"
            onClick={() => setActiveView("queue")}
            active={activeView === "queue"}
          />
          <DeckKey
            icon={<AudioLines className="h-4 w-4" />}
            label="EQ"
            onClick={() => setEqOpen(!eqOpen)}
            active={eqOpen}
          />
          <KeyDivider />

          {/* volume */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? "Unmute" : "Mute"}
              title={muted ? "Unmute" : "Mute"}
              className="flex h-10 w-10 items-center justify-center rounded-md border border-b-4 border-white/15 bg-white/5 text-zinc-300 transition-colors hover:bg-white/10 active:translate-y-0.5 active:border-b-0"
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
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label="Volume"
              className="w-28"
              style={{ accentColor: "var(--accent)" }}
            />
          </div>
        </div>
      </footer>

      <CreatePlaylistDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
