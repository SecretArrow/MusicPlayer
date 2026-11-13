"use client";

import { useMemo, useState } from "react";
import {
  Home,
  Search,
  Library,
  Play,
  Pause,
  ChevronDown,
  Heart,
  MoreVertical,
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
  AudioLines,
  Car,
  MoreHorizontal,
  SearchX,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  usePlayerStore,
  useCurrentTrack,
  useAllTracks,
  formatTime,
  type RepeatMode,
  type View,
} from "@/store/player-store";
import { CoverArt } from "./cover-art";
import { LyricsPanel } from "./lyrics-panel";
import { QueuePanel } from "./queue-panel";
import { Visualizer } from "./visualizer";
import { AbRepeatControls, PlaybackSpeedMenu, SleepTimerMenu } from "./playback-extras";
import { DeviceMenu } from "./device-menu";
import {
  OptionsSheet,
  EqualizerSheet,
  ThemeSheet,
  TrackActionsSheet,
} from "./android-extras";
import { ArtistPage } from "./artist-page";
import { AlbumPage } from "./album-page";
import { GenreBrowse } from "./genre-browse";
import { RecentView } from "./recent-view";
import { StatsView } from "./stats-view";
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

type Sheet = "none" | "lyrics" | "queue" | "visual" | "options" | "equalizer" | "theme";

