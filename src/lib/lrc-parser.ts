// LRC (Line Lyric) parser and lyrics storage.
//
// Supports:
//   • Standard [mm:ss.xx] timestamps
//   • Multiple timestamps per line: [00:01.00][00:15.00] lyric text
//   • Metadata tags: [ar:Artist] [ti:Title] [al:Album] [length:ss]
//   • Offset tag: [offset:+500] (milliseconds)
//
// Falls back to a single "♪ Instrumental ♪" placeholder when no LRC is
// found, so the Lyrics panel always shows something coherent.

import type { LyricLine } from "@/data/music";

const LRC_LINE_RE = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
const LRC_META_RE = /^\[(ar|ti|al|by|offset|length|re|ve):(.*)\]$/i;

export interface ParsedLyrics {
  lines: LyricLine[];
  meta: {
    artist?: string;
    title?: string;
    album?: string;
    by?: string;
    offsetMs: number;
    length?: number;
  };
}

/**
 * Parse LRC text into structured lyrics. Returns null if no timestamps
 * were found (e.g. plain text or malformed input).
 */
export function parseLRC(text: string): ParsedLyrics | null {
  const out: LyricLine[] = [];
  const meta: ParsedLyrics["meta"] = { offsetMs: 0 };

  const lines = text.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // Metadata?
    const m = line.match(LRC_META_RE);
    if (m) {
      const key = m[1].toLowerCase();
      const val = m[2].trim();
      if (key === "ar") meta.artist = val;
      else if (key === "ti") meta.title = val;
      else if (key === "al") meta.album = val;
      else if (key === "by") meta.by = val;
      else if (key === "offset") {
        const n = parseInt(val, 10);
        if (!isNaN(n)) meta.offsetMs = n;
      } else if (key === "length") {
        const n = parseFloat(val);
        if (!isNaN(n)) meta.length = n;
      }
      continue;
    }

    // Lyrics — possibly with multiple timestamps per line.
    const stamps: number[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    LRC_LINE_RE.lastIndex = 0;
    while ((match = LRC_LINE_RE.exec(line)) !== null) {
      const mm = parseInt(match[1], 10);
      const ss = parseInt(match[2], 10);
      const fracRaw = match[3] ?? "0";
      const frac = parseInt(fracRaw, 10) / Math.pow(10, fracRaw.length);
      stamps.push(mm * 60 + ss + frac);
      lastIndex = LRC_LINE_RE.lastIndex;
    }
    if (stamps.length === 0) continue;
    const textPart = line.slice(lastIndex).trim();
    for (const t of stamps) {
      out.push({ time: t + meta.offsetMs / 1000, text: textPart });
    }
  }

  if (out.length === 0) return null;
  // Sort by time ascending; on ties keep stable order.
  out.sort((a, b) => a.time - b.time);
  return { lines: out, meta };
}

/**
 * Plain-text fallback: split by lines, distribute evenly across the
 * track duration (best-effort sync when no real LRC is available).
 */
export function synthesizeFromPlain(text: string, durationSec: number): ParsedLyrics {
  const rawLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const n = rawLines.length || 1;
  const step = durationSec > 0 ? durationSec / (n + 1) : 4;
  const lines: LyricLine[] = rawLines.map((t, i) => ({ time: i * step, text: t }));
  return { lines, meta: { offsetMs: 0 } };
}

/**
 * Generic fallback when no lyrics at all are available for the track.
 * Renders a single placeholder line.
 */
export function placeholderLyrics(durationSec: number, title: string): ParsedLyrics {
  return {
    lines: [
      { time: 0, text: `♪ ${title} ♪` },
      { time: Math.max(2, (durationSec || 0) / 2), text: "♪ Instrumental ♪" },
    ],
    meta: { offsetMs: 0 },
  };
}
