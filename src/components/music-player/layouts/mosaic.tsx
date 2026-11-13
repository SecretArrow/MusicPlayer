"use client";

/**
 * MOSAIC layout — "Bento Garden" (Forest theme).
 *
 * A bento-tile dashboard: a floating top chip bar, a grid of garden-themed
 * tiles for the custom home, and a floating pill player bar at the bottom.
 * Every non-home view still flows through the shared <MainContent /> so
 * behaviour stays identical across themes.
 */

import { useMemo, useState, type ReactNode } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Heart,
  Home,
  Search,
  Library,
  History,
  AudioLines,
  ChartBar,
  Plus,
  Sprout,
  Leaf,
  Trees,
  Flame,
  Clock3,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  usePlayerStore,
  useCurrentTrack,
  useAllTracks,
  type View,
} from "@/store/player-store";
import { demoGenres } from "@/data/music";
import { CoverArt } from "../cover-art";
import { PlayerControls } from "../player-controls";
import { CreatePlaylistDialog } from "../playlist-dialogs";
import { NowPlayingOverlay } from "../now-playing-overlay";
import { TrackRowGrid } from "../track-list";
import {
  MainContent,
  ToolbarActions,
  EqPanelBody,
  RightControls,
  useLikedTracks,
} from "./shared";

const NAV_ITEMS: { id: View; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "search", label: "Search", icon: Search },
  { id: "library", label: "Library", icon: Library },
  { id: "recent", label: "Recent", icon: History },
  { id: "genre", label: "Genres", icon: AudioLines },
  { id: "stats", label: "Stats", icon: ChartBar },
];

// ---------- Small building blocks ----------

function Tile({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-white/5 bg-zinc-900 p-4",
        className
      )}
    >
      {children}
    </div>
  );
}

function TileHeader({ icon: Icon, label }: { icon: typeof Sprout; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-[color:var(--accent)]" />
      <h3 className="text-sm font-semibold text-white">{label}</h3>
    </div>
  );
}

// ---------- Bento home ----------

