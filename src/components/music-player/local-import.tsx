"use client";

import { useRef } from "react";
import { FolderUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePlayerStore } from "@/store/player-store";
import type { Track } from "@/data/music";

// Rotating palette of 6 gradients; accent approximates each gradient midpoint.
const IMPORT_COVERS: { cover: string; accent: string }[] = [
  {
    cover: "linear-gradient(135deg,#7C3AED 0%,#DB2777 100%)",
    accent: "#AC31B2",
  },
  {
    cover: "linear-gradient(135deg,#10B981 0%,#06B6D4 100%)",
    accent: "#0BB8AB",
  },
  {
    cover: "linear-gradient(135deg,#F59E0B 0%,#EF4444 100%)",
    accent: "#F27128",
  },
  {
    cover: "linear-gradient(135deg,#06B6D4 0%,#3B82F6 100%)",
    accent: "#219CE5",
  },
  {
    cover: "linear-gradient(135deg,#EAB308 0%,#F97316 100%)",
    accent: "#F2930F",
  },
  {
    cover: "linear-gradient(135deg,#EC4899 0%,#8B5CF6 100%)",
    accent: "#BC52C8",
  },
];

export function ImportLocalButton({ className }: { className?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const addLocalTracks = usePlayerStore((s) => s.addLocalTracks);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const year = new Date().getFullYear();
    const tracks: Track[] = Array.from(files).map((file, index) => {
      const palette = IMPORT_COVERS[index % IMPORT_COVERS.length];
      return {
        id: `loc-${Date.now()}-${index}`,
        title: file.name.replace(/\.[^.]+$/, ""),
        artist: "Local files",
        artistId: "local",
        album: "My Imports",
        albumId: "local-imports",
        genre: "Local",
        year,
        duration: 0,
        src: URL.createObjectURL(file),
        cover: palette.cover,
        accent: palette.accent,
        plays: "—",
      };
    });
    addLocalTracks(tracks);
    toast(`Imported ${tracks.length} file(s)`);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        className={cn(
          "border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10 hover:text-zinc-100",
          className
        )}
      >
        <FolderUp className="size-4" />
        Import files
      </Button>
      <input
        ref={inputRef}
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
