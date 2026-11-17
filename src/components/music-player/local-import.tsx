"use client";

import { useRef, useState } from "react";
import { FolderUp, FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePlayerStore } from "@/store/player-store";
import { importFiles, importFolder, extractFolderEntries } from "@/lib/library-importer";
import type { Track, Playlist } from "@/data/music";

interface Props {
  className?: string;
  /** "full" renders both Files + Folder buttons; "compact" renders just Files. */
  variant?: "full" | "compact";
  /** Optional callback after import completes — used by empty states to navigate. */
  onImported?: (result: { trackCount: number; playlistCount: number }) => void;
}

interface ImportResult {
  tracks: Track[];
  playlists: Playlist[];
  skipped: number;
  folderPlaylists: string[];
}

/**
 * Real audio library importer. Two entry points:
 *   • Files (multiple)    → flat library entries, no auto playlist
 *   • Folder (recursive)  → one playlist per top-level folder
 *
 * Both read real metadata (title/artist/album/genre/year/duration/artwork)
 * from the file bytes and persist the File blob to IndexedDB so playback
 * survives reloads.
 */
export function ImportLocalButton({ className, variant = "full", onImported }: Props) {
  const filesInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const addLocalTracks = usePlayerStore((s) => s.addLocalTracks);
  const playlists = usePlayerStore((s) => s.playlists);
  const setPlaylists = usePlayerStore((s) => s.setPlaylists);

  const finish = (result: ImportResult) => {
    if (result.tracks.length === 0) {
      toast.error("No audio files were imported", {
        description: result.skipped > 0 ? `${result.skipped} non-audio file(s) skipped.` : undefined,
      });
      return;
    }
    addLocalTracks(result.tracks);
    if (result.playlists.length > 0) {
      setPlaylists([...result.playlists, ...playlists]);
    }
    const parts: string[] = [`${result.tracks.length} track${result.tracks.length === 1 ? "" : "s"}`];
    if (result.folderPlaylists.length > 0) {
      parts.push(`${result.folderPlaylists.length} playlist${result.folderPlaylists.length === 1 ? "" : "s"}`);
    }
    toast.success(`Imported ${parts.join(" · ")}`, {
      description:
        result.folderPlaylists.length > 0
          ? `Playlists: ${result.folderPlaylists.slice(0, 3).join(", ")}${result.folderPlaylists.length > 3 ? "…" : ""}`
          : "Saved to your library — persists across reloads.",
    });
    onImported?.({ trackCount: result.tracks.length, playlistCount: result.playlists.length });
  };

  const handleFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setBusy(true);
    try {
      const files = Array.from(list);
      const result = await importFiles(files);
      finish(result);
    } catch (err) {
      console.error(err);
      toast.error("Import failed", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setBusy(false);
      if (filesInputRef.current) filesInputRef.current.value = "";
    }
  };

  const handleFolder = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setBusy(true);
    try {
      const entries = extractFolderEntries(list);
      const result = await importFolder(entries);
      finish(result);
    } catch (err) {
      console.error(err);
      toast.error("Folder import failed", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setBusy(false);
      if (folderInputRef.current) folderInputRef.current.value = "";
    }
  };

  const spinner = busy ? <Loader2 className="size-4 animate-spin" /> : null;

  if (variant === "compact") {
    return (
      <>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => filesInputRef.current?.click()}
          className={cn(
            "border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10 hover:text-zinc-100",
            className
          )}
        >
          {spinner ?? <FileUp className="size-4" />}
          Import
        </Button>
        <input
          ref={filesInputRef}
          type="file"
          multiple
          accept="audio/*"
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={() => filesInputRef.current?.click()}
        className="border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10 hover:text-zinc-100"
      >
        {spinner ?? <FileUp className="size-4" />}
        Files
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={() => folderInputRef.current?.click()}
        className="border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10 hover:text-zinc-100"
      >
        {spinner ?? <FolderUp className="size-4" />}
        Folder
      </Button>
      <input
        ref={filesInputRef}
        type="file"
        multiple
        accept="audio/*"
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is non-standard but widely supported
        webkitdirectory=""
        directory=""
        multiple
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => handleFolder(e.target.files)}
      />
    </div>
  );
}
