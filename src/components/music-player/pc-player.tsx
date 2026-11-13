"use client";

/**
 * CLASSIC layout — the reference theme shape (Midnight / Monochrome / Daylight).
 * Sidebar navigation on the left, main content in the middle, player bar at
 * the bottom. Content views come from the shared module so every theme
 * variant stays behaviour-identical.
 */

import { useState } from "react";
import {
  Home,
  Search,
  Library,
  Plus,
  Heart,
  History,
  AudioLines,
  ChartBar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  usePlayerStore,
  useCurrentTrack,
} from "@/store/player-store";
import { CoverArt } from "./cover-art";
import { PlayerControls } from "./player-controls";
import { CreatePlaylistDialog } from "./playlist-dialogs";
import { NowPlayingOverlay } from "./now-playing-overlay";
import {
  MainContent,
  ToolbarActions,
  EqPanelBody,
  RightControls,
  useLikedTracks,
} from "./layouts/shared";

const navItems: { id: "home" | "search" | "library" | "recent" | "genre" | "stats"; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "search", label: "Search", icon: Search },
  { id: "library", label: "Your Library", icon: Library },
  { id: "recent", label: "Recently Played", icon: History },
  { id: "genre", label: "Genres", icon: AudioLines },
  { id: "stats", label: "Listening Stats", icon: ChartBar },
];

export function PcPlayer() {
  const activeView = usePlayerStore((s) => s.activeView);
  const setActiveView = usePlayerStore((s) => s.setActiveView);
  const playlists = usePlayerStore((s) => s.playlists);
  const activePlaylistId = usePlayerStore((s) => s.activePlaylistId);
  const setActivePlaylist = usePlayerStore((s) => s.setActivePlaylist);
  const setActiveArtist = usePlayerStore((s) => s.setActiveArtist);
  const setActiveGenre = usePlayerStore((s) => s.setActiveGenre);
  const track = useCurrentTrack();
  const likedTracks = useLikedTracks();

  const [eqOpen, setEqOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex h-full w-full flex-col gap-2 bg-zinc-950 p-2 text-zinc-100">
      {/* Fullscreen overlay + shared dialogs are rendered here for PC scope */}
      <NowPlayingOverlay />

      <div className="flex min-h-0 flex-1 gap-2">
        {/* Sidebar */}
        <aside className="hidden w-60 shrink-0 flex-col gap-2 sm:flex">
          <div className="rounded-lg bg-zinc-900 p-3">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Button
                  key={item.id}
                  variant="ghost"
                  onClick={() => {
                    setActiveView(item.id);
                    if (item.id === "genre") setActiveGenre(null);
                    if (item.id !== "library") setActivePlaylist(null);
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
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-zinc-400"
                  onClick={() => setCreateOpen(true)}
                  title="Create playlist"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <ScrollArea className="flex-1 px-2">
              <div className="flex flex-col gap-1 pb-3">
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
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gradient-to-br from-purple-600 to-[color:var(--accent)]">
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
          {/* Toolbar */}
          <div className="flex items-center gap-2 px-4 py-3">
            <div className="relative min-w-0 flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                placeholder="Search songs, artists, albums…"
                className="rounded-full border-white/10 bg-white/5 pl-9 text-zinc-100 placeholder:text-zinc-500"
                onFocus={() => setActiveView("search")}
              />
            </div>
            <div className="ml-auto flex items-center">
              <ToolbarActions eqOpen={eqOpen} onToggleEq={() => setEqOpen(!eqOpen)} />
            </div>
          </div>

          {/* Scrollable main area */}
          <ScrollArea className="flex-1">
            <MainContent />
          </ScrollArea>
        </main>

        {/* EQ side panel */}
        {eqOpen && (
          <aside className="hidden w-80 shrink-0 flex-col overflow-hidden rounded-lg bg-zinc-900 md:flex">
            <EqPanelBody onClose={() => setEqOpen(false)} />
          </aside>
        )}
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
                <button
                  onClick={() => setActiveArtist(track.artistId)}
                  className="max-w-full truncate text-xs text-zinc-400 hover:text-white hover:underline"
                >
                  {track.artist}
                </button>
              </div>
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

        {/* Right: extras + volume */}
        <div className="hidden w-[30%] justify-end md:flex">
          <RightControls
            onShowLyrics={() => setActiveView("lyrics")}
            onShowQueue={() => setActiveView("queue")}
          />
        </div>
      </footer>

      <CreatePlaylistDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
