"use client";

/**
 * Shared building blocks used by EVERY theme layout variant.
 *
 * Each layout (classic, glass, vinyl, cassette, cyber, focus, mosaic,
 * broadcast) positions its own nav / player chrome, but they all render
 * their main content through <MainContent /> and the shared toolbar via
 * <ToolbarActions /> so behaviour stays identical across themes.
 */

import { useMemo, useState } from "react";
import {
  Search,
  Library,
  Plus,
  Heart,
  Play,
  ChevronRight,
  SlidersHorizontal,
  Settings,
  Keyboard,
  Users,
  Disc3,
  ListMusic,
  Maximize2,
  Smartphone,
  Palette,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  usePlayerStore,
  useAllTracks,
  type SortKey,
} from "@/store/player-store";
import { demoGenres } from "@/data/music";
import { PlayerRightControls } from "../player-controls";
import { LyricsPanel } from "../lyrics-panel";
import { QueuePanel } from "../queue-panel";
import { EqualizerPanel } from "../equalizer-panel";
import { PlaybackSpeedMenu, SleepTimerMenu } from "../playback-extras";
import { DeviceMenu } from "../device-menu";
import { ImportLocalButton } from "../local-import";
import { CreatePlaylistDialog } from "../playlist-dialogs";
import { TrackTable, TrackRowGrid, CardRow } from "../track-list";
import { ArtistPage } from "../artist-page";
import { AlbumPage } from "../album-page";
import { GenreBrowse } from "../genre-browse";
import { RecentView } from "../recent-view";
import { StatsView } from "../stats-view";
import { NowPlayingOverlay } from "../now-playing-overlay";
import type { Track } from "@/data/music";

// ---------- Selector helpers ----------

/** All liked tracks, memoized. */
export function useLikedTracks(): Track[] {
  const allTracks = useAllTracks();
  const likedTrackIds = usePlayerStore((s) => s.likedTrackIds);
  return useMemo(
    () => allTracks.filter((t) => likedTrackIds.has(t.id)),
    [allTracks, likedTrackIds]
  );
}

/** Returns a stable sorter function honouring the library sort setting. */
export function useSortTrackIds() {
  const allTracks = useAllTracks();
  const librarySort = usePlayerStore((s) => s.librarySort);
  return (ids: string[]): string[] => {
    if (librarySort === "custom") return ids;
    const list = ids
      .map((id) => allTracks.find((t) => t.id === id))
      .filter((t): t is NonNullable<typeof t> => Boolean(t));
    const sorted = [...list];
    if (librarySort === "title") sorted.sort((a, b) => a.title.localeCompare(b.title));
    if (librarySort === "artist") sorted.sort((a, b) => a.artist.localeCompare(b.artist));
    if (librarySort === "duration") sorted.sort((a, b) => b.duration - a.duration);
    if (librarySort === "plays") sorted.sort((a, b) => parseInt(b.plays) - parseInt(a.plays));
    return sorted.map((t) => t.id);
  };
}

// ---------- Small shared pieces ----------

export function MaximizeButton() {
  const setShowFullNowPlaying = usePlayerStore((s) => s.setShowFullNowPlaying);
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setShowFullNowPlaying(true)}
      title="Full screen (F)"
      className="h-8 w-8 shrink-0 text-zinc-400 hover:text-white"
    >
      <Maximize2 className="h-4 w-4" />
    </Button>
  );
}

/**
 * The common right-hand toolbar cluster: mode switch, local import,
 * equalizer toggle, theme picker, device menu, shortcuts and settings.
 * Layouts place it wherever their chrome wants it.
 */
export function ToolbarActions({
  eqOpen,
  onToggleEq,
}: {
  eqOpen: boolean;
  onToggleEq: () => void;
}) {
  const setUiMode = usePlayerStore((s) => s.setUiMode);
  const openSettings = usePlayerStore((s) => s.openSettings);
  const setShowShortcuts = usePlayerStore((s) => s.setShowShortcuts);
  const setShowSettings = usePlayerStore((s) => s.setShowSettings);

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setUiMode("android")}
        title="Switch to Android mode"
        className="h-8 w-8 text-zinc-400 hover:text-white"
      >
        <Smartphone className="h-4 w-4" />
      </Button>
      <ImportLocalButton className="hidden lg:inline-flex" />
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleEq}
        title="Equalizer"
        className={cn(
          "h-8 w-8",
          eqOpen ? "text-[color:var(--accent)]" : "text-zinc-400 hover:text-white"
        )}
      >
        <SlidersHorizontal className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => openSettings("appearance")}
        title="Themes and appearance"
        className="h-8 w-8 text-zinc-400 hover:text-white"
      >
        <Palette className="h-4 w-4" />
      </Button>
      <DeviceMenu />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setShowShortcuts(true)}
        title="Keyboard shortcuts (?)"
        className="h-8 w-8 text-zinc-400 hover:text-white"
      >
        <Keyboard className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setShowSettings(true)}
        title="Settings"
        className="h-8 w-8 text-zinc-400 hover:text-white"
      >
        <Settings className="h-4 w-4" />
      </Button>
    </div>
  );
}

