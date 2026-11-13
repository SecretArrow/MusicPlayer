"use client";

import { useState } from "react";
import {
  Home,
  Search,
  Library,
  Play,
  Pause,
  ChevronDown,
  Heart,
  MoreHorizontal,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  ListMusic,
  Mic2,
  Share2,
  Volume2,
  Disc3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  usePlayerStore,
  useCurrentTrack,
  formatTime,
  type RepeatMode,
  type View,
} from "@/store/player-store";
import { CoverArt } from "./cover-art";
import { LyricsPanel } from "./lyrics-panel";
import { QueuePanel } from "./queue-panel";
import { Slider } from "@/components/ui/slider";

const bottomNav: { id: View; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "search", label: "Search", icon: Search },
  { id: "library", label: "Library", icon: Library },
];

const repeatIcon: Record<RepeatMode, typeof Repeat> = {
  off: Repeat,
  all: Repeat,
  one: Repeat1,
};

export function AndroidPlayer() {
  const activeView = usePlayerStore((s) => s.activeView);
  const setActiveView = usePlayerStore((s) => s.setActiveView);
  const tracks = usePlayerStore((s) => s.tracks);
  const playlists = usePlayerStore((s) => s.playlists);
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const playPlaylist = usePlayerStore((s) => s.playPlaylist);
  const setActivePlaylist = usePlayerStore((s) => s.setActivePlaylist);
  const activePlaylistId = usePlayerStore((s) => s.activePlaylistId);
  const likedTrackIds = usePlayerStore((s) => s.likedTrackIds);
  const toggleLike = usePlayerStore((s) => s.toggleLike);
  const track = useCurrentTrack();

  // Local UI state for sheet overlays
  const [sheet, setSheet] = useState<"none" | "lyrics" | "queue">("none");

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Status bar mock */}
      <div className="flex items-center justify-between px-5 py-2 text-[11px] font-medium text-zinc-300">
        <span>9:41</span>
        <div className="flex items-center gap-1">
          <span className="text-[9px]">5G</span>
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
            <path d="M2 22h2v-6H2v6zm5 0h2V10H7v12zm5 0h2V6h-2v16zm5 0h2V2h-2v20z" />
          </svg>
          <div className="relative ml-1 h-3 w-6 rounded-sm border border-zinc-500">
            <div className="absolute inset-y-0.5 left-0.5 right-1.5 rounded-sm bg-emerald-400" />
          </div>
        </div>
      </div>

      {/* Main scroll area */}
      <div className="relative flex-1 overflow-hidden">
        {/* Top app bar */}
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-xs text-zinc-400">Welcome back</p>
            <h1 className="text-lg font-bold text-white">Good evening</h1>
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-300">
            <Disc3 className="h-5 w-5" />
          </Button>
        </div>

        <ScrollArea className="h-full">
          <div className="px-4 pb-40">
            {/* Hero quick picks */}
            <div className="mb-5 grid grid-cols-2 gap-2">
              {playlists.slice(0, 4).map((pl) => (
                <button
                  key={pl.id}
                  onClick={() => {
                    setActivePlaylist(pl.id);
                    setActiveView("library");
                    playPlaylist(pl.id);
                  }}
                  className="flex items-center gap-2 rounded-md bg-white/[0.07] pr-2 text-left"
                >
                  <div
                    className="h-12 w-12 shrink-0 rounded-md"
                    style={{ background: pl.cover }}
                  />
                  <div className="min-w-0 py-2 pr-1">
                    <div className="truncate text-xs font-semibold text-white">{pl.title}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Made for you */}
            <section className="mb-6">
              <h2 className="mb-3 text-base font-bold text-white">Made for you</h2>
              <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
                {playlists.map((pl) => (
                  <button
                    key={pl.id}
                    onClick={() => {
                      setActivePlaylist(pl.id);
                      setActiveView("library");
                    }}
                    className="w-32 shrink-0 text-left"
                  >
                    <div
                      className="aspect-square w-full rounded-lg shadow-md"
                      style={{ background: pl.cover }}
                    />
                    <div className="mt-1.5 truncate text-xs font-semibold text-white">{pl.title}</div>
                    <div className="truncate text-[10px] text-zinc-500">{pl.description}</div>
                  </button>
                ))}
              </div>
            </section>

            {/* Trending tracks list */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-bold text-white">Trending now</h2>
                <button className="text-[11px] text-zinc-400">See all</button>
              </div>
              <div className="space-y-1">
                {tracks.map((t, i) => {
                  const isActive = queue[currentIndex] === t.id;
                  const isLiked = likedTrackIds.has(t.id);
                  return (
                    <div
                      key={t.id}
                      onClick={() => playTrack(t.id, tracks.map((x) => x.id))}
                      className="group flex cursor-pointer items-center gap-3 rounded-md p-1.5 hover:bg-white/[0.05]"
                    >
                      <div className="relative">
                        <CoverArt cover={t.cover} accent={t.accent} title={t.title} size="sm" />
                        {isActive && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/50">
                            {isPlaying ? (
                              <Pause className="h-5 w-5 text-emerald-400" fill="currentColor" />
                            ) : (
                              <Play className="ml-0.5 h-5 w-5 text-white" fill="currentColor" />
                            )}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className={cn(
                            "truncate text-sm font-medium",
                            isActive ? "text-emerald-400" : "text-white"
                          )}
                        >
                          {t.title}
                        </div>
                        <div className="truncate text-[11px] text-zinc-400">
                          {t.artist} · {t.plays} plays
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike(t.id);
                        }}
                        className={cn("p-1", isLiked ? "text-emerald-400" : "text-zinc-500")}
                      >
                        <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // cycle to next track as a quick action
                          const next = tracks[(i + 1) % tracks.length];
                          playTrack(next.id, tracks.map((x) => x.id));
                        }}
                        className="p-1 text-zinc-500"
                      >
                        <SkipForward className="h-4 w-4" fill="currentColor" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </ScrollArea>
      </div>

      {/* Mini player */}
      {track && (
        <div className="absolute bottom-16 left-2 right-2 z-20">
          <div className="flex items-center gap-3 rounded-lg bg-zinc-800 p-2 shadow-2xl ring-1 ring-white/10">
            <CoverArt cover={track.cover} accent={track.accent} title={track.title} size="xs" />
            <button
              onClick={() => setSheet("lyrics")}
              className="min-w-0 flex-1 text-left"
            >
              <div className="truncate text-xs font-semibold text-white">{track.title}</div>
              <div className="truncate text-[10px] text-zinc-400">{track.artist}</div>
            </button>
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlay}
              className="h-8 w-8 text-white"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" fill="currentColor" />
              ) : (
                <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSheet("queue")}
              className="h-8 w-8 text-white"
            >
              <ListMusic className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Bottom navigation */}
      <nav className="absolute bottom-0 left-0 right-0 z-10 flex h-16 items-center justify-around border-t border-white/5 bg-zinc-950 px-2">
        {bottomNav.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveView(item.id);
              if (item.id !== "library") setActivePlaylist(null);
            }}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium",
              activeView === item.id ? "text-emerald-400" : "text-zinc-500"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Fullscreen Now Playing sheet */}
      {sheet !== "none" && track && (
        <NowPlayingSheet
          sheet={sheet}
          setSheet={setSheet}
        />
      )}
    </div>
  );
}

