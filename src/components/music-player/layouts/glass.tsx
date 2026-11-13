"use client";

/**
 * AURORA theme — "Glass Deck" layout.
 *
 * Frosted floating panels over an ambient aurora glow: a pill-shaped top
 * navigation bar, a hero now-playing strip, a scrollable main deck, and a
 * floating bottom control pill. All views come from the shared module so
 * behaviour stays identical across theme variants.
 */

import { useState } from "react";
import {
  AudioLines,
  ChartBar,
  History,
  Home,
  Library,
  Music2,
  Pause,
  Play,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlayerStore, useCurrentTrack } from "@/store/player-store";
import { CoverArt } from "../cover-art";
import { PlayerControls } from "../player-controls";
import { CreatePlaylistDialog } from "../playlist-dialogs";
import { NowPlayingOverlay } from "../now-playing-overlay";
import {
  MainContent,
  ToolbarActions,
  EqPanelBody,
  RightControls,
  MaximizeButton,
} from "./shared";

type NavId = "home" | "search" | "library" | "recent" | "genre" | "stats";

const navItems: { id: NavId; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "search", label: "Search", icon: Search },
  { id: "library", label: "Library", icon: Library },
  { id: "recent", label: "Recent", icon: History },
  { id: "genre", label: "Genres", icon: AudioLines },
  { id: "stats", label: "Stats", icon: ChartBar },
];

/** Signature Aurora detail — a soft accent glow on active controls. */
const ACCENT_GLOW =
  "0 0 24px color-mix(in srgb, var(--accent) 35%, transparent)";

export function GlassLayout() {
  const activeView = usePlayerStore((s) => s.activeView);
  const activePlaylistId = usePlayerStore((s) => s.activePlaylistId);
  const setActiveView = usePlayerStore((s) => s.setActiveView);
  const setActiveGenre = usePlayerStore((s) => s.setActiveGenre);
  const setActivePlaylist = usePlayerStore((s) => s.setActivePlaylist);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const track = useCurrentTrack();

  const [eqOpen, setEqOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const showLyrics = () => setActiveView("lyrics");
  const showQueue = () => setActiveView("queue");

  const handleNav = (id: NavId) => {
    setActiveView(id);
    if (id === "genre") setActiveGenre(null);
    if (id !== "library") setActivePlaylist(null);
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Ambient aurora glow — decorative blobs behind everything */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full opacity-15 blur-3xl"
        style={{ background: "var(--accent)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-[-6rem] h-80 w-80 rounded-full opacity-15 blur-3xl"
        style={{ background: "var(--accent)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 bottom-[-8rem] h-96 w-96 rounded-full opacity-15 blur-3xl"
        style={{ background: "var(--accent)" }}
      />
      {/* Subtle top glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-white/5 to-transparent"
      />

      <NowPlayingOverlay />
      <CreatePlaylistDialog open={createOpen} onOpenChange={setCreateOpen} />

      <div className="relative z-10 flex h-full min-h-0 flex-col">
        {/* Top navigation pill bar */}
        <header className="mx-4 mt-3 flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 backdrop-blur-xl">
          {/* Brand */}
          <div className="flex shrink-0 items-center gap-2">
            <Sparkles
              className="h-5 w-5"
              style={{ color: "var(--accent)" }}
              aria-hidden="true"
            />
            <span className="font-semibold tracking-wide text-white">Aurora</span>
          </div>

          {/* Segmented nav pill group */}
          <nav
            className="hidden min-w-0 flex-1 items-center justify-center md:flex"
            aria-label="Primary"
          >
            <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1">
              {navItems.map((item) => {
                const active = activeView === item.id && !activePlaylistId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNav(item.id)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                      active
                        ? "bg-[color:var(--accent)] text-zinc-950"
                        : "text-zinc-300 hover:bg-white/10"
                    )}
                    style={active ? { boxShadow: ACCENT_GLOW } : undefined}
                  >
                    <item.icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Shared toolbar (EQ toggle, theme, settings…) */}
          <div className="ml-auto flex items-center">
            <ToolbarActions
              eqOpen={eqOpen}
              onToggleEq={() => setEqOpen((v) => !v)}
            />
          </div>
        </header>

        {/* Hero now-playing strip */}
        <section
          className="mx-4 mt-3 flex shrink-0 items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl"
          aria-label="Now playing"
        >
          {track ? (
            <CoverArt
              cover={track.cover}
              accent={track.accent}
              title={track.title}
              size="lg"
              rounded="rounded-xl"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]"
            >
              <Music2 className="h-6 w-6 text-zinc-500" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-semibold text-white">
              {track ? track.title : "Nothing playing yet — pick something below"}
            </div>
            {track && (
              <div className="truncate text-sm text-zinc-400">
                {track.artist} · {track.album}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
              title={isPlaying ? "Pause" : "Play"}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--accent)] text-zinc-950 transition-transform hover:scale-105"
              style={{ boxShadow: ACCENT_GLOW }}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" fill="currentColor" aria-hidden="true" />
              ) : (
                <Play className="ml-0.5 h-5 w-5" fill="currentColor" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              aria-label="Create playlist"
              title="Create playlist"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
            <MaximizeButton />
          </div>
        </section>

        {/* Main deck — scrollable, extra bottom padding keeps it clear of the pill */}
        <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-40 pt-2">
          <div className="mx-auto max-w-5xl">
            <MainContent />
          </div>
        </main>
      </div>

      {/* Floating equalizer panel */}
      {eqOpen && (
        <aside
          className="absolute bottom-28 right-4 top-24 z-30 w-80 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/90 backdrop-blur-xl"
          aria-label="Equalizer"
        >
          <EqPanelBody onClose={() => setEqOpen(false)} />
        </aside>
      )}

      {/* Bottom floating control pill */}
      <footer className="absolute bottom-4 left-1/2 z-20 w-[min(94vw,760px)] -translate-x-1/2 rounded-3xl border border-white/10 bg-white/[0.06] px-6 py-3 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <PlayerControls
              variant="pc"
              onShowLyrics={showLyrics}
              onShowQueue={showQueue}
            />
          </div>
          <div className="hidden shrink-0 lg:flex">
            <RightControls onShowLyrics={showLyrics} onShowQueue={showQueue} />
          </div>
        </div>
      </footer>
    </div>
  );
}
