"use client";

// Real library importer.
//
// Three import modes are supported by the UI:
//   1. Single file (audio/*)
//   2. Multiple files (audio/*, multiple)
//   3. Folder (webkitdirectory) — every folder becomes its own playlist
//
// For each File:
//   - parse real metadata (title/artist/album/genre/year/trackNo/duration/cover)
//   - store File + metadata in IndexedDB so it survives reloads
//   - mint an object URL cached in memory for the audio element
//
// Return value is consumed by the caller (Toolbar / Empty State) to update
// the Zustand store with the freshly-parsed Track[] and any auto-created
// Playlist[].

import { parseAudioMetadata, type TrackMetadata } from "@/lib/audio-metadata";
import {
  bulkPutFiles,
  putPlaylist,
  primeUrlCache,
  type StoredFile,
  type StoredPlaylist,
} from "@/lib/library-db";
import type { Track, Playlist } from "@/data/music";

const COVER_PALETTES = [
  { cover: "linear-gradient(135deg,#7C3AED 0%,#DB2777 100%)", accent: "#AC31B2" },
  { cover: "linear-gradient(135deg,#10B981 0%,#06B6D4 100%)", accent: "#0BB8AB" },
  { cover: "linear-gradient(135deg,#F59E0B 0%,#EF4444 100%)", accent: "#F27128" },
  { cover: "linear-gradient(135deg,#06B6D4 0%,#3B82F6 100%)", accent: "#219CE5" },
  { cover: "linear-gradient(135deg,#EAB308 0%,#F97316 100%)", accent: "#F2930F" },
  { cover: "linear-gradient(135deg,#EC4899 0%,#8B5CF6 100%)", accent: "#BC52C8" },
];

function paletteFor(seed: string) {
  const h = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0);
  return COVER_PALETTES[h % COVER_PALETTES.length];
}

const AUDIO_EXT = ["mp3", "wav", "flac", "ogg", "opus", "oga", "m4a", "mp4", "m4b", "aac", "webm", "weba"];

function isAudioFile(file: File): boolean {
  if (file.type.startsWith("audio/")) return true;
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  return AUDIO_EXT.includes(ext);
}

function deriveFolderName(path: string): string {
  // webkitRelativePath: "Folder/Sub/file.mp3" — use the top segment
  const parts = path.split("/").filter(Boolean);
  return parts.length > 1 ? parts[0] : "";
}

export interface ImportResult {
  tracks: Track[];
  playlists: Playlist[];
  /** Number of files that were skipped (non-audio or unreadable). */
  skipped: number;
  /** Folder names that became playlists (empty if file-mode import). */
  folderPlaylists: string[];
}

function buildTrack(id: string, file: File, meta: TrackMetadata, folderHint?: string): Track {
  const palette = paletteFor(meta.album || meta.artist || id);
  return {
    id,
    title: meta.title,
    artist: meta.artist,
    artistId: `lib-${meta.albumArtist || meta.artist}`,
    album: meta.album || folderHint || "Unknown album",
    albumId: `lib-${meta.album || folderHint || "Unknown"}`,
    genre: meta.genre,
    year: meta.year,
    duration: meta.duration || 0,
    src: primeUrlCache(id, file),
    cover: meta.cover ?? palette.cover,
    accent: palette.accent,
    plays: "—",
  };
}

/**
 * Import a flat list of audio Files (no folder grouping).
 */
