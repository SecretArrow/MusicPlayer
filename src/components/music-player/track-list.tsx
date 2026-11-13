"use client";

import { useMemo } from "react";
import {
  Play,
  Pause,
  Heart,
  Clock,
  TrendingUp,
  MoreHorizontal,
  ListStart,
  ListEnd,
  ListPlus,
  Plus,
  Share2,
  Mic2,
  Disc3,
  User,
  ListMusic,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  usePlayerStore,
  useAllTracks,
  formatTime,
} from "@/store/player-store";
import { toast } from "sonner";
import { CoverArt } from "./cover-art";

interface TrackListProps {
  trackIds: string[];
  accent?: string;
  showAlbum?: boolean;
  compact?: boolean;
  startIndexOffset?: number;
}

/** Shared full table of tracks with context menu + artist/album navigation. */
export function TrackTable({ trackIds, showAlbum = true, compact = false }: TrackListProps) {
  const tracks = useAllTracks();
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const toggleLike = usePlayerStore((s) => s.toggleLike);
  const likedTrackIds = usePlayerStore((s) => s.likedTrackIds);
  const playlists = usePlayerStore((s) => s.playlists);
  const addToPlaylist = usePlayerStore((s) => s.addToPlaylist);
  const createPlaylist = usePlayerStore((s) => s.createPlaylist);
  const playNext = usePlayerStore((s) => s.playNext);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const setActiveArtist = usePlayerStore((s) => s.setActiveArtist);
  const setActiveAlbum = usePlayerStore((s) => s.setActiveAlbum);
  const setShareTrack = usePlayerStore((s) => s.setShareTrack);

  const list = useMemo(
    () =>
      trackIds
        .map((id) => tracks.find((t) => t.id === id))
        .filter((t): t is NonNullable<typeof t> => Boolean(t)),
    [trackIds, tracks]
  );

  const rowMenu = (trackId: string, artistId: string, albumId: string) => (
    <DropdownMenuContent align="end" className="w-52 border-white/10 bg-zinc-900 text-zinc-100">
      <DropdownMenuItem onClick={() => playTrack(trackId, list.map((t) => t.id))}>
        <Play className="h-4 w-4" /> Play now
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => { playNext(trackId); toast("Playing next"); }}>
        <ListStart className="h-4 w-4" /> Play next
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => { addToQueue(trackId); toast("Added to queue"); }}>
        <ListEnd className="h-4 w-4" /> Add to queue
      </DropdownMenuItem>
      <DropdownMenuSeparator className="bg-white/10" />
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <Plus className="h-4 w-4" /> Add to playlist
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="border-white/10 bg-zinc-900 text-zinc-100">
          {playlists.map((pl) => (
            <DropdownMenuItem
              key={pl.id}
              onClick={() => {
                addToPlaylist(pl.id, trackId);
                toast(`Added to “${pl.title}”`);
              }}
            >
              <ListMusic className="h-4 w-4" /> {pl.title}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuItem
            onClick={() => {
              const id = createPlaylist(
                `My Playlist #${playlists.filter((p) => p.editable).length + 1}`
              );
              addToPlaylist(id, trackId);
              toast("Playlist created & track added");
            }}
          >
            <Plus className="h-4 w-4" /> New playlist
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuItem onClick={() => toggleLike(trackId)}>
        <Heart className={cn("h-4 w-4", likedTrackIds.has(trackId) && "fill-current text-[color:var(--accent)]")} />
        {likedTrackIds.has(trackId) ? "Remove from Liked" : "Save to Liked"}
      </DropdownMenuItem>
      <DropdownMenuSeparator className="bg-white/10" />
      <DropdownMenuItem onClick={() => setShareTrack(trackId)}>
        <Share2 className="h-4 w-4" /> Share
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setActiveArtist(artistId)}>
        <User className="h-4 w-4" /> Go to artist
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setActiveAlbum(albumId)}>
        <Disc3 className="h-4 w-4" /> Go to album
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  return (
    <div className="overflow-hidden rounded-md border border-white/5">
      {/* Header row */}
      <div
        className={cn(
          "grid items-center gap-3 border-b border-white/5 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500",
          showAlbum ? "grid-cols-[24px_1fr_1fr_60px_70px]" : "grid-cols-[24px_1fr_60px_70px]"
        )}
      >
        <span>#</span>
        <span>Title</span>
        {showAlbum && <span className="hidden sm:block">Album</span>}
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
            key={`${t.id}-${i}`}
            onDoubleClick={() => playTrack(t.id, list.map((x) => x.id))}
            className={cn(
              "group relative grid cursor-pointer items-center gap-3 px-4 py-2 transition-colors hover:bg-white/[0.05]",
              isActive && "bg-white/[0.05]",
              showAlbum ? "grid-cols-[24px_1fr_1fr_60px_70px]" : "grid-cols-[24px_1fr_60px_70px]"
            )}
          >
            {/* Click target: single-click on the title zone plays; the rest via buttons */}
            <div
              className="absolute inset-0"
              onClick={() => playTrack(t.id, list.map((x) => x.id))}
            />
            <div className="relative flex items-center justify-center text-xs text-zinc-500">
              {isActive && isPlaying ? (
                <button
                  onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                  className="text-[color:var(--accent)]"
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
            <div className="relative flex min-w-0 items-center gap-3">
              <div
                className="h-9 w-9 shrink-0 rounded"
                style={{ background: t.cover }}
              />
              <div className="min-w-0">
                <div
                  className={cn(
                    "truncate text-sm font-medium",
                    isActive ? "text-[color:var(--accent)]" : "text-white"
                  )}
                >
                  {t.title}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setActiveArtist(t.artistId); }}
                  className="max-w-full truncate text-xs text-zinc-400 hover:text-white hover:underline"
                >
                  {t.artist}
                </button>
              </div>
            </div>
            {showAlbum && (
              <button
                onClick={(e) => { e.stopPropagation(); setActiveAlbum(t.albumId); }}
                className="relative hidden truncate text-sm text-zinc-400 hover:text-white hover:underline sm:block"
              >
                {t.album}
              </button>
            )}
            <div className="relative hidden text-xs tabular-nums text-zinc-500 sm:block">
              {formatTime(t.duration)}
            </div>
            <div className="relative flex items-center justify-end gap-1.5 text-xs text-zinc-500">
              <button
                onClick={(e) => { e.stopPropagation(); toggleLike(t.id); }}
                className={cn(
                  "transition-opacity",
                  isLiked
                    ? "text-[color:var(--accent)] opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                )}
              >
                <Heart className={cn("h-3.5 w-3.5", isLiked && "fill-current")} />
              </button>
              <span className="hidden tabular-nums md:inline">{t.plays}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
                    aria-label={`More actions for ${t.title}`}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                {rowMenu(t.id, t.artistId, t.albumId)}
              </DropdownMenu>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Grid of track cards. */
export function TrackRowGrid({ trackIds }: { trackIds: string[] }) {
  const tracks = useAllTracks();
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const playTrack = usePlayerStore((s) => s.playTrack);

  const list = useMemo(
    () =>
      trackIds
        .map((id) => tracks.find((t) => t.id === id))
        .filter((t): t is NonNullable<typeof t> => Boolean(t)),
    [trackIds, tracks]
  );

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
                  "absolute bottom-1.5 right-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--accent)] text-zinc-950 shadow-lg transition-opacity",
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

/** Horizontal scrollable card row (playlists/albums/artists). */
export function CardRow({
  items,
  onSelect,
}: {
  items: { id: string; title: string; subtitle: string; cover: string }[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => onSelect(it.id)}
          className="group w-36 shrink-0 text-left sm:w-40"
        >
          <div
            className="aspect-square w-full overflow-hidden rounded-lg shadow-lg transition-transform group-hover:scale-[1.03]"
            style={{ background: it.cover }}
          />
          <div className="mt-2 truncate text-sm font-semibold text-white">{it.title}</div>
          <div className="truncate text-xs text-zinc-400">{it.subtitle}</div>
        </button>
      ))}
    </div>
  );
}