function MosaicHome({ onCreate }: { onCreate: () => void }) {
  const playlists = usePlayerStore((s) => s.playlists);
  const artists = usePlayerStore((s) => s.artists);
  const recentPlayed = usePlayerStore((s) => s.recentPlayed);
  const playCounts = usePlayerStore((s) => s.playCounts);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const setActiveView = usePlayerStore((s) => s.setActiveView);
  const setActivePlaylist = usePlayerStore((s) => s.setActivePlaylist);
  const setActiveArtist = usePlayerStore((s) => s.setActiveArtist);
  const setActiveGenre = usePlayerStore((s) => s.setActiveGenre);
  const playPlaylist = usePlayerStore((s) => s.playPlaylist);
  const allTracks = useAllTracks();
  const likedTracks = useLikedTracks();
  const track = useCurrentTrack();

  const topPlayed = useMemo(() => {
    return Object.entries(playCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id, count]) => {
        const t = allTracks.find((tr) => tr.id === id);
        return t ? { id, title: t.title, artist: t.artist, count } : null;
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  }, [playCounts, allTracks]);
  const maxPlays = topPlayed[0]?.count ?? 1;

  return (
    <div className="grid h-full auto-rows-[minmax(140px,auto)] grid-cols-1 gap-3 overflow-y-auto px-4 pb-44 pt-2 md:grid-cols-3">
      {/* NOW PLAYING — hero tile */}
      <Tile className="flex flex-col justify-between p-5 md:col-span-2 md:row-span-2">
        {track ? (
          <>
            <div className="flex items-center gap-5">
              <CoverArt
                cover={track.cover}
                accent={track.accent}
                title={track.title}
                size="xl"
                rounded="rounded-2xl"
              />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                  Now playing
                </p>
                <h2 className="mt-1 truncate text-2xl font-bold text-white">
                  {track.title}
                </h2>
                <button
                  onClick={() => setActiveArtist(track.artistId)}
                  className="mt-1 max-w-full truncate text-sm text-zinc-400 hover:text-[color:var(--accent)] hover:underline"
                >
                  {track.artist}
                </button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={prev}
                  title="Previous"
                  className="h-11 w-11 rounded-full text-zinc-300 hover:text-white"
                >
                  <SkipBack className="h-5 w-5" fill="currentColor" />
                </Button>
                <Button
                  variant="default"
                  size="icon"
                  onClick={togglePlay}
                  title={isPlaying ? "Pause" : "Play"}
                  className="h-11 w-11 rounded-full bg-[color:var(--accent)] text-zinc-950 hover:scale-105 hover:bg-[color:var(--accent)] hover:text-zinc-950"
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
                  onClick={next}
                  title="Next"
                  className="h-11 w-11 rounded-full text-zinc-300 hover:text-white"
                >
                  <SkipForward className="h-5 w-5" fill="currentColor" />
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px]",
                    shuffle
                      ? "border-transparent bg-white/10 text-[color:var(--accent)]"
                      : "border-white/10 text-zinc-500"
                  )}
                >
                  Shuffle {shuffle ? "on" : "off"}
                </span>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px]",
                    repeat !== "off"
                      ? "border-transparent bg-white/10 text-[color:var(--accent)]"
                      : "border-white/10 text-zinc-500"
                  )}
                >
                  Repeat {repeat}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <Sprout className="h-8 w-8 text-[color:var(--accent)]" />
            <p className="text-sm font-semibold text-zinc-300">Nothing playing yet</p>
            <p className="text-xs text-zinc-500">
              Pick a quick pick or a trending track below.
            </p>
          </div>
        )}
      </Tile>

      {/* QUICK PICKS */}
      <Tile className="md:col-span-1 md:row-span-2">
        <TileHeader icon={Sprout} label="Quick picks" />
        <div className="mt-3 flex flex-col gap-0.5">
          {playlists.slice(0, 5).map((pl) => (
            <div
              key={pl.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                setActiveView("library");
                setActivePlaylist(pl.id);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActiveView("library");
                  setActivePlaylist(pl.id);
                }
              }}
              className="group flex cursor-pointer items-center gap-3 rounded-xl pr-2 text-left transition-colors hover:bg-white/5"
            >
              <div
                className="h-9 w-9 shrink-0 rounded-lg shadow-md"
                style={{ background: pl.cover }}
              />
              <div className="min-w-0 flex-1 py-1.5">
                <div className="truncate text-xs font-semibold text-zinc-100">
                  {pl.title}
                </div>
                <div className="truncate text-[10px] text-zinc-500">
                  {pl.trackIds.length} tracks · {pl.curator}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  playPlaylist(pl.id);
                }}
                aria-label={`Play ${pl.title}`}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--accent)] text-zinc-950 shadow-md transition-transform hover:scale-110"
              >
                <Play className="ml-0.5 h-3.5 w-3.5" fill="currentColor" />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={onCreate}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/15 py-2 text-xs font-medium text-zinc-400 transition-colors hover:border-white/30 hover:text-zinc-100"
        >
          <Plus className="h-3.5 w-3.5" /> New playlist
        </button>
      </Tile>

      {/* GENRES */}
      <Tile className="md:col-span-1">
        <TileHeader icon={Leaf} label="Genres" />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {demoGenres.map((g) => (
            <button
              key={g.name}
              onClick={() => setActiveGenre(g.name)}
              className="rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white transition-transform hover:scale-105"
              style={{ background: g.cover }}
            >
              {g.name}
            </button>
          ))}
        </div>
      </Tile>

      {/* STATS — most played */}
      <Tile className="md:col-span-1">
        <TileHeader icon={Flame} label="Most played" />
        <div className="mt-3 space-y-2.5">
          {topPlayed.length === 0 ? (
            <p className="text-xs text-zinc-500">
              Play something to grow your stats.
            </p>
          ) : (
            topPlayed.map((entry) => (
              <div key={entry.id} className="min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-xs font-medium text-zinc-200">
                    {entry.title}
                  </span>
                  <span className="shrink-0 text-[10px] tabular-nums text-zinc-500">
                    {entry.count} plays
                  </span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[color:var(--accent)]"
                    style={{ width: `${Math.round((entry.count / maxPlays) * 100)}%` }}
                  />
                </div>
                <p className="mt-0.5 truncate text-[10px] text-zinc-500">
                  {entry.artist}
                </p>
              </div>
            ))
          )}
        </div>
      </Tile>

      {/* RECENTLY PLAYED */}
      <Tile className="md:col-span-2">
        <div className="flex items-center justify-between gap-2">
          <TileHeader icon={Clock3} label="Recently played" />
          <button
            onClick={() => setActiveView("recent")}
            className="shrink-0 text-[10px] font-medium text-zinc-500 hover:text-zinc-200"
          >
            See all
          </button>
        </div>
        <div className="mt-3">
          {recentPlayed.length === 0 ? (
            <p className="text-xs text-zinc-500">Your history is still growing.</p>
          ) : (
            <TrackRowGrid trackIds={recentPlayed.slice(0, 4)} />
          )}
        </div>
      </Tile>

      {/* ARTISTS */}
      <Tile className="md:col-span-1">
        <TileHeader icon={Users} label="Artists" />
        <div className="mt-3 space-y-1">
          {artists.slice(0, 3).map((a) => (
            <button
              key={a.id}
              onClick={() => setActiveArtist(a.id)}
              className="flex w-full items-center gap-2.5 rounded-xl p-1.5 text-left transition-colors hover:bg-white/5"
            >
              <div
                className="h-8 w-8 shrink-0 rounded-full shadow-md"
                style={{ background: a.cover }}
              />
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold text-zinc-100">
                  {a.name}
                </div>
                <div className="truncate text-[10px] text-zinc-500">{a.genre}</div>
              </div>
            </button>
          ))}
        </div>
      </Tile>

      {/* TRENDING — full width */}
      <Tile className="md:col-span-3">
        <TileHeader icon={Trees} label="Trending now" />
        <div className="mt-3">
          <TrackRowGrid trackIds={allTracks.slice(0, 6).map((t) => t.id)} />
        </div>
      </Tile>

      {/* LIKED SONGS — full width */}
      <Tile className="md:col-span-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Heart
              className={cn(
                "h-4 w-4 text-[color:var(--accent)]",
                likedTracks.length > 0 && "fill-current"
              )}
            />
            <h3 className="text-sm font-semibold text-white">Liked songs</h3>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
              {likedTracks.length}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setActivePlaylist("liked");
              setActiveView("library");
            }}
            className="h-7 gap-1.5 rounded-full border-white/10 bg-white/5 px-3 text-xs text-zinc-200 hover:bg-white/10"
          >
            Open liked
          </Button>
        </div>
        <div className="mt-3">
          {likedTracks.length === 0 ? (
            <p className="text-xs text-zinc-500">
              Tap the heart on any track to plant it here.
            </p>
          ) : (
            <TrackRowGrid trackIds={likedTracks.slice(0, 3).map((t) => t.id)} />
          )}
        </div>
      </Tile>
    </div>
  );
}

