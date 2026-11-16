"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import {
  BatteryMedium,
  Car,
  ChevronLeft,
  ChevronRight,
  Disc3,
  Heart,
  LayoutGrid,
  ListMusic,
  Mic,
  Moon,
  Pause,
  Play,
  Repeat,
  Repeat1,
  RotateCcw,
  RotateCw,
  Shuffle,
  SkipBack,
  SkipForward,
  Sun,
  Wifi,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  usePlayerStore,
  useCurrentTrack,
  useAllTracks,
  formatTime,
  type RepeatMode,
} from "@/store/player-store";

type AutoView = "nowplaying" | "browse" | "queue";

type VoiceState =
  | { phase: "listening" }
  | { phase: "transcript"; text: string }
  | { phase: "result"; text: string }
  | { phase: "closed" };

const repeatIcon: Record<RepeatMode, typeof Repeat> = {
  off: Repeat,
  all: Repeat,
  one: Repeat1,
};

/** Canned demo voice queries — resolved against the real library at runtime. */
const VOICE_COMMANDS = [
  "Play Midnight Pulse",
  "Play Coastline Drift",
  "Play Late Night Jazz",
  "Play Aurora Bay",
  "Next track",
  "Turn on shuffle",
];

function RailBtn({
  icon,
  label,
  onClick,
  active,
  hoverClass,
  idleClass,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  hoverClass: string;
  idleClass: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
        hoverClass,
        active ? "bg-[color:var(--accent)]/20 text-[color:var(--accent)]" : idleClass
      )}
    >
      {icon}
    </button>
  );
}

/**
 * Android Auto head unit — simulated car display that mirrors the player.
 * Authentic Auto experience: landscape screen, dark (night) / light (day)
 * themes, large touch targets, Now Playing + Browse + Queue screens and a
 * voice assistant overlay. Playback stays in sync with the shared store.
 */