/** Shared equalizer panel body (for drawers / docks / side rails). */
export function EqPanelBody({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold text-white">Equalizer</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-zinc-400"
          onClick={onClose}
          title="Close equalizer"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <EqualizerPanel compact />
      </div>
    </div>
  );
}

// ---------- Main content switcher ----------

/**
 * Renders the active view (home / search / library / playlist / artist /
 * album / genre / recent / stats / lyrics / queue). Every layout drops this
 * into its own content area.
 */
export function MainContent() {
  const activeView = usePlayerStore((s) => s.activeView);
  const playlists = usePlayerStore((s) => s.playlists);
  const activePlaylistId = usePlayerStore((s) => s.activePlaylistId);
  const sortTrackIds = useSortTrackIds();
  const likedTracks = useLikedTracks();

  const activePlaylist = playlists.find((p) => p.id === activePlaylistId);

  return (
    <div className="px-6 pb-6">
      {activeView === "lyrics" ? (
        <LyricsPanel />
      ) : activeView === "queue" ? (
        <QueuePanel />
      ) : activeView === "artist" ? (
        <ArtistPage />
      ) : activeView === "album" ? (
        <AlbumPage />
      ) : activeView === "genre" ? (
        <GenreBrowse />
      ) : activeView === "recent" ? (
        <RecentView />
      ) : activeView === "stats" ? (
        <StatsView />
      ) : activePlaylistId === "liked" ? (
        <PlaylistView
          title="Liked Songs"
          description="Songs you've liked across the app"
          cover="linear-gradient(135deg,#9333EA 0%,#10B981 100%)"
          trackIds={likedTracks.map((t) => t.id)}
        />
      ) : activePlaylist ? (
        <PlaylistView
          title={activePlaylist.title}
          description={activePlaylist.description}
          cover={activePlaylist.cover}
          trackIds={sortTrackIds(activePlaylist.trackIds)}
          editable={activePlaylist.editable}
        />
      ) : activeView === "search" ? (
        <SearchView />
      ) : activeView === "library" ? (
        <LibraryView />
      ) : (
        <HomeView />
      )}
    </div>
  );
}

// ---------- Views ----------

