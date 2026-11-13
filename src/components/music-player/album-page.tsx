"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Disc3, Heart, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAllTracks, usePlayerStore } from "@/store/player-store";
import { Button } from "@/components/ui/button";
import { TrackTable } from "./track-list";

export function AlbumPage() {
  const album = usePlayerStore((s) =>
    s.activeAlbumId
      ? s.albums.find((a) => a.id === s.activeAlbumId) ?? null
      : null
  );
  const allTracks = useAllTracks();
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTrackId = usePlayerStore((s) => s.queue[s.currentIndex]);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const setActiveAlbum = usePlayerStore((s) => s.setActiveAlbum);
  const setActiveArtist = usePlayerStore((s) => s.setActiveArtist);
  const setActiveView = usePlayerStore((s) => s.setActiveView);
  const [albumLiked, setAlbumLiked] = useState(false);

  const albumTracks = useMemo(() => {
    if (!album) return [];
    return album.trackIds
      .map((id) => allTracks.find((t) => t.id === id))
      .filter((t): t is NonNullable<typeof t> => Boolean(t));
  }, [album, allTracks]);

  const albumTrackIds = albumTracks.map((t) => t.id);
  const totalMinutes = Math.round(
    albumTracks.reduce((sum, t) => sum + t.duration, 0) / 60
  );
  const isAlbumPlaying = Boolean(
    isPlaying && currentTrackId && albumTrackIds.includes(currentTrackId)
  );

  const goHome = () => {
    setActiveAlbum(null);
    setActiveView("home");
  };

  const handlePlay = () => {
    if (albumTrackIds.length === 0) return;
    if (isAlbumPlaying) {
      togglePlay();
    } else {
      playTrack(albumTrackIds[0], albumTrackIds);
    }
  };

  const handleLikeAlbum = () => {
    const next = !albumLiked;
    setAlbumLiked(next);
    if (album) {
      toast(
        next
          ? `Saved “${album.title}” to your library`
          : `Removed “${album.title}” from your library`
      );
    }
  };

  if (!album) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-12 text-center">
        <Disc3 className="h-10 w-10 text-zinc-500" />
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Album not found</h2>
          <p className="mt-1 text-sm text-zinc-400">
            This album is not available right now. Head back home to keep exploring.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={goHome}
          className="border-white/15 bg-transparent text-zinc-100 hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="icon"
        onClick={goHome}
        aria-label="Back to home"
        className="text-zinc-400 hover:bg-white/10 hover:text-white"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>

      {/* Hero header */}
      <section className="relative overflow-hidden rounded-lg border border-white/10">
        <div
          className="absolute inset-0 opacity-40"
          style={{ background: album.cover }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-zinc-950/40"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-end">
          <div
            className="h-44 w-44 shrink-0 rounded-lg shadow-xl"
            style={{ background: album.cover }}
            role="img"
            aria-label={`Cover art for ${album.title}`}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-300">
              Album
            </p>
            <h1 className="mt-1 text-4xl font-bold tracking-tight text-white">
              {album.title}
            </h1>
            <p className="mt-2 text-sm text-zinc-300">
              <button
                onClick={() => setActiveArtist(album.artistId)}
                className="font-semibold text-zinc-100 hover:underline"
              >
                {album.artistName}
              </button>
              <span className="mx-1.5 text-zinc-500">·</span>
              <span>{album.year}</span>
              <span className="mx-1.5 text-zinc-500">·</span>
              <span>
                {albumTrackIds.length}{" "}
                {albumTrackIds.length === 1 ? "song" : "songs"}, {totalMinutes} min
              </span>
            </p>
            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={handlePlay}
                aria-label={isAlbumPlaying ? `Pause ${album.title}` : `Play ${album.title}`}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--accent)] text-zinc-950 shadow-lg transition-transform hover:scale-105"
              >
                {isAlbumPlaying ? (
                  <Pause className="h-5 w-5" fill="currentColor" />
                ) : (
                  <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
                )}
              </button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLikeAlbum}
                aria-label={
                  albumLiked
                    ? `Remove ${album.title} from your library`
                    : `Save ${album.title} to your library`
                }
                aria-pressed={albumLiked}
                className={cn(
                  "text-zinc-300 hover:bg-white/10 hover:text-white",
                  albumLiked && "text-[color:var(--accent)]"
                )}
              >
                <Heart className={cn("h-5 w-5", albumLiked && "fill-current")} />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Track list */}
      <TrackTable trackIds={albumTrackIds} showAlbum={false} />
    </div>
  );
}