export function AndroidAutoOverlay() {
  const autoView = usePlayerStore((s) => s.autoView);
  const setAutoView = usePlayerStore((s) => s.setAutoView);
  const setAutoConnected = usePlayerStore((s) => s.setAutoConnected);
  const audioQuality = usePlayerStore((s) => s.audioQuality);

  const track = useCurrentTrack();
  const allTracks = useAllTracks();

  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const seek = usePlayerStore((s) => s.seek);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const likedTrackIds = usePlayerStore((s) => s.likedTrackIds);
  const toggleLike = usePlayerStore((s) => s.toggleLike);
  const playlists = usePlayerStore((s) => s.playlists);
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);

  const [night, setNight] = useState(true);
  const [voice, setVoice] = useState<VoiceState>({ phase: "closed" });
  const [clock, setClock] = useState("--:--");
  const voiceTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Car status bar clock
  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    tick();
    const id = setInterval(tick, 20_000);
    return () => clearInterval(id);
  }, []);

  // Clear pending voice timers on unmount
  useEffect(() => () => voiceTimers.current.forEach(clearTimeout), []);

  const clearVoiceTimers = () => {
    voiceTimers.current.forEach(clearTimeout);
    voiceTimers.current = [];
  };

  const closeVoice = () => {
    clearVoiceTimers();
    setVoice({ phase: "closed" });
  };

  /** Resolve a spoken command against the library and act on it. */
  const execVoiceCommand = (raw: string): string => {
    const st = usePlayerStore.getState();
    const lower = raw.toLowerCase();

    if (/\b(next|skip)\b/.test(lower)) {
      st.next();
      return "Playing next track";
    }
    if (/shuffle/.test(lower)) {
      const wasOn = st.shuffle;
      st.toggleShuffle();
      return wasOn ? "Shuffle turned off" : "Shuffle turned on";
    }
    if (/pause/.test(lower)) {
      st.setIsPlaying(false);
      return "Paused";
    }

    const q = lower.replace(/^play\s+/, "").replace(/[^\w\s&']/g, "").trim();
    if (!q) return "Sorry, I didn't catch that.";

    const library = [...st.tracks, ...st.localTracks];
    const pl = st.playlists.find((p) => p.title.toLowerCase().includes(q));
    const trackHit = library.find((t) => t.title.toLowerCase().includes(q));
    const artistHit = st.artists.find((a) => a.name.toLowerCase().includes(q));

    if (pl) {
      st.playPlaylist(pl.id);
      return `Playing playlist ${pl.title}`;
    }
    if (trackHit) {
      st.playTrack(trackHit.id, library.map((x) => x.id));
      return `Playing ${trackHit.title} by ${trackHit.artist}`;
    }
    if (artistHit) {
      const artistTracks = library.filter((t) => t.artistId === artistHit.id);
      if (artistTracks.length > 0) {
        st.playTrack(artistTracks[0].id, artistTracks.map((x) => x.id));
        return `Playing ${artistHit.name}`;
      }
    }
    return `Sorry, I couldn't find "${raw.replace(/^play\s+/i, "")}"`;
  };

  const startVoice = () => {
    clearVoiceTimers();
    setVoice({ phase: "listening" });
    const cmd = VOICE_COMMANDS[Math.floor(Math.random() * VOICE_COMMANDS.length)];
    voiceTimers.current.push(
      setTimeout(() => setVoice({ phase: "transcript", text: cmd }), 1500)
    );
    voiceTimers.current.push(
      setTimeout(() => {
        const result = execVoiceCommand(cmd);
        setVoice({ phase: "result", text: result });
        voiceTimers.current.push(
          setTimeout(() => {
            setVoice({ phase: "closed" });
            usePlayerStore.getState().setAutoView("nowplaying");
          }, 1900)
        );
      }, 2600)
    );
  };

  const dur = duration || track?.duration || 0;
  const pct = dur > 0 ? Math.min(100, (currentTime / dur) * 100) : 0;
  const isLiked = track ? likedTrackIds.has(track.id) : false;
  const RepeatIcon = repeatIcon[repeat];

  const upcoming = useMemo(() => {
    return queue
      .slice(currentIndex + 1, currentIndex + 30)
      .map((id) => allTracks.find((t) => t.id === id))
      .filter((t): t is NonNullable<typeof t> => Boolean(t));
  }, [queue, currentIndex, allTracks]);
  const nextTrack = upcoming[0] ?? null;

  // Day / night palettes — Android Auto adapts to the car's head unit mode
  const p = night
    ? {
        bezel: "border-zinc-800",
        screen: "bg-[#0c0c0e]",
        rail: "bg-[#101013]",
        text: "text-white",
        sub: "text-zinc-400",
        faint: "text-zinc-500",
        hover: "hover:bg-white/[0.06]",
        active: "bg-white/[0.08]",
        border: "border-white/[0.08]",
        divider: "bg-white/10",
        playBtn: "bg-white text-zinc-950 hover:bg-zinc-200",
        bar: "bg-white/15",
        knob: "bg-white",
      }
    : {
        bezel: "border-zinc-500",
        screen: "bg-[#eceef0]",
        rail: "bg-[#dde0e4]",
        text: "text-zinc-900",
        sub: "text-zinc-600",
        faint: "text-zinc-500",
        hover: "hover:bg-black/[0.06]",
        active: "bg-black/[0.08]",
        border: "border-black/[0.08]",
        divider: "bg-black/10",
        playBtn: "bg-zinc-900 text-white hover:bg-black",
        bar: "bg-black/15",
        knob: "bg-zinc-900",
      };

  const onSeekPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    if (dur > 0) seek(ratio * dur);
  };

  const playLiked = () => {
    const liked = allTracks.filter((t) => likedTrackIds.has(t.id));
    if (liked.length === 0) return;
    usePlayerStore.getState().playTrack(liked[0].id, liked.map((t) => t.id));
    setAutoView("nowplaying");
  };

  const playPlaylistFromAuto = (playlistId: string) => {
    usePlayerStore.getState().playPlaylist(playlistId);
    setAutoView("nowplaying");
  };

  const qualityLabel =
    audioQuality === "lossless" ? "Lossless" : audioQuality === "high" ? "High" : "Data saver";

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/90 p-4 backdrop-blur-md">
      {/* Caption row */}
      <div className="mb-3 flex w-[min(94vw,960px)] items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
          <Car className="h-4 w-4 text-emerald-400" />
          <span>Android Auto · projected to car display</span>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAutoConnected(false)}
          className="h-8 gap-1.5 border-white/15 bg-white/5 text-zinc-200 hover:bg-white/10"
        >
          <X className="h-3.5 w-3.5" />
          Disconnect
        </Button>
      </div>

      {/* Head unit */}
      <div
        className={cn(
          "relative w-[min(94vw,960px)] overflow-hidden rounded-[1.6rem] border-[6px] bg-black shadow-2xl",
          p.bezel
        )}
      >
        <div className={cn("relative flex aspect-[21/9] flex-col", p.screen)}>
          {/* Car status bar */}
          <div
            className={cn(
              "flex h-10 shrink-0 items-center justify-between border-b px-5",
              p.rail,
              p.border
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-emerald-500">Android Auto</span>
              <span className={cn("text-[11px]", p.faint)}>·</span>
              <span className={cn("text-[11px] font-medium", p.sub)}>Music Player</span>
            </div>
            <div className={cn("flex items-center gap-3 text-[11px] font-medium", p.sub)}>
              <span>24°C</span>
              <span className="tabular-nums">{clock}</span>
              <Wifi className="h-3.5 w-3.5" />
              <BatteryMedium className="h-4 w-4" />
              <button
                onClick={() => setNight(!night)}
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full transition-colors",
                  p.hover
                )}
                aria-label={night ? "Switch to day mode" : "Switch to night mode"}
              >
                {night ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Body: left rail + content */}
          <div className="flex min-h-0 flex-1">
            {/* Left rail */}
            <div className={cn("flex w-14 shrink-0 flex-col items-center gap-1 border-r py-3", p.rail, p.border)}>
              <RailBtn
                icon={<ChevronLeft className="h-5 w-5" />}
                label="Back to now playing"
                onClick={() => setAutoView("nowplaying")}
                hoverClass={p.hover}
                idleClass={p.sub}
              />
              <div className={cn("my-1 h-px w-8", p.divider)} />
              <RailBtn
                icon={
                  <Disc3
                    className={cn(
                      "h-5 w-5",
                      autoView === "nowplaying" && isPlaying && "animate-[spin_6s_linear_infinite]"
                    )}
                  />
                }
                label="Now playing"
                active={autoView === "nowplaying"}
                onClick={() => setAutoView("nowplaying")}
                hoverClass={p.hover}
                idleClass={p.sub}
              />
              <RailBtn
                icon={<LayoutGrid className="h-5 w-5" />}
                label="Browse"
                active={autoView === "browse"}
                onClick={() => setAutoView("browse")}
                hoverClass={p.hover}
                idleClass={p.sub}
              />
              <RailBtn
                icon={<ListMusic className="h-5 w-5" />}
                label="Queue"
                active={autoView === "queue"}
                onClick={() => setAutoView("queue")}
                hoverClass={p.hover}
                idleClass={p.sub}
              />
              <div className="flex-1" />
              <RailBtn
                icon={<Mic className="h-5 w-5" />}
                label="Voice search"
                onClick={startVoice}
                hoverClass={p.hover}
                idleClass={p.sub}
              />
            </div>

            {/* ---------- NOW PLAYING ---------- */}
            {autoView === "nowplaying" ? (
              <div className="relative min-h-0 flex-1 overflow-hidden">
                {track && (
                  <div
                    className="pointer-events-none absolute inset-0 opacity-20 blur-2xl"
                    style={{ background: track.cover }}
                  />
                )}
                {!track ? (
                  <div className="relative flex h-full flex-col items-center justify-center gap-4">
                    <Disc3 className={cn("h-14 w-14", p.faint)} />
                    <p className={cn("text-sm", p.sub)}>
                      Nothing playing yet — choose music from Browse
                    </p>
                    <Button onClick={() => setAutoView("browse")} className="rounded-full">
                      Browse music
                    </Button>
                  </div>
                ) : (
                  <div className="relative flex h-full min-w-0">
                    {/* Cover */}
                    <div className="flex h-full items-center p-5">
                      <div
                        className="aspect-square h-full rounded-xl shadow-2xl ring-1 ring-white/10"
                        style={{ background: track.cover }}
                      />
                    </div>

                    {/* Right column */}
                    <div className="flex min-w-0 flex-1 flex-col justify-center gap-4 pr-6">
                      {/* Meta */}
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className={cn("truncate text-2xl font-bold", p.text)}>
                            {track.title}
                          </div>
                          <div className={cn("mt-1 truncate text-sm", p.sub)}>
                            {track.artist} · {track.album} · {track.year}
                          </div>
                        </div>
                        <span
                          className={cn(
                            "mt-1 shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                            p.faint,
                            p.border
                          )}
                        >
                          {qualityLabel}
                        </span>
                        <button
                          onClick={() => toggleLike(track.id)}
                          className={cn(
                            "mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors",
                            p.hover,
                            isLiked ? "text-[color:var(--accent)]" : p.sub
                          )}
                          aria-label={isLiked ? "Remove from liked" : "Add to liked"}
                        >
                          <Heart className={cn("h-5 w-5", isLiked && "fill-current")} />
                        </button>
                      </div>

                      {/* Progress */}
                      <div>
                        <div
                          className={cn("relative h-1.5 w-full cursor-pointer rounded-full", p.bar)}
                          onPointerDown={onSeekPointer}
                          role="slider"
                          aria-label="Seek"
                          aria-valuemin={0}
                          aria-valuemax={Math.round(dur)}
                          aria-valuenow={Math.round(currentTime)}
                        >
                          <div
                            className="absolute inset-y-0 left-0 rounded-full bg-[color:var(--accent)]"
                            style={{ width: `${pct}%` }}
                          />
                          <div
                            className={cn(
                              "absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow",
                              p.knob
                            )}
                            style={{ left: `${pct}%` }}
                          />
                        </div>
                        <div className={cn("mt-1.5 flex justify-between text-[11px] tabular-nums", p.faint)}>
                          <span>{formatTime(currentTime)}</span>
                          <span>{formatTime(dur)}</span>
                        </div>
                      </div>

                      {/* Transport */}
                      <div className="flex items-center justify-center gap-4">
                        <button
                          onClick={toggleShuffle}
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                            p.hover,
                            shuffle ? "text-[color:var(--accent)]" : p.sub
                          )}
                          aria-label="Shuffle"
                        >
                          <Shuffle className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => seek(Math.max(0, currentTime - 10))}
                          className={cn("flex flex-col items-center", p.sub)}
                          aria-label="Rewind 10 seconds"
                        >
                          <RotateCcw className="h-5 w-5" />
                          <span className="text-[9px] font-semibold">10</span>
                        </button>
                        <button
                          onClick={prev}
                          className={cn("p-1", p.text)}
                          aria-label="Previous track"
                        >
                          <SkipBack className="h-7 w-7" fill="currentColor" />
                        </button>
                        <button
                          onClick={togglePlay}
                          className={cn(
                            "flex h-16 w-16 items-center justify-center rounded-full shadow-lg transition-transform active:scale-95",
                            p.playBtn
                          )}
                          aria-label={isPlaying ? "Pause" : "Play"}
                        >
                          {isPlaying ? (
                            <Pause className="h-7 w-7" fill="currentColor" />
                          ) : (
                            <Play className="ml-0.5 h-7 w-7" fill="currentColor" />
                          )}
                        </button>
                        <button
                          onClick={next}
                          className={cn("p-1", p.text)}
                          aria-label="Next track"
                        >
                          <SkipForward className="h-7 w-7" fill="currentColor" />
                        </button>
                        <button
                          onClick={() => seek(Math.min(dur, currentTime + 10))}
                          className={cn("flex flex-col items-center", p.sub)}
                          aria-label="Forward 10 seconds"
                        >
                          <RotateCw className="h-5 w-5" />
                          <span className="text-[9px] font-semibold">10</span>
                        </button>
                        <button
                          onClick={cycleRepeat}
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                            p.hover,
                            repeat !== "off" ? "text-[color:var(--accent)]" : p.sub
                          )}
                          aria-label="Repeat mode"
                        >
                          <RepeatIcon className="h-5 w-5" />
                        </button>
                      </div>

                      {/* Up next */}
                      <div className={cn("truncate text-xs", p.faint)}>
                        {nextTrack
                          ? `Up next · ${nextTrack.title} — ${nextTrack.artist}`
                          : "End of queue"}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : autoView === "browse" ? (
              /* ---------- BROWSE ---------- */
              <div className="min-h-0 flex-1 overflow-y-auto px-7 py-4">
                <h2 className={cn("text-lg font-bold", p.text)}>Browse</h2>
                <div className="mt-3 grid grid-cols-4 gap-4">
                  {playlists.slice(0, 4).map((pl) => (
                    <button
                      key={pl.id}
                      onClick={() => playPlaylistFromAuto(pl.id)}
                      className={cn("rounded-xl p-2 text-left transition-colors", p.hover)}
                    >
                      <div
                        className="aspect-square w-full rounded-lg shadow-md"
                        style={{ background: pl.cover }}
                      />
                      <div className={cn("mt-2 truncate text-xs font-semibold", p.text)}>
                        {pl.title}
                      </div>
                      <div className={cn("truncate text-[10px]", p.faint)}>
                        {pl.trackIds.length} songs
                      </div>
                    </button>
                  ))}
                </div>

                <h3 className={cn("mt-5 text-[11px] font-bold uppercase tracking-wider", p.faint)}>
                  Your library
                </h3>
                <div className="mt-2 space-y-1 pb-4">
                  <button
                    onClick={playLiked}
                    className={cn("flex h-16 w-full items-center gap-4 rounded-xl px-3 text-left transition-colors", p.hover)}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-purple-600 to-[color:var(--accent)]">
                      <Heart className="h-5 w-5 text-white" fill="currentColor" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={cn("truncate text-sm font-semibold", p.text)}>
                        Liked Songs
                      </div>
                      <div className={cn("truncate text-xs", p.faint)}>
                        {likedTrackIds.size} songs
                      </div>
                    </div>
                    <ChevronRight className={cn("h-4 w-4", p.faint)} />
                  </button>
                  {playlists.map((pl) => (
                    <button
                      key={pl.id}
                      onClick={() => playPlaylistFromAuto(pl.id)}
                      className={cn("flex h-16 w-full items-center gap-4 rounded-xl px-3 text-left transition-colors", p.hover)}
                    >
                      <div
                        className="h-11 w-11 shrink-0 rounded-md shadow"
                        style={{ background: pl.cover }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className={cn("truncate text-sm font-semibold", p.text)}>
                          {pl.title}
                        </div>
                        <div className={cn("truncate text-xs", p.faint)}>
                          {pl.trackIds.length} songs · {pl.curator}
                        </div>
                      </div>
                      <ChevronRight className={cn("h-4 w-4", p.faint)} />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* ---------- QUEUE ---------- */
              <div className="min-h-0 flex-1 overflow-y-auto px-7 py-4">
                <div className="flex items-baseline justify-between">
                  <h2 className={cn("text-lg font-bold", p.text)}>Queue</h2>
                  <span className={cn("text-xs", p.faint)}>{queue.length} tracks</span>
                </div>
                <div className="mt-3 space-y-1 pb-4">
                  {queue.map((id, i) => {
                    const t = allTracks.find((x) => x.id === id);
                    if (!t) return null;
                    const active = i === currentIndex;
                    return (
                      <button
                        key={`${id}-${i}`}
                        onClick={() => usePlayerStore.getState().playTrack(id)}
                        className={cn(
                          "flex h-14 w-full items-center gap-4 rounded-xl px-3 text-left transition-colors",
                          p.hover,
                          active && p.active
                        )}
                      >
                        {active ? (
                          <div className="flex h-5 w-5 items-end justify-center gap-[3px]">
                            {[0, 1, 2].map((b) => (
                              <span
                                key={b}
                                className="w-[3px] animate-pulse rounded-full bg-[color:var(--accent)]"
                                style={{ height: 8 + b * 4, animationDelay: `${b * 180}ms` }}
                              />
                            ))}
                          </div>
                        ) : (
                          <span className={cn("w-5 text-center text-xs tabular-nums", p.faint)}>
                            {i + 1}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <div
                            className={cn(
                              "truncate text-sm font-medium",
                              active ? "text-[color:var(--accent)]" : p.text
                            )}
                          >
                            {t.title}
                          </div>
                          <div className={cn("truncate text-xs", p.faint)}>{t.artist}</div>
                        </div>
                        <span className={cn("text-xs tabular-nums", p.faint)}>
                          {formatTime(t.duration)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ---------- VOICE OVERLAY ---------- */}
          {voice.phase !== "closed" && (
            <div
              className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 bg-black/85 text-white"
              onClick={closeVoice}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Escape" && closeVoice()}
            >
              <div className="relative flex h-24 w-24 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--accent)] opacity-40" />
                <span className="absolute inline-flex h-full w-full animate-pulse rounded-full bg-[color:var(--accent)] opacity-30" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-[color:var(--accent)] shadow-2xl">
                  <Mic className="h-9 w-9 text-white" />
                </div>
              </div>
              {voice.phase === "listening" && (
                <div className="text-base font-medium text-zinc-200">
                  Listening… say a command
                </div>
              )}
              {voice.phase === "transcript" && (
                <div className="max-w-[80%] text-center text-lg font-semibold">
                  &ldquo;{voice.text}&rdquo;
                </div>
              )}
              {voice.phase === "result" && (
                <div className="max-w-[80%] text-center text-base font-medium text-emerald-300">
                  {voice.text}
                </div>
              )}
              <div className="text-[11px] uppercase tracking-wider text-zinc-500">
                Tap anywhere to cancel
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="mt-3 text-center text-[11px] text-zinc-500">
        Media Session API active — metadata and controls are exposed to the car, lock screen and
        Bluetooth devices
      </p>
    </div>
  );
}
