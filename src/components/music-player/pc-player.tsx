"use client";

import { useMemo, useState } from "react";
import {
  Home,
  Search,
  Library,
  Plus,
  Heart,
  Clock,
  TrendingUp,
  Play,
  Pause,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  usePlayerStore,
  useCurrentTrack,
  formatTime,
  type View,
} from "@/store/player-store";
import { CoverArt } from "./cover-art";
import { PlayerControls, PlayerRightControls } from "./player-controls";
import { LyricsPanel } from "./lyrics-panel";
import { QueuePanel } from "./queue-panel";

const navItems: { id: View; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "search", label: "Search", icon: Search },
  { id: "library", label: "Your Library", icon: Library },
];

export function PcPlayer() {
  const activeView = usePlayerStore((s) => s.activeView);
  const setActiveView = usePlayerStore((s) => s.setActiveView);
  const playlists = usePlayerStore((s) => s.playlists);
  const tracks = usePlayerStore((s) => s.tracks);
  const activePlaylistId = usePlayerStore((s) => s.activePlaylistId);
  const setActivePlaylist = usePlayerStore((s) => s.setActivePlaylist);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const playPlaylist = usePlayerStore((s) => s.playPlaylist);
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const toggleLike = usePlayerStore((s) => s.toggleLike);
  const likedTrackIds = usePlayerStore((s) => s.likedTrackIds);

  const track = useCurrentTrack();

  const showQueuePanel = activeView === "queue";
  const showLyricsPanel = activeView === "lyrics";

  const activePlaylist = playlists.find((p) => p.id === activePlaylistId);
  const likedTracks = useMemo(
    () => tracks.filter((t) => likedTrackIds.has(t.id)),
    [tracks, likedTrackIds]
  );

  return (
    <div className="flex h-full w-full flex-col gap-2 bg-zinc-950 p-2 text-zinc-100">
      {/* Top: sidebar + main */}
      <div className="flex min-h-0 flex-1 gap-2">
        {/* Sidebar */}
        <aside className="hidden w-60 shrink-0 flex-col gap-2 sm:flex">
          {/* Nav card */}
          <div className="rounded-lg bg-zinc-900 p-3">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Button
                  key={item.id}
                  variant="ghost"
                  onClick={() => {
                    setActiveView(item.id);
                    setActivePlaylist(null);
                  }}
                  className={cn(
                    "justify-start gap-4 px-3 font-semibold text-zinc-300",
                    activeView === item.id && !activePlaylistId && "bg-white/10 text-white"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Button>
              ))}
            </nav>
          </div>

          {/* Library card */}
          <div className="flex min-h-0 flex-1 flex-col rounded-lg bg-zinc-900">
            <div className="flex items-center justify-between px-4 py-3">
              <button
                onClick={() => {
                  setActiveView("library");
                  setActivePlaylist(null);
                }}
                className="flex items-center gap-3 text-sm font-semibold text-zinc-300 hover:text-white"
              >
                <Library className="h-5 w-5" />
                Your Library
              </button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1 px-2">
              <div className="flex flex-col gap-1 pb-3">
                {/* Liked songs pinned */}
                <button
                  onClick={() => {
                    setActiveView("library");
                    setActivePlaylist("liked");
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-white/5",
                    activePlaylistId === "liked" && "bg-white/5"
                  )}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gradient-to-br from-purple-600 to-emerald-500">
                    <Heart className="h-5 w-5 text-white" fill="currentColor" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">Liked Songs</div>
                    <div className="truncate text-xs text-zinc-400">
                      Playlist · {likedTracks.length} songs
                    </div>
                  </div>
                </button>

                {playlists.map((pl) => (
                  <button
                    key={pl.id}
                    onClick={() => {
                      setActiveView("library");
                      setActivePlaylist(pl.id);
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-white/5",
                      activePlaylistId === pl.id && "bg-white/5"
                    )}
                  >
                    <div
                      className="h-12 w-12 shrink-0 rounded-md"
                      style={{ background: pl.cover }}
                    />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white">{pl.title}</div>
                      <div className="truncate text-xs text-zinc-400">
                        Playlist · {pl.curator}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg bg-gradient-to-b from-zinc-900 to-zinc-950">
          {/* Top search bar */}
          <div className="flex items-center gap-3 px-6 py-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                placeholder="Search songs, artists, albums…"
                className="rounded-full border-white/10 bg-white/5 pl-9 text-zinc-100 placeholder:text-zinc-500"
                onChange={(e) => {
                  if (e.target.value) setActiveView("search");
                }}
              />
            </div>
            <Badge
              variant="outline"
              className="hidden items-center gap-1.5 border-white/10 bg-white/5 text-zinc-300 md:flex"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> PC Mode
            </Badge>
          </div>

          {/* Scrollable main area */}
          <ScrollArea className="flex-1">
            <div className="px-6 pb-6">
              {showLyricsPanel ? (
                <LyricsPanel />
              ) : showQueuePanel ? (
                <QueuePanel />
              ) : activePlaylistId === "liked" ? (
                <PlaylistView
                  title="Liked Songs"
                  description="Songs you've liked across the app"
                  cover="linear-gradient(135deg,#9333EA 0%,#10B981 100%)"
                  accent="#10B981"
                  trackIds={likedTracks.map((t) => t.id)}
                />
              ) : activePlaylist ? (
                <PlaylistView
                  title={activePlaylist.title}
                  description={activePlaylist.description}
                  cover={activePlaylist.cover}
                  accent={activePlaylist.accent}
                  trackIds={activePlaylist.trackIds}
                />
              ) : activeView === "search" ? (
                <SearchView />
              ) : activeView === "library" ? (
                <LibraryView />
              ) : (
                <HomeView />
              )}
            </div>
          </ScrollArea>
        </main>
      </div>

      {/* Bottom player bar */}
      <footer className="flex h-20 shrink-0 items-center gap-4 rounded-lg bg-zinc-900 px-4">
        {/* Left: current track */}
        <div className="flex w-[30%] min-w-0 items-center gap-3">
          {track ? (
            <>
              <CoverArt cover={track.cover} accent={track.accent} title={track.title} size="md" />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">{track.title}</div>
                <div className="truncate text-xs text-zinc-400">{track.artist}</div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleLike(track.id)}
                className={cn(
                  "h-8 w-8",
                  likedTrackIds.has(track.id) ? "text-emerald-400" : "text-zinc-400 hover:text-white"
                )}
              >
                <Heart
                  className={cn("h-4 w-4", likedTrackIds.has(track.id) && "fill-current")}
                />
              </Button>
            </>
          ) : (
            <div className="text-sm text-zinc-500">No track selected</div>
          )}
        </div>

        {/* Center: controls + progress */}
        <div className="flex flex-1 flex-col gap-1">
          <PlayerControls
            variant="pc"
            onShowLyrics={() => setActiveView("lyrics")}
            onShowQueue={() => setActiveView("queue")}
          />
        </div>

        {/* Right: volume + actions */}
        <div className="hidden w-[30%] justify-end md:flex">
          <PlayerRightControls
            onShowLyrics={() => setActiveView("lyrics")}
            onShowQueue={() => setActiveView("queue")}
          />
        </div>
      </footer>
    </div>
  );

  function HomeView() {
    return (
      <div className="space-y-8">
        {/* Greeting hero */}
        <section>
          <p className="text-sm text-zinc-400">Good evening</p>
          <h1 className="mt-1 text-3xl font-bold text-white">
            Tonight&apos;s lineup, picked for you
          </h1>
        </section>

        {/* Quick-pick grid */}
        <section>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {playlists.slice(0, 6).map((pl) => (
              <button
                key={pl.id}
                onClick={() => {
                  setActiveView("library");
                  setActivePlaylist(pl.id);
                }}
                className="group flex items-center gap-3 rounded-md bg-white/[0.06] pr-3 text-left transition-colors hover:bg-white/10"
              >
                <div className="h-16 w-16 shrink-0" style={{ background: pl.cover }} />
                <div className="min-w-0 flex-1 py-2">
                  <div className="truncate text-sm font-semibold text-white">{pl.title}</div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playPlaylist(pl.id);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-emerald-950 opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                >
                  <Play className="ml-0.5 h-4 w-4" fill="currentColor" />
                </button>
              </button>
            ))}
          </div>
        </section>

        {/* Made for you / Trending */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Trending now</h2>
            <button className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white">
              Show all <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <TrackRowGrid trackIds={tracks.slice(0, 6).map((t) => t.id)} />
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Recently played</h2>
            <button className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white">
              Show all <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <TrackRowGrid trackIds={tracks.slice(2, 8).map((t) => t.id)} />
        </section>
      </div>
    );
  }

  function SearchView() {
    const [q, setQ] = useState("");
    const results = useMemo(() => {
      if (!q) return tracks;
      const lower = q.toLowerCase();
      return tracks.filter(
        (t) =>
          t.title.toLowerCase().includes(lower) ||
          t.artist.toLowerCase().includes(lower) ||
          t.album.toLowerCase().includes(lower) ||
          t.genre.toLowerCase().includes(lower)
      );
    }, [q]);
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Search</h1>
          <div className="relative mt-4 max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              autoFocus
              placeholder="Type a song, artist or genre…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="rounded-full border-white/10 bg-white/5 pl-9 text-zinc-100 placeholder:text-zinc-500"
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {["Synthwave", "Indie Folk", "Jazz", "Ambient", "Electronic", "Pop"].map((g) => (
              <button
                key={g}
                onClick={() => setQ(g)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-zinc-300 hover:bg-white/10"
              >
                {g}
              </button>
            ))}
          </div>
        </div>
        <TrackTable trackIds={results.map((t) => t.id)} />
      </div>
    );
  }

  function LibraryView() {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Your Library</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {playlists.length} playlists · {likedTracks.length} liked songs
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <button
            onClick={() => setActivePlaylist("liked")}
            className="group text-left"
          >
            <div className="aspect-square w-full overflow-hidden rounded-lg bg-gradient-to-br from-purple-600 to-emerald-500 shadow-lg transition-transform group-hover:scale-[1.02]">
              <div className="flex h-full items-center justify-center">
                <Heart className="h-10 w-10 text-white" fill="currentColor" />
              </div>
            </div>
            <div className="mt-2 text-sm font-semibold text-white">Liked Songs</div>
            <div className="text-xs text-zinc-400">{likedTracks.length} songs</div>
          </button>
          {playlists.map((pl) => (
            <button
              key={pl.id}
              onClick={() => setActivePlaylist(pl.id)}
              className="group text-left"
            >
              <div
                className="aspect-square w-full overflow-hidden rounded-lg shadow-lg transition-transform group-hover:scale-[1.02]"
                style={{ background: pl.cover }}
              />
              <div className="mt-2 truncate text-sm font-semibold text-white">{pl.title}</div>
              <div className="truncate text-xs text-zinc-400">Playlist · {pl.curator}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function PlaylistView({
    title,
    description,
    cover,
    accent,
    trackIds,
  }: {
    title: string;
    description: string;
    cover: string;
    accent: string;
    trackIds: string[];
  }) {
    const list = trackIds
      .map((id) => tracks.find((t) => t.id === id))
      .filter((t): t is NonNullable<typeof t> => Boolean(t));
    const totalSec = list.reduce((s, t) => s + t.duration, 0);
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-end gap-5">
          <div
            className="h-44 w-44 shrink-0 rounded-lg shadow-2xl"
            style={{ background: cover }}
          />
          <div className="min-w-0 pb-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Playlist
            </div>
            <h1 className="mt-1 text-4xl font-bold text-white sm:text-5xl">{title}</h1>
            <p className="mt-2 max-w-xl text-sm text-zinc-400">{description}</p>
            <div className="mt-2 text-xs text-zinc-500">
              {list.length} songs · {Math.floor(totalSec / 60)} min {totalSec % 60} sec
            </div>
          </div>
        </div>

        {/* Action row */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (activePlaylistId && activePlaylistId !== "liked") {
                playPlaylist(activePlaylistId);
              } else if (list[0]) {
                playTrack(list[0].id, list.map((t) => t.id));
              }
            }}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-emerald-950 shadow-lg transition-transform hover:scale-105"
          >
            <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
          </button>
          <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
            <Heart className="h-6 w-6" />
          </Button>
        </div>

        {/* Track list table */}
        <TrackTable trackIds={trackIds} accent={accent} />
      </div>
    );
  }

  /** A simple grid of track cards */
  function TrackRowGrid({ trackIds }: { trackIds: string[] }) {
    const list = trackIds
      .map((id) => tracks.find((t) => t.id === id))
      .filter((t): t is NonNullable<typeof t> => Boolean(t));
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
        {list.map((t) => {
          const isActive = queue[currentIndex] === t.id;
          return (
            <button
              key={t.id}
              onClick={() => playTrack(t.id, list.map((x) => x.id))}
              className="group rounded-md bg-white/[0.04] p-3 text-left transition-colors hover:bg-white/[0.08]"
            >
              <div className="relative mb-2">
                <div
                  className="aspect-square w-full rounded-md shadow-md"
                  style={{ background: t.cover }}
                />
                <div
                  className={cn(
                    "absolute bottom-1.5 right-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-emerald-950 shadow-lg transition-opacity",
                    isActive && isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                >
                  {isActive && isPlaying ? (
                    <Pause className="h-4 w-4" fill="currentColor" />
                  ) : (
                    <Play className="ml-0.5 h-4 w-4" fill="currentColor" />
                  )}
                </div>
              </div>
              <div className="truncate text-sm font-semibold text-white">{t.title}</div>
              <div className="truncate text-xs text-zinc-400">{t.artist}</div>
            </button>
          );
        })}
      </div>
    );
  }

  /** A full track list table */
  function TrackTable({ trackIds }: { trackIds: string[]; accent?: string }) {
    const list = trackIds
      .map((id) => tracks.find((t) => t.id === id))
      .filter((t): t is NonNullable<typeof t> => Boolean(t));

    return (
      <div className="overflow-hidden rounded-md border border-white/5">
        {/* Header row */}
        <div className="grid grid-cols-[24px_1fr_1fr_60px_60px] items-center gap-3 border-b border-white/5 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          <span>#</span>
          <span>Title</span>
          <span className="hidden sm:block">Album</span>
          <span className="hidden sm:block">
            <Clock className="h-3.5 w-3.5" />
          </span>
          <span className="text-right">
            <TrendingUp className="ml-auto h-3.5 w-3.5" />
          </span>
        </div>
        {list.map((t, i) => {
          const isActive = queue[currentIndex] === t.id;
          const isLiked = likedTrackIds.has(t.id);
          return (
            <div
              key={t.id}
              onClick={() => playTrack(t.id, list.map((x) => x.id))}
              className={cn(
                "group grid cursor-pointer grid-cols-[24px_1fr_1fr_60px_60px] items-center gap-3 px-4 py-2 transition-colors hover:bg-white/[0.05]",
                isActive && "bg-white/[0.05]"
              )}
            >
              <div className="flex items-center justify-center text-xs text-zinc-500">
                {isActive && isPlaying ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlay();
                    }}
                    className="text-emerald-400"
                  >
                    <Pause className="h-3.5 w-3.5" fill="currentColor" />
                  </button>
                ) : (
                  <>
                    <span className="group-hover:hidden">{i + 1}</span>
                    <Play
                      className="hidden h-3.5 w-3.5 text-white group-hover:block"
                      fill="currentColor"
                    />
                  </>
                )}
              </div>
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="h-9 w-9 shrink-0 rounded"
                  style={{ background: t.cover }}
                />
                <div className="min-w-0">
                  <div
                    className={cn(
                      "truncate text-sm font-medium",
                      isActive ? "text-emerald-400" : "text-white"
                    )}
                  >
                    {t.title}
                  </div>
                  <div className="truncate text-xs text-zinc-400">{t.artist}</div>
                </div>
              </div>
              <div className="hidden truncate text-sm text-zinc-400 sm:block">{t.album}</div>
              <div className="hidden text-xs tabular-nums text-zinc-500 sm:block">
                {formatTime(t.duration)}
              </div>
              <div className="flex items-center justify-end gap-2 text-xs text-zinc-500">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLike(t.id);
                  }}
                  className={cn(
                    "opacity-0 transition-opacity group-hover:opacity-100",
                    isLiked && "text-emerald-400 opacity-100"
                  )}
                >
                  <Heart className={cn("h-3.5 w-3.5", isLiked && "fill-current")} />
                </button>
                <span className="tabular-nums">{t.plays}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }
}