function NowPlayingSheet({
  sheet,
  setSheet,
}: {
  sheet: "lyrics" | "queue";
  setSheet: (s: "none" | "lyrics" | "queue") => void;
}) {
  const track = useCurrentTrack();
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const seek = usePlayerStore((s) => s.seek);
  const likedTrackIds = usePlayerStore((s) => s.likedTrackIds);
  const toggleLike = usePlayerStore((s) => s.toggleLike);

  const dur = duration || track?.duration || 0;
  const isLiked = track ? likedTrackIds.has(track.id) : false;
  const RepeatIcon = repeatIcon[repeat];

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-zinc-900/95 backdrop-blur-xl">
      {/* Drag handle */}
      <div className="flex items-center justify-between px-5 pt-3">
        <button
          onClick={() => setSheet("none")}
          className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-300 hover:text-white"
        >
          <ChevronDown className="h-6 w-6" />
        </button>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider text-zinc-400">
            Playing from playlist
          </div>
          <div className="text-xs font-semibold text-white">{track?.album}</div>
        </div>
        <button className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-300 hover:text-white">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      {/* Album art / panel switch */}
      {sheet === "lyrics" ? (
        <div className="flex-1 overflow-hidden px-5 pt-3">
          <LyricsPanel compact />
        </div>
      ) : (
        <div className="flex-1 overflow-hidden px-5 pt-3">
          <QueuePanel compact />
        </div>
      )}

      {/* Cover + meta (hidden when on lyrics/queue panels to save space) */}
      {sheet === "lyrics" && track && (
        <div className="px-5 pb-3">
          <div className="flex items-center gap-3">
            <CoverArt cover={track.cover} accent={track.accent} title={track.title} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-white">{track.title}</div>
              <div className="truncate text-xs text-zinc-400">{track.artist}</div>
            </div>
            <button
              onClick={() => toggleLike(track.id)}
              className={cn("p-1", isLiked ? "text-emerald-400" : "text-zinc-400")}
            >
              <Heart className={cn("h-5 w-5", isLiked && "fill-current")} />
            </button>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="px-5 pb-2">
        <Slider
          value={[currentTime]}
          max={dur || 1}
          step={1}
          onValueChange={(v) => seek(v[0])}
          className="[&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:bg-white"
        />
        <div className="mt-1 flex items-center justify-between text-[10px] tabular-nums text-zinc-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(dur)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-7 pb-5">
        <button
          onClick={toggleShuffle}
          className={cn("p-1", shuffle ? "text-emerald-400" : "text-zinc-400")}
        >
          <Shuffle className="h-5 w-5" />
        </button>
        <button onClick={prev} className="p-1 text-white">
          <SkipBack className="h-8 w-8" fill="currentColor" />
        </button>
        <button
          onClick={togglePlay}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-zinc-900"
        >
          {isPlaying ? (
            <Pause className="h-8 w-8" fill="currentColor" />
          ) : (
            <Play className="ml-0.5 h-8 w-8" fill="currentColor" />
          )}
        </button>
        <button onClick={next} className="p-1 text-white">
          <SkipForward className="h-8 w-8" fill="currentColor" />
        </button>
        <button
          onClick={cycleRepeat}
          className={cn("p-1", repeat !== "off" ? "text-emerald-400" : "text-zinc-400")}
        >
          <RepeatIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Bottom action row */}
      <div className="flex items-center justify-around border-t border-white/5 px-5 py-3 text-zinc-400">
        <button
          onClick={() => setSheet("lyrics")}
          className={cn(
            "flex flex-col items-center gap-0.5 text-[9px]",
            sheet === "lyrics" && "text-emerald-400"
          )}
        >
          <Mic2 className="h-4 w-4" />
          Lyrics
        </button>
        <button
          onClick={() => setSheet("queue")}
          className={cn(
            "flex flex-col items-center gap-0.5 text-[9px]",
            sheet === "queue" && "text-emerald-400"
          )}
        >
          <ListMusic className="h-4 w-4" />
          Queue
        </button>
        <button className="flex flex-col items-center gap-0.5 text-[9px]">
          <Share2 className="h-4 w-4" />
          Share
        </button>
        <button className="flex flex-col items-center gap-0.5 text-[9px]">
          <Volume2 className="h-4 w-4" />
          Devices
        </button>
      </div>

      {/* Home indicator */}
      <div className="flex justify-center pb-2">
        <div className="h-1 w-28 rounded-full bg-zinc-600" />
      </div>
    </div>
  );
}