// ---------- Layout shell ----------

export function MosaicLayout() {
  const activeView = usePlayerStore((s) => s.activeView);
  const activePlaylistId = usePlayerStore((s) => s.activePlaylistId);
  const setActiveView = usePlayerStore((s) => s.setActiveView);
  const setActivePlaylist = usePlayerStore((s) => s.setActivePlaylist);
  const setActiveGenre = usePlayerStore((s) => s.setActiveGenre);
  const setActiveArtist = usePlayerStore((s) => s.setActiveArtist);
  const likedTrackIds = usePlayerStore((s) => s.likedTrackIds);
  const toggleLike = usePlayerStore((s) => s.toggleLike);
  const track = useCurrentTrack();

  const [eqOpen, setEqOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const bentoHome = activeView === "home" && activePlaylistId === null;
  const isLiked = track ? likedTrackIds.has(track.id) : false;

  const handleNav = (id: View) => {
    setActiveView(id);
    if (id === "genre") setActiveGenre(null);
    if (id !== "library") setActivePlaylist(null);
  };

  const isNavActive = (id: View) => {
    if (id === "home") return bentoHome;
    if (id === "library") return activeView === "library" || activePlaylistId !== null;
    return activeView === id;
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-zinc-950 text-zinc-100">
      <NowPlayingOverlay />
      <CreatePlaylistDialog open={createOpen} onOpenChange={setCreateOpen} />

      {/* Top chip bar */}
      <header className="flex h-12 items-center gap-2 px-3">
        <div className="flex shrink-0 items-center gap-1.5">
          <Sprout className="h-5 w-5 text-[color:var(--accent)]" />
          <span className="text-sm font-bold tracking-tight">bento</span>
        </div>
        <nav aria-label="Primary" className="flex min-w-0 items-center gap-1.5 overflow-x-auto">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                isNavActive(item.id)
                  ? "bg-[color:var(--accent)] text-zinc-950"
                  : "bg-white/5 text-zinc-300 hover:bg-white/10"
              )}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCreateOpen(true)}
            title="New playlist"
            className="h-8 w-8 text-zinc-400 hover:text-white"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <ToolbarActions eqOpen={eqOpen} onToggleEq={() => setEqOpen(!eqOpen)} />
        </div>
      </header>

      {/* Content area */}
      <div className="absolute inset-x-0 bottom-0 top-12">
        {bentoHome ? (
          <MosaicHome onCreate={() => setCreateOpen(true)} />
        ) : (
          <ScrollArea className="h-full">
            <div className="pb-24">
              <MainContent />
            </div>
          </ScrollArea>
        )}
      </div>

      {/* EQ slide-over */}
      {eqOpen && (
        <aside className="absolute bottom-24 right-2 top-16 z-30 w-80 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl">
          <EqPanelBody onClose={() => setEqOpen(false)} />
        </aside>
      )}

      {/* Floating player bar */}
      <footer className="absolute inset-x-2 bottom-2 z-20 flex h-[72px] items-center gap-3 rounded-2xl border border-white/5 bg-zinc-900 px-4">
        <div className="flex w-[30%] min-w-0 shrink-0 items-center gap-3">
          {track ? (
            <>
              <CoverArt
                cover={track.cover}
                accent={track.accent}
                title={track.title}
                size="sm"
                rounded="rounded-lg"
              />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">
                  {track.title}
                </div>
                <button
                  onClick={() => setActiveArtist(track.artistId)}
                  className="max-w-full truncate text-xs text-zinc-400 hover:text-white hover:underline"
                >
                  {track.artist}
                </button>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleLike(track.id)}
                title={isLiked ? "Remove from Liked" : "Add to Liked"}
                className={cn(
                  "h-8 w-8 shrink-0",
                  isLiked ? "text-[color:var(--accent)]" : "text-zinc-400 hover:text-white"
                )}
              >
                <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
              </Button>
            </>
          ) : (
            <div className="text-sm text-zinc-500">No track selected</div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 justify-center">
          <PlayerControls
            variant="pc"
            onShowLyrics={() => setActiveView("lyrics")}
            onShowQueue={() => setActiveView("queue")}
          />
        </div>

        <div className="hidden w-[30%] shrink-0 justify-end lg:flex">
          <RightControls
            onShowLyrics={() => setActiveView("lyrics")}
            onShowQueue={() => setActiveView("queue")}
          />
        </div>
      </footer>
    </div>
  );
}