export async function importFiles(files: File[]): Promise<ImportResult> {
  const audio = files.filter(isAudioFile);
  const skipped = files.length - audio.length;
  const results = await Promise.all(
    audio.map(async (file) => {
      try {
        const id = `loc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const meta = await parseAudioMetadata(file, { folderHint: undefined });
        const rec: StoredFile = { id, file, meta, addedAt: Date.now() };
        const track = buildTrack(id, file, meta);
        return { rec, track };
      } catch (err) {
        console.warn("Failed to parse", file.name, err);
        return null;
      }
    })
  );
  const valid = results.filter((r): r is { rec: StoredFile; track: Track } => r !== null);
  await bulkPutFiles(valid.map((r) => r.rec));
  return {
    tracks: valid.map((r) => r.track),
    playlists: [],
    skipped,
    folderPlaylists: [],
  };
}

/**
 * Import a folder of files (webkitdirectory). Files are grouped by their
 * top-level folder name; each group becomes its own Playlist.
 */
export async function importFolder(
  filesWithPaths: { file: File; path: string }[]
): Promise<ImportResult> {
  // Bucket by top-level folder
  const groups = new Map<string, { file: File; path: string }[]>();
  let skipped = 0;
  for (const entry of filesWithPaths) {
    if (!isAudioFile(entry.file)) {
      skipped += 1;
      continue;
    }
    const folder = deriveFolderName(entry.path) || "Imported folder";
    if (!groups.has(folder)) groups.set(folder, []);
    groups.get(folder)!.push(entry);
  }

  const allTracks: Track[] = [];
  const allPlaylists: Playlist[] = [];
  const folderPlaylists: string[] = [];
  const storedRecs: StoredFile[] = [];
  const storedPls: StoredPlaylist[] = [];

  for (const [folderName, entries] of groups.entries()) {
    // Sort by track number if present, else by filename
    const parsed = await Promise.all(
      entries.map(async (entry) => {
        try {
          const id = `loc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
          const meta = await parseAudioMetadata(entry.file, { folderHint: folderName });
          const rec: StoredFile = { id, file: entry.file, meta, addedAt: Date.now() };
          const track = buildTrack(id, entry.file, meta, folderName);
          return { rec, track, trackNo: meta.trackNo || 0, name: entry.file.name };
        } catch (err) {
          console.warn("Failed to parse", entry.file.name, err);
          return null;
        }
      })
    );
    const valid = parsed.filter(
      (r): r is { rec: StoredFile; track: Track; trackNo: number; name: string } => r !== null
    );
    // Sort by trackNo if all have non-zero, else by name
    const sorted =
      valid.every((r) => r.trackNo > 0)
        ? [...valid].sort((a, b) => a.trackNo - b.trackNo)
        : [...valid].sort((a, b) => a.name.localeCompare(b.name));

    sorted.forEach((r) => {
      allTracks.push(r.track);
      storedRecs.push(r.rec);
    });

    const playlistId = `pl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const palette = paletteFor(folderName);
    const trackIds = sorted.map((r) => r.track.id);
    const stored: StoredPlaylist = {
      id: playlistId,
      title: folderName,
      description: `Imported from folder · ${trackIds.length} tracks`,
      trackIds,
      cover: palette.cover,
      accent: palette.accent,
      createdAt: Date.now(),
      folderOrigin: folderName,
    };
    storedPls.push(stored);
    allPlaylists.push({
      id: playlistId,
      title: folderName,
      description: stored.description,
      trackIds,
      cover: palette.cover,
      accent: palette.accent,
      curator: "Folder import",
      editable: true,
    });
    folderPlaylists.push(folderName);
  }

  await bulkPutFiles(storedRecs);
  await Promise.all(storedPls.map((p) => putPlaylist(p)));

  return {
    tracks: allTracks,
    playlists: allPlaylists,
    skipped,
    folderPlaylists,
  };
}

/**
 * Helper for parsing FileList from <input type=file webkitdirectory> entries.
 * The standard FileList doesn't expose webkitRelativePath directly through
 * the input element, but the File objects do via `webkitRelativePath`.
 */
export function extractFolderEntries(fileList: FileList): { file: File; path: string }[] {
  const out: { file: File; path: string }[] = [];
  for (let i = 0; i < fileList.length; i++) {
    const file = fileList.item(i);
    if (!file) continue;
    // webkitRelativePath is non-standard but supported by Chromium/Firefox/Safari
    const path =
      (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
    out.push({ file, path });
  }
  return out;
}