export function AndroidPlayer() {
  const activeView = usePlayerStore((s) => s.activeView);
  const setActiveView = usePlayerStore((s) => s.setActiveView);
  const tracks = usePlayerStore((s) => s.tracks);
  const localTracks = usePlayerStore((s) => s.localTracks);
  const playlists = usePlayerStore((s) => s.playlists);
  const recentPlayed = usePlayerStore((s) => s.recentPlayed);
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
  const shuffle = usePlayerStore((s) => s.shuffle);
  const autoConnected = usePlayerStore((s) => s.autoConnected);
  const track = useCurrentTrack();
  const allTracks = useAllTracks();

  // Sheet state
  const [sheet, setSheet] = useState<Sheet>("none");
  const [actionsTrackId, setActionsTrackId] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");

  // Simulated Android Auto handshake — phone searches, then projects to the car display
  const connectAuto = () => {
    if (autoConnected) return;
    toast("Searching for Android Auto head units…");
    setTimeout(() => {
      usePlayerStore.getState().setAutoConnected(true);
      toast.success("Connected to car display", {
        description: "Android Auto is projecting Music Player to your car",
      });
    }, 900);
  };

  const activeViewLabels: Partial<Record<View, string>> = {
    artist: "Artist",
    album: "Album",
    genre: "Genre",
    recent: "Recently played",
    stats: "Your stats",
  };

  const searchResults = useMemo(() => {
    const lower = searchQ.toLowerCase().trim();
    if (!lower) return [];
    return allTracks.filter(
      (t) =>
        t.title.toLowerCase().includes(lower) ||
        t.artist.toLowerCase().includes(lower) ||
        t.album.toLowerCase().includes(lower) ||
        t.genre.toLowerCase().includes(lower)
    );
  }, [searchQ, allTracks]);

  const likedTracks = useMemo(
    () => [...allTracks].filter((t) => likedTrackIds.has(t.id)),
    [allTracks, likedTrackIds]
  );

  const isContentView = ["artist", "album", "genre", "recent", "stats"].includes(activeView);

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Status bar mock */}
      <div className="flex items-center justify-between px-5 py-2 text-[11px] font-medium text-zinc-300">
        <span>9:41</span>
        <div className="flex items-center gap-1">
          {autoConnected && (
            <span className="rounded-full bg-[color:var(--accent)] px-1.5 py-0.5 text-[9px] font-bold text-zinc-950">
              AUTO
            </span>
          )}
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
          {isContentView ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-zinc-300"
              onClick={() => {
                setActiveView("home");
                setActivePlaylist(null);
              }}
              aria-label="Back to home"
            >
              <ChevronDown className="h-5 w-5" />
            </Button>
          ) : (
            <div>
              <p className="text-xs text-zinc-400">Welcome back</p>
              <h1 className="text-lg font-bold text-white">Good evening</h1>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-zinc-300"
              onClick={connectAuto}
              aria-label="Connect to Android Auto"
              title="Connect to Android Auto"
            >
              <Car className="h-5 w-5" />
            </Button>
            <DeviceMenu />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-zinc-300"
              onClick={() => setSheet("options")}
              aria-label="Playback options"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <ScrollArea className="h-full">
          <div className="px-4 pb-44">
            {activeView === "artist" ? (
              <ArtistPage />
            ) : activeView === "album" ? (
              <AlbumPage />
            ) : activeView === "genre" ? (
              <GenreBrowse />
            ) : activeView === "recent" ? (
              <RecentView />
            ) : activeView === "stats" ? (
              <StatsView />
            ) : activeView === "search" ? (
              /* ---------- SEARCH ---------- */
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    autoFocus
                    placeholder="Songs, artists, albums…"
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    className="rounded-full border-white/10 bg-white/5 pl-9 text-zinc-100 placeholder:text-zinc-500"
                  />
                </div>
                {!searchQ ? (
                  <div className="grid grid-cols-2 gap-2">
                    {["Synthwave", "Indie Folk", "Jazz", "Pop"].map((g) => (
                      <button
                        key={g}
                        onClick={() => setSearchQ(g)}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-200"
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-1">
                    {searchResults.map((t) => (
                      <TrackRow
                        key={t.id}
                        trackId={t.id}
                        onActions={() => setActionsTrackId(t.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-10 text-center text-zinc-500">
                    <SearchX className="h-8 w-8" />
                    <p className="text-sm">No results for “{searchQ}”</p>
                  </div>
                )}
              </div>
            ) : activeView === "library" ? (
              /* ---------- LIBRARY ---------- */
              <div className="space-y-6">
                <h2 className="text-base font-bold text-white">Your Library</h2>
                {/* Liked */}
                <button
                  onClick={() => {
                    setActivePlaylist("liked");
                    setActiveView("library");
                  }}
                  className="flex w-full items-center gap-3 rounded-lg bg-gradient-to-r from-purple-600/40 to-[color:var(--accent)]/30 p-3 text-left"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gradient-to-br from-purple-600 to-[color:var(--accent)]">
                    <Heart className="h-5 w-5 text-white" fill="currentColor" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-white">Liked Songs</div>
                    <div className="text-xs text-zinc-400">{likedTracks.length} songs</div>
                  </div>
                  <ChevronDown className="h-4 w-4 rotate-[-90deg] text-zinc-400" />
                </button>
                {/* Playlists */}
                <div className="space-y-1">
                  {playlists.map((pl) => (
                    <button
                      key={pl.id}
                      onClick={() => {
                        setActivePlaylist(pl.id);
                        playPlaylist(pl.id);
                      }}
                      className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-white/5"
                    >
                      <div className="h-11 w-11 shrink-0 rounded-md" style={{ background: pl.cover }} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-white">{pl.title}</div>
                        <div className="truncate text-[11px] text-zinc-400">
                          {pl.trackIds.length} songs · {pl.curator}
                        </div>
                      </div>
                      <Play className="h-4 w-4 text-zinc-400" />
                    </button>
                  ))}
                </div>
                {/* Local files */}
                {localTracks.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-white">My Imports</h3>
                    <div className="space-y-1">
                      {localTracks.map((t) => (
                        <TrackRow
                          key={t.id}
                          trackId={t.id}
                          onActions={() => setActionsTrackId(t.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ---------- HOME ---------- */
              <>
                {/* Quick picks */}
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
                      <div className="h-12 w-12 shrink-0 rounded-md" style={{ background: pl.cover }} />
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
                        <div className="mt-1.5 truncate text-xs font-semibold text-white">
                          {pl.title}
                        </div>
                        <div className="truncate text-[10px] text-zinc-500">{pl.description}</div>
                      </button>
                    ))}
                  </div>
                </section>

                {/* Recently played */}
                {recentPlayed.length > 0 && (
                  <section className="mb-6">
                    <h2 className="mb-3 text-base font-bold text-white">Recently played</h2>
                    <div className="space-y-1">
                      {recentPlayed.slice(0, 3).map((id) => (
                        <TrackRow
                          key={id}
                          trackId={id}
                          onActions={() => setActionsTrackId(id)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Trending tracks */}
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-base font-bold text-white">Trending now</h2>
                    <button
                      onClick={() => {
                        playTrack(tracks[0].id, tracks.map((x) => x.id));
                      }}
                      className="text-[11px] text-zinc-400 hover:text-white"
                    >
                      Play all
                    </button>
                  </div>
                  <div className="space-y-1">
                    {tracks.map((t) => (
                      <TrackRow
                        key={t.id}
                        trackId={t.id}
                        onActions={() => setActionsTrackId(t.id)}
                      />
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Mini player */}
      {track && (
        <div className="absolute bottom-16 left-2 right-2 z-20">
          <div className="flex items-center gap-3 rounded-lg bg-zinc-800 p-2 shadow-2xl ring-1 ring-white/10">
            <CoverArt cover={track.cover} accent={track.accent} title={track.title} size="xs" />
            <button onClick={() => setSheet("lyrics")} className="min-w-0 flex-1 text-left">
              <div className="truncate text-xs font-semibold text-white">{track.title}</div>
              <div className="truncate text-[10px] text-zinc-400">{track.artist}</div>
            </button>
            <Button variant="ghost" size="icon" onClick={togglePlay} className="h-8 w-8 text-white">
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
              activeView === item.id ? "text-[color:var(--accent)]" : "text-zinc-500"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Fullscreen Now Playing sheet */}
      {sheet === "lyrics" || sheet === "queue" || sheet === "visual" ? (
        <NowPlayingSheet sheet={sheet} setSheet={setSheet} />
      ) : null}

      {/* Options / EQ / Theme / Track actions sheets */}
      <OptionsSheet
        open={sheet === "options"}
        onClose={() => setSheet("none")}
        onOpenEqualizer={() => setSheet("equalizer")}
        onOpenThemes={() => setSheet("theme")}
      />
      <EqualizerSheet open={sheet === "equalizer"} onClose={() => setSheet("none")} />
      <ThemeSheet open={sheet === "theme"} onClose={() => setSheet("none")} />
      <TrackActionsSheet
        trackId={actionsTrackId}
        open={actionsTrackId !== null}
        onClose={() => setActionsTrackId(null)}
      />
    </div>
  );

  /** One track row used across home/search/library */
  function TrackRow({ trackId, onActions }: { trackId: string; onActions: () => void }) {
    const t = [...tracks, ...localTracks].find((x) => x.id === trackId);
    if (!t) return null;
    const isActive = queue[currentIndex] === t.id;
    const isLiked = likedTrackIds.has(t.id);
    return (
      <div
        onClick={() => playTrack(t.id, allTracks.map((x) => x.id))}
        className="group flex cursor-pointer items-center gap-3 rounded-md p-1.5 hover:bg-white/[0.05]"
      >
        <div className="relative">
          <CoverArt cover={t.cover} accent={t.accent} title={t.title} size="sm" />
          {isActive && (
            <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/50">
              {isPlaying ? (
                <Pause className="h-5 w-5 text-[color:var(--accent)]" fill="currentColor" />
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
              isActive ? "text-[color:var(--accent)]" : "text-white"
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
          className={cn("p-1", isLiked ? "text-[color:var(--accent)]" : "text-zinc-500")}
          aria-label={isLiked ? "Remove from liked" : "Add to liked"}
        >
          <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onActions();
          }}
          className="p-1 text-zinc-500"
          aria-label={`Actions for ${t.title}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    );
  }
}

function NowPlayingSheet({
  sheet,
  setSheet,
}: {
  sheet: "lyrics" | "queue" | "visual";
  setSheet: (s: Sheet) => void;
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
  const setActiveArtist = usePlayerStore((s) => s.setActiveArtist);

  const dur = duration || track?.duration || 0;
  const isLiked = track ? likedTrackIds.has(track.id) : false;
  const RepeatIcon = repeatIcon[repeat];

  if (!track) return null;

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-zinc-900/95 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-3">
        <button
          onClick={() => setSheet("none")}
          className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-300 hover:text-white"
          aria-label="Close now playing"
        >
          <ChevronDown className="h-6 w-6" />
        </button>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider text-zinc-400">
            Playing from album
          </div>
          <button
            onClick={() => {
              setSheet("none");
              setActiveArtist(track.artistId);
            }}
            className="text-xs font-semibold text-white"
          >
            {track.album}
          </button>
        </div>
        <button
          onClick={() => setSheet("options")}
          className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-300 hover:text-white"
          aria-label="Options"
        >
          <MoreVertical className="h-5 w-5" />
        </button>
      </div>

      {/* Content per tab */}
      {sheet === "visual" ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6">
          <CoverArt
            cover={track.cover}
            accent={track.accent}
            title={track.title}
            size="xl"
            rounded="rounded-xl"
          />
          <Visualizer height={80} className="w-full" />
        </div>
      ) : sheet === "lyrics" ? (
        <div className="min-h-0 flex-1 overflow-hidden px-5 pt-3">
          <LyricsPanel compact />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden px-5 pt-3">
          <QueuePanel compact />
        </div>
      )}

      {/* Compact track meta for lyrics/queue tabs */}
      {sheet !== "visual" && (
        <div className="px-5 pb-3">
          <div className="flex items-center gap-3">
            <CoverArt cover={track.cover} accent={track.accent} title={track.title} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-white">{track.title}</div>
              <div className="truncate text-xs text-zinc-400">{track.artist}</div>
            </div>
            <button
              onClick={() => toggleLike(track.id)}
              className={cn("p-1", isLiked ? "text-[color:var(--accent)]" : "text-zinc-400")}
            >
              <Heart className={cn("h-5 w-5", isLiked && "fill-current")} />
            </button>
          </div>
        </div>
      )}

      {/* Progress */}
      <div className="px-5 pb-2">
        <Slider
          value={[currentTime]}
          max={dur || 1}
          step={1}
          onValueChange={(v) => seek(v[0])}
        />
        <div className="mt-1 flex items-center justify-between text-[10px] tabular-nums text-zinc-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(dur)}</span>
        </div>
      </div>

      {/* Transport controls */}
      <div className="flex items-center justify-between px-6">
        <button
          onClick={toggleShuffle}
          className={cn("p-1", shuffle ? "text-[color:var(--accent)]" : "text-zinc-400")}
          aria-label="Shuffle"
        >
          <Shuffle className="h-5 w-5" />
        </button>
        <button onClick={prev} className="p-1 text-white" aria-label="Previous">
          <SkipBack className="h-8 w-8" fill="currentColor" />
        </button>
        <button
          onClick={togglePlay}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-zinc-900"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="h-8 w-8" fill="currentColor" />
          ) : (
            <Play className="ml-0.5 h-8 w-8" fill="currentColor" />
          )}
        </button>
        <button onClick={next} className="p-1 text-white" aria-label="Next">
          <SkipForward className="h-8 w-8" fill="currentColor" />
        </button>
        <button
          onClick={cycleRepeat}
          className={cn("p-1", repeat !== "off" ? "text-[color:var(--accent)]" : "text-zinc-400")}
          aria-label="Repeat"
        >
          <RepeatIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Extras row: speed + sleep + AB */}
      <div className="mt-2 flex items-center justify-center gap-3 px-5">
        <PlaybackSpeedMenu showLabel={false} />
        <SleepTimerMenu showLabel={false} />
        <AbRepeatControls />
      </div>

      {/* Bottom action row */}
      <div className="mt-2 flex items-center justify-around border-t border-white/5 px-5 py-3 text-zinc-400">
        <button
          onClick={() => setSheet("visual")}
          className={cn(
            "flex flex-col items-center gap-0.5 text-[9px]",
            sheet === "visual" && "text-[color:var(--accent)]"
          )}
        >
          <AudioLines className="h-4 w-4" />
          Visual
        </button>
        <button
          onClick={() => setSheet("lyrics")}
          className={cn(
            "flex flex-col items-center gap-0.5 text-[9px]",
            sheet === "lyrics" && "text-[color:var(--accent)]"
          )}
        >
          <Mic2 className="h-4 w-4" />
          Lyrics
        </button>
        <button
          onClick={() => setSheet("queue")}
          className={cn(
            "flex flex-col items-center gap-0.5 text-[9px]",
            sheet === "queue" && "text-[color:var(--accent)]"
          )}
        >
          <ListMusic className="h-4 w-4" />
          Queue
        </button>
        <button
          onClick={() => usePlayerStore.getState().setShareTrack(track.id)}
          className="flex flex-col items-center gap-0.5 text-[9px]"
        >
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
