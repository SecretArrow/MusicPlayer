"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Pause,
  Play,
  Shuffle,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAllTracks, usePlayerStore } from "@/store/player-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CardRow, TrackTable } from "./track-list";

function shuffleIds(ids: string[]): string[] {
  const arr = [...ids];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function ArtistPage() {
  const artist = usePlayerStore((s) =>
    s.activeArtistId
      ? s.artists.find((a) => a.id === s.activeArtistId) ?? null
      : null
  );
  const albums = usePlayerStore((s) => s.albums);
  const allTracks = useAllTracks();
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTrackId = usePlayerStore((s) => s.queue[s.currentIndex]);
  const shuffleOn = usePlayerStore((s) => s.shuffle);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const setActiveArtist = usePlayerStore((s) => s.setActiveArtist);
  const setActiveAlbum = usePlayerStore((s) => s.setActiveAlbum);
  const setActiveView = usePlayerStore((s) => s.setActiveView);
  const [following, setFollowing] = useState(false);

  // All tracks of the artist, gathered from the artist's albums (via album trackIds)
  const artistTrackIds = useMemo(() => {
    if (!artist) return [];
    const fromAlbums = artist.albumIds.flatMap(
      (albumId) => albums.find((al) => al.id === albumId)?.trackIds ?? []
    );
    if (fromAlbums.length > 0) return fromAlbums;
    // Fallback: any track tagged with this artist
    return allTracks.filter((t) => t.artistId === artist.id).map((t) => t.id);
  }, [artist, albums, allTracks]);

  const artistAlbums = useMemo(() => {
    if (!artist) return [];
    return artist.albumIds
      .map((albumId) => albums.find((al) => al.id === albumId))
      .filter((al): al is NonNullable<typeof al> => Boolean(al));
  }, [artist, albums]);

  const isArtistPlaying = Boolean(
    isPlaying && currentTrackId && artistTrackIds.includes(currentTrackId)
  );

  const goHome = () => {
    setActiveArtist(null);
    setActiveView("home");
  };

  const handlePlay = () => {
    if (artistTrackIds.length === 0) return;
    if (isArtistPlaying) {
      togglePlay();
    } else {
      playTrack(artistTrackIds[0], artistTrackIds);
    }
  };

  const handleShuffle = () => {
    if (artistTrackIds.length === 0) return;
    toggleShuffle();
    const turningOn = !shuffleOn;
    const ids = turningOn ? shuffleIds(artistTrackIds) : artistTrackIds;
    playTrack(ids[0], ids);
    toast(turningOn ? `Shuffle on — playing ${artist?.name} at random` : "Shuffle off");
  };

  const handleFollow = () => {
    const next = !following;
    setFollowing(next);
    toast(next ? `Following ${artist?.name}` : `Unfollowed ${artist?.name}`);
  };

  if (!artist) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-12 text-center">
        <User className="h-10 w-10 text-zinc-500" />
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Artist not found</h2>
          <p className="mt-1 text-sm text-zinc-400">
            This artist is not available right now. Head back home to keep exploring.
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
          style={{ background: artist.cover }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-zinc-950/40"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-end">
          <div
            className="relative h-44 w-44 shrink-0 overflow-hidden rounded-lg shadow-xl"
            style={{ background: artist.cover }}
            role="img"
            aria-label={`Cover art for ${artist.name}`}
          >
            <div className="absolute inset-x-0 bottom-0 flex justify-center bg-black/45 px-2 py-1.5 backdrop-blur-sm">
              <Badge
                variant="outline"
                className="border-white/25 bg-transparent text-[10px] uppercase tracking-widest text-white"
              >
                <BadgeCheck />
                Verified Artist
              </Badge>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-4xl font-bold tracking-tight text-white">{artist.name}</h1>
            <p className="mt-2 text-sm text-zinc-300">
              {artist.listeners} monthly listeners · {artist.genre}
            </p>
            <p className="mt-3 max-w-2xl text-sm text-zinc-400">{artist.bio}</p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                onClick={handlePlay}
                aria-label={isArtistPlaying ? `Pause ${artist.name}` : `Play ${artist.name}`}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--accent)] text-zinc-950 shadow-lg transition-transform hover:scale-105"
              >
                {isArtistPlaying ? (
                  <Pause className="h-5 w-5" fill="currentColor" />
                ) : (
                  <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
                )}
              </button>
              <Button
                variant="outline"
                onClick={handleFollow}
                aria-pressed={following}
                className={cn(
                  "border-white/20 bg-black/30 text-zinc-100 hover:bg-white/10 hover:text-white",
                  following && "border-[color:var(--accent)] text-[color:var(--accent)]"
                )}
              >
                {following ? "Following" : "Follow"}
              </Button>
              <Button
                variant="outline"
                onClick={handleShuffle}
                aria-pressed={shuffleOn}
                className={cn(
                  "border-white/20 bg-black/30 text-zinc-100 hover:bg-white/10 hover:text-white",
                  shuffleOn && "border-[color:var(--accent)] text-[color:var(--accent)]"
                )}
              >
                <Shuffle className="h-4 w-4" /> Shuffle
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Albums */}
      {artistAlbums.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-bold text-white">Albums</h2>
          <CardRow
            items={artistAlbums.map((al) => ({
              id: al.id,
              title: al.title,
              subtitle: `${al.year} · ${al.trackIds.length} songs`,
              cover: al.cover,
            }))}
            onSelect={(id) => setActiveAlbum(id)}
          />
        </section>
      )}

      {/* Popular */}
      {artistTrackIds.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-bold text-white">Popular</h2>
          <TrackTable trackIds={artistTrackIds} />
        </section>
      )}
    </div>
  );
}