function HomeView() {
  const playlists = usePlayerStore((s) => s.playlists);
  const artists = usePlayerStore((s) => s.artists);
  const recentPlayed = usePlayerStore((s) => s.recentPlayed);
  const setActiveView = usePlayerStore((s) => s.setActiveView);
  const setActivePlaylist = usePlayerStore((s) => s.setActivePlaylist);
  const setActiveArtist = usePlayerStore((s) => s.setActiveArtist);
  const setActiveGenre = usePlayerStore((s) => s.setActiveGenre);
  const playPlaylist = usePlayerStore((s) => s.playPlaylist);
  const allTracks = useAllTracks();

  const recent = recentPlayed.length > 0 ? recentPlayed : allTracks.slice(0, 6).map((t) => t.id);
  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm text-zinc-400">Good evening</p>
        <h1 className="mt-1 text-3xl font-bold text-white">
          Tonight&apos;s lineup, picked for you
        </h1>
      </section>

      {/* Quick picks */}
      <section>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {playlists.slice(0, 6).map((pl) => (
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
                  setActiveView("library");
                  setActivePlaylist(pl.id);
                }
              }}
              className="group flex cursor-pointer items-center gap-3 rounded-md bg-white/[0.06] pr-3 text-left transition-colors hover:bg-white/10"
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
                aria-label={`Play ${pl.title}`}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--accent)] text-zinc-950 opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
              >
                <Play className="ml-0.5 h-4 w-4" fill="currentColor" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Genre chips */}
      <section>
        <h2 className="mb-3 text-xl font-bold text-white">Browse genres</h2>
        <div className="flex flex-wrap gap-2">
          {demoGenres.map((g) => (
            <button
              key={g.name}
              onClick={() => setActiveGenre(g.name)}
              className="rounded-full border px-4 py-1.5 text-sm font-medium text-white transition-transform hover:scale-105"
              style={{ background: g.cover }}
            >
              {g.name}
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Trending now</h2>
          <button className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white">
            Show all <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        <TrackRowGrid trackIds={allTracks.slice(0, 6).map((t) => t.id)} />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Recently played</h2>
          <button
            onClick={() => setActiveView("recent")}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white"
          >
            See all <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        <TrackRowGrid trackIds={recent.slice(0, 6)} />
      </section>

      {/* Jump back in — artists */}
      <section>
        <h2 className="mb-3 text-xl font-bold text-white">Artists you follow</h2>
        <CardRow
          items={artists.map((a) => ({
            id: a.id,
            title: a.name,
            subtitle: a.genre,
            cover: a.cover,
          }))}
          onSelect={(id) => setActiveArtist(id)}
        />
      </section>
    </div>
  );
}

function SearchView() {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"songs" | "artists" | "albums" | "playlists">("songs");
  const playlists = usePlayerStore((s) => s.playlists);
  const artists = usePlayerStore((s) => s.artists);
  const albums = usePlayerStore((s) => s.albums);
  const setActiveArtist = usePlayerStore((s) => s.setActiveArtist);
  const setActiveAlbum = usePlayerStore((s) => s.setActiveAlbum);
  const setActivePlaylist = usePlayerStore((s) => s.setActivePlaylist);
  const setActiveView = usePlayerStore((s) => s.setActiveView);
  const pushSearchHistory = usePlayerStore((s) => s.pushSearchHistory);
  const searchHistory = usePlayerStore((s) => s.searchHistory);
  const allTracks = useAllTracks();

  const lower = q.toLowerCase().trim();
  const songs = useMemo(
    () =>
      !lower
        ? []
        : allTracks.filter(
            (t) =>
              t.title.toLowerCase().includes(lower) ||
              t.artist.toLowerCase().includes(lower) ||
              t.album.toLowerCase().includes(lower) ||
              t.genre.toLowerCase().includes(lower)
          ),
    [lower, allTracks]
  );
  const matchedArtists = useMemo(
    () => (!lower ? artists : artists.filter((a) => a.name.toLowerCase().includes(lower))),
    [lower, artists]
  );
  const matchedAlbums = useMemo(
    () => (!lower ? albums : albums.filter((al) => al.title.toLowerCase().includes(lower))),
    [lower, albums]
  );
  const matchedPlaylists = useMemo(
    () => (!lower ? playlists : playlists.filter((p) => p.title.toLowerCase().includes(lower))),
    [lower, playlists]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Search</h1>
        <div className="relative mt-4 max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            autoFocus
            placeholder="Type a song, artist, album or genre…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onBlur={() => pushSearchHistory(q)}
            className="rounded-full border-white/10 bg-white/5 pl-9 text-zinc-100 placeholder:text-zinc-500"
          />
        </div>
        {/* Tabs */}
        <div className="mt-3 flex gap-2">
          {(["songs", "artists", "albums", "playlists"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold capitalize transition-colors",
                tab === t
                  ? "bg-white text-zinc-950"
                  : "bg-white/5 text-zinc-300 hover:bg-white/10"
              )}
            >
              {t}
            </button>
          ))}
        </div>
        {/* Search history chips */}
        {!q && searchHistory.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-zinc-500">Recent:</span>
            {searchHistory.map((h) => (
              <button
                key={h}
                onClick={() => setQ(h)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300 hover:bg-white/10"
              >
                {h}
              </button>
            ))}
          </div>
        )}
        {!q && (
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {["Synthwave", "Indie Folk", "Jazz", "Ambient", "Pop"].map((g) => (
              <button
                key={g}
                onClick={() => setQ(g)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-zinc-300 hover:bg-white/10"
              >
                {g}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab === "songs" &&
        (q ? (
          songs.length > 0 ? (
            <TrackTable trackIds={songs.map((t) => t.id)} />
          ) : (
            <p className="text-sm text-zinc-500">No songs found for “{q}”.</p>
          )
        ) : (
          <TrackRowGrid trackIds={allTracks.slice(0, 6).map((t) => t.id)} />
        ))}

      {tab === "artists" && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {matchedArtists.map((a) => (
            <button key={a.id} onClick={() => setActiveArtist(a.id)} className="group text-left">
              <div
                className="aspect-square w-full rounded-full shadow-lg transition-transform group-hover:scale-[1.03]"
                style={{ background: a.cover }}
              />
              <div className="mt-2 truncate text-sm font-semibold text-white">{a.name}</div>
              <div className="truncate text-xs text-zinc-400">{a.listeners} listeners</div>
            </button>
          ))}
        </div>
      )}

      {tab === "albums" && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {matchedAlbums.map((al) => (
            <button key={al.id} onClick={() => setActiveAlbum(al.id)} className="group text-left">
              <div
                className="aspect-square w-full rounded-lg shadow-lg transition-transform group-hover:scale-[1.03]"
                style={{ background: al.cover }}
              />
              <div className="mt-2 truncate text-sm font-semibold text-white">{al.title}</div>
              <div className="truncate text-xs text-zinc-400">
                {al.artistName} · {al.year}
              </div>
            </button>
          ))}
        </div>
      )}

      {tab === "playlists" && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {matchedPlaylists.map((pl) => (
            <button
              key={pl.id}
              onClick={() => {
                setActiveView("library");
                setActivePlaylist(pl.id);
              }}
              className="group text-left"
            >
              <div
                className="aspect-square w-full rounded-lg shadow-lg transition-transform group-hover:scale-[1.03]"
                style={{ background: pl.cover }}
              />
              <div className="mt-2 truncate text-sm font-semibold text-white">{pl.title}</div>
              <div className="truncate text-xs text-zinc-400">{pl.curator}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LibraryView() {
  const [tab, setTab] = useState<"playlists" | "artists" | "albums" | "local">("playlists");
  const [createOpen, setCreateOpen] = useState(false);
  const playlists = usePlayerStore((s) => s.playlists);
  const artists = usePlayerStore((s) => s.artists);
  const albums = usePlayerStore((s) => s.albums);
  const localTracks = usePlayerStore((s) => s.localTracks);
  const librarySort = usePlayerStore((s) => s.librarySort);
  const setLibrarySort = usePlayerStore((s) => s.setLibrarySort);
  const setActivePlaylist = usePlayerStore((s) => s.setActivePlaylist);
  const setActiveArtist = usePlayerStore((s) => s.setActiveArtist);
  const setActiveAlbum = usePlayerStore((s) => s.setActiveAlbum);
  const likedTracks = useLikedTracks();

  return (
    <div className="space-y-6">
      <CreatePlaylistDialog open={createOpen} onOpenChange={setCreateOpen} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Your Library</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {playlists.length} playlists · {likedTracks.length} liked songs ·{" "}
            {localTracks.length} local files
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="gap-1.5 border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
          >
            <Plus className="h-4 w-4" /> New playlist
          </Button>
          <ImportLocalButton />
          <Select value={librarySort} onValueChange={(v) => setLibrarySort(v as SortKey)}>
            <SelectTrigger className="w-[150px] border-white/10 bg-white/5 text-zinc-200">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-zinc-900 text-zinc-100">
              <SelectItem value="custom">Custom order</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="artist">Artist</SelectItem>
              <SelectItem value="duration">Duration</SelectItem>
              <SelectItem value="plays">Plays</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2">
        {(["playlists", "artists", "albums", "local"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
              tab === t ? "bg-white text-zinc-950" : "bg-white/5 text-zinc-300 hover:bg-white/10"
            )}
          >
            {t === "playlists" && <ListMusic className="h-3.5 w-3.5" />}
            {t === "artists" && <Users className="h-3.5 w-3.5" />}
            {t === "albums" && <Disc3 className="h-3.5 w-3.5" />}
            {t === "local" && <Library className="h-3.5 w-3.5" />}
            {t}
          </button>
        ))}
      </div>

      {tab === "playlists" && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <button onClick={() => setActivePlaylist("liked")} className="group text-left">
            <div className="aspect-square w-full overflow-hidden rounded-lg bg-gradient-to-br from-purple-600 to-[color:var(--accent)] shadow-lg transition-transform group-hover:scale-[1.02]">
              <div className="flex h-full items-center justify-center">
                <Heart className="h-10 w-10 text-white" fill="currentColor" />
              </div>
            </div>
            <div className="mt-2 text-sm font-semibold text-white">Liked Songs</div>
            <div className="text-xs text-zinc-400">{likedTracks.length} songs</div>
          </button>
          {playlists.map((pl) => (
            <button key={pl.id} onClick={() => setActivePlaylist(pl.id)} className="group text-left">
              <div
                className="aspect-square w-full overflow-hidden rounded-lg shadow-lg transition-transform group-hover:scale-[1.02]"
                style={{ background: pl.cover }}
              />
              <div className="mt-2 truncate text-sm font-semibold text-white">{pl.title}</div>
              <div className="truncate text-xs text-zinc-400">Playlist · {pl.curator}</div>
            </button>
          ))}
        </div>
      )}

      {tab === "artists" && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {artists.map((a) => (
            <button key={a.id} onClick={() => setActiveArtist(a.id)} className="group text-left">
              <div
                className="aspect-square w-full rounded-full shadow-lg transition-transform group-hover:scale-[1.03]"
                style={{ background: a.cover }}
              />
              <div className="mt-2 truncate text-sm font-semibold text-white">{a.name}</div>
              <div className="truncate text-xs text-zinc-400">{a.genre}</div>
            </button>
          ))}
        </div>
      )}

      {tab === "albums" && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {albums.map((al) => (
            <button key={al.id} onClick={() => setActiveAlbum(al.id)} className="group text-left">
              <div
                className="aspect-square w-full rounded-lg shadow-lg transition-transform group-hover:scale-[1.03]"
                style={{ background: al.cover }}
              />
              <div className="mt-2 truncate text-sm font-semibold text-white">{al.title}</div>
              <div className="truncate text-xs text-zinc-400">{al.artistName}</div>
            </button>
          ))}
        </div>
      )}

      {tab === "local" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <ImportLocalButton />
            <span className="text-xs text-zinc-500">
              Import audio files from your device — they stay in your browser session.
            </span>
          </div>
          {localTracks.length > 0 ? (
            <TrackTable trackIds={localTracks.map((t) => t.id)} />
          ) : (
            <p className="text-sm text-zinc-500">No local files imported yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

function PlaylistView({
  title,
  description,
  cover,
  trackIds,
  editable,
}: {
  title: string;
  description: string;
  cover: string;
  trackIds: string[];
  editable?: boolean;
}) {
  const activePlaylistId = usePlayerStore((s) => s.activePlaylistId);
  const deletePlaylist = usePlayerStore((s) => s.deletePlaylist);
  const setActivePlaylist = usePlayerStore((s) => s.setActivePlaylist);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const allTracks = useAllTracks();
  const list = trackIds
    .map((id) => allTracks.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));
  const totalSec = list.reduce((s, t) => s + t.duration, 0);
  return (
    <div className="space-y-6">
      <div className="flex items-end gap-5">
        <div className="h-44 w-44 shrink-0 rounded-lg shadow-2xl" style={{ background: cover }} />
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

      <div className="flex items-center gap-4">
        <button
          onClick={() => {
            if (list[0]) playTrack(list[0].id, list.map((t) => t.id));
          }}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--accent)] text-zinc-950 shadow-lg transition-transform hover:scale-105"
        >
          <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
        </button>
        <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
          <Heart className="h-6 w-6" />
        </Button>
        {editable && activePlaylistId && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-xs text-zinc-400 hover:text-red-400"
            onClick={() => {
              deletePlaylist(activePlaylistId);
              setActivePlaylist(null);
            }}
          >
            Delete playlist
          </Button>
        )}
      </div>

      {list.length > 0 ? (
        <TrackTable trackIds={trackIds} />
      ) : (
        <div className="rounded-lg border border-dashed border-white/10 p-8 text-center text-sm text-zinc-500">
          This playlist is empty. Use the ⋯ menu on any track row → “Add to playlist” to fill
          it up.
        </div>
      )}
    </div>
  );
}

// ---------- Right-side extras (volume etc.) ----------

/** Shared right cluster used by bottom bars / control decks. */
export function RightControls({
  onShowLyrics,
  onShowQueue,
}: {
  onShowLyrics: () => void;
  onShowQueue: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <PlaybackSpeedMenu showLabel={false} />
      <SleepTimerMenu showLabel={false} />
      <PlayerRightControls onShowLyrics={onShowLyrics} onShowQueue={onShowQueue} />
    </div>
  );
}
