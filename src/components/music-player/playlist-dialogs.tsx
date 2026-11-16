"use client";

import { useMemo, useState } from "react";
import { Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { usePlayerStore } from "@/store/player-store";
import type { Playlist, Track } from "@/data/music";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const scrollbarClasses =
  "[scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.12)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb:hover]:bg-white/20";

const inputClasses =
  "border-white/10 bg-white/[0.03] text-zinc-100 placeholder:text-zinc-500 dark:bg-white/[0.03]";

// ---------- Create playlist ----------

export function CreatePlaylistDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const createPlaylist = usePlayerStore((s) => s.createPlaylist);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setName("");
      setDescription("");
    }
    onOpenChange(v);
  };

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    createPlaylist(trimmed, description.trim() || undefined);
    toast(`Created “${trimmed}”`);
    setName("");
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border-white/10 bg-zinc-950 text-zinc-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Create playlist</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Give your new playlist a name. You can add tracks later.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            value={name}
            autoFocus
            placeholder="Playlist name"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreate();
              }
            }}
            className={inputClasses}
            aria-label="Playlist name"
          />
          <Input
            value={description}
            placeholder="Description (optional)"
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreate();
              }
            }}
            className={inputClasses}
            aria-label="Playlist description"
          />
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            className="text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="gap-1.5 bg-[color:var(--accent)] text-white hover:bg-[color:var(--accent)] hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Add to playlist ----------

export function AddToPlaylistDialog({
  open,
  onOpenChange,
  trackId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  trackId: string | null;
}) {
  const playlists = usePlayerStore((s) => s.playlists);
  const tracks = usePlayerStore((s) => s.tracks);
  const localTracks = usePlayerStore((s) => s.localTracks);
  const addToPlaylist = usePlayerStore((s) => s.addToPlaylist);
  const removeFromPlaylist = usePlayerStore((s) => s.removeFromPlaylist);
  const createPlaylist = usePlayerStore((s) => s.createPlaylist);
  const [newName, setNewName] = useState("");

  const track: Track | null = useMemo(() => {
    if (!trackId) return null;
    return (
      tracks.find((t) => t.id === trackId) ??
      localTracks.find((t) => t.id === trackId) ??
      null
    );
  }, [trackId, tracks, localTracks]);

  const handleOpenChange = (v: boolean) => {
    if (!v) setNewName("");
    onOpenChange(v);
  };

  // Guard: no track selected → dialog with empty content (accessible labels only)
  if (!trackId) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="border-white/10 bg-zinc-950 sm:max-w-md">
          <DialogTitle className="sr-only">Add to playlist</DialogTitle>
          <DialogDescription className="sr-only">
            No track selected.
          </DialogDescription>
        </DialogContent>
      </Dialog>
    );
  }

  const selectedTrackId: string = trackId;

  const addTrack = (pl: Playlist) => {
    addToPlaylist(pl.id, selectedTrackId);
    toast(`Added to “${pl.title}”`);
  };

  const removeTrack = (pl: Playlist) => {
    removeFromPlaylist(pl.id, selectedTrackId);
    toast(`Removed from “${pl.title}”`);
  };

  const handleCreateAndAdd = () => {
    const name = newName.trim();
    if (!name) return;
    const id = createPlaylist(name);
    addToPlaylist(id, selectedTrackId);
    toast(`Created “${name}” and added the track`);
    setNewName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border-white/10 bg-zinc-950 text-zinc-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Add to playlist</DialogTitle>
          <DialogDescription className="text-zinc-400">
            {track
              ? `Adding “${track.title}” — pick a playlist below.`
              : "Pick a playlist below."}
          </DialogDescription>
        </DialogHeader>

        {/* Playlist list */}
        <div
          className={cn(
            "max-h-80 space-y-1 overflow-y-auto pr-1",
            scrollbarClasses
          )}
        >
          {playlists.length === 0 && (
            <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-4 text-sm text-zinc-500">
              No playlists yet. Create one below.
            </p>
          )}
          {playlists.map((pl) => {
            const inList = pl.trackIds.includes(selectedTrackId);
            return (
              <div
                key={pl.id}
                className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-2 transition-colors hover:bg-white/[0.06]"
              >
                <div
                  aria-hidden="true"
                  className="h-10 w-10 shrink-0 rounded-md border border-white/10 shadow-md"
                  style={{ background: pl.cover }}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-zinc-100">
                    {pl.title}
                  </div>
                  <div className="truncate text-xs text-zinc-400">
                    {pl.curator} · {pl.trackIds.length}{" "}
                    {pl.trackIds.length === 1 ? "track" : "tracks"}
                  </div>
                </div>
                {inList ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTrack(pl)}
                    className="h-8 shrink-0 gap-1.5 px-2 text-xs text-[color:var(--accent)] hover:bg-white/[0.06] hover:text-[color:var(--accent)]"
                  >
                    <Check className="h-3.5 w-3.5" />
                    In playlist
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => addTrack(pl)}
                    className="h-8 shrink-0 gap-1.5 px-2 text-xs text-zinc-300 hover:bg-white/[0.06] hover:text-zinc-100"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* New playlist */}
        <div className="border-t border-white/10 pt-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            New playlist
          </div>
          <div className="flex gap-2">
            <Input
              value={newName}
              placeholder="New playlist name"
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreateAndAdd();
                }
              }}
              className={inputClasses}
              aria-label="New playlist name"
            />
            <Button
              size="sm"
              onClick={handleCreateAndAdd}
              disabled={!newName.trim()}
              className="h-9 shrink-0 gap-1.5 bg-[color:var(--accent)] text-white hover:bg-[color:var(--accent)] hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" />
              Create &amp; add
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
