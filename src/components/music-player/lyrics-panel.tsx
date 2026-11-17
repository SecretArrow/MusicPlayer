"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePlayerStore, useCurrentTrack } from "@/store/player-store";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Mic2, Upload, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { parseLRC, placeholderLyrics, synthesizeFromPlain, type ParsedLyrics } from "@/lib/lrc-parser";
import { getLyrics, putLyrics } from "@/lib/lyrics-db";

// In-memory cache of parsed lyrics per track.
// `null` means "we already looked it up and there's nothing stored".
const MEMORY_CACHE = new Map<string, ParsedLyrics | null>();

export function LyricsPanel({ compact = false }: { compact?: boolean }) {
  const track = useCurrentTrack();
  const currentTime = usePlayerStore((s) => s.currentTime);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [parsed, setParsed] = useState<ParsedLyrics | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load lyrics (from cache or IDB) whenever the track changes.
  useEffect(() => {
    if (!track) {
      setParsed(null);
      return;
    }
    const cached = MEMORY_CACHE.get(track.id);
    if (cached !== undefined) {
      setParsed(cached ?? placeholderLyrics(track.duration, track.title));
      return;
    }
    setLoading(true);
    getLyrics(track.id)
      .then((rec) => {
        let p: ParsedLyrics | null = null;
        if (rec) {
          p = parseLRC(rec.lrc);
          if (!p) {
            // Plain text — synthesize timing from the track duration.
            p = synthesizeFromPlain(rec.lrc, track.duration);
          }
        }
        MEMORY_CACHE.set(track.id, p);
        setParsed(p ?? placeholderLyrics(track.duration, track.title));
      })
      .catch(() => {
        const ph = placeholderLyrics(track.duration, track.title);
        MEMORY_CACHE.set(track.id, null);
        setParsed(ph);
      })
      .finally(() => setLoading(false));
  }, [track]);

  // Compute the active lyric line from currentTime
  const activeIndex = useMemo(() => {
    if (!parsed || parsed.lines.length === 0) return 0;
    let idx = 0;
    for (let i = 0; i < parsed.lines.length; i++) {
      if (currentTime >= parsed.lines[i].time) idx = i;
      else break;
    }
    return idx;
  }, [currentTime, parsed]);

  // Auto-scroll to active line
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !parsed) return;
    const active = el.querySelector<HTMLElement>(`[data-line="${activeIndex}"]`);
    if (active) {
      const offsetTop = active.offsetTop - el.clientHeight / 2 + active.clientHeight / 2;
      el.scrollTo({ top: offsetTop, behavior: "smooth" });
    }
  }, [activeIndex, parsed]);

  const handleImportLrc = async (list: FileList | null) => {
    if (!list || list.length === 0 || !track) return;
    const file = list[0];
    const text = await file.text();
    const p = parseLRC(text);
    if (!p) {
      // Plain text — keep as-is, will be synthesized at load time.
      await putLyrics({ trackId: track.id, lrc: text, addedAt: Date.now() });
      MEMORY_CACHE.set(track.id, synthesizeFromPlain(text, track.duration));
      toast.success("Imported lyrics (plain text)", {
        description: "Lines will be distributed evenly across the track duration.",
      });
    } else {
      await putLyrics({ trackId: track.id, lrc: text, addedAt: Date.now() });
      MEMORY_CACHE.set(track.id, p);
      toast.success("Imported synced lyrics", {
        description: p.meta.title
          ? `${p.meta.title}${p.meta.artist ? " — " + p.meta.artist : ""}`
          : `${p.lines.length} synced lines`,
      });
    }
    setParsed(MEMORY_CACHE.get(track.id) ?? placeholderLyrics(track.duration, track.title));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const hasStoredLyrics = track ? MEMORY_CACHE.get(track.id) !== undefined && MEMORY_CACHE.get(track.id) !== null : false;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Mic2 className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold text-white">Lyrics</h2>
        </div>
        {track && (
          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              accept=".lrc,.txt,text/plain"
              className="hidden"
              aria-hidden="true"
              tabIndex={-1}
              onChange={(e) => handleImportLrc(e.target.files)}
            />
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-zinc-400 hover:bg-white/10 hover:text-white"
              onClick={() => fileInputRef.current?.click()}
              title="Import .lrc file"
            >
              <Upload className="h-3.5 w-3.5" />
              Import
            </Button>
            {hasStoredLyrics && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs text-zinc-400 hover:bg-white/10 hover:text-red-400"
                onClick={() => {
                  if (!track) return;
                  MEMORY_CACHE.delete(track.id);
                  setParsed(placeholderLyrics(track.duration, track.title));
                  toast("Lyrics cleared for this track");
                }}
                title="Clear lyrics"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>
      {track && (
        <p className="mb-4 text-xs text-zinc-500">
          {track.title} · {track.artist}
        </p>
      )}
      <div
        ref={scrollRef}
        className={cn(
          "flex-1 overflow-y-auto",
          compact ? "max-h-72" : ""
        )}
      >
        {loading ? (
          <div className="flex h-full items-center justify-center py-8 text-zinc-500">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : parsed && parsed.lines.length > 0 ? (
          <div className="space-y-3 py-4 text-center">
            {parsed.lines.map((line, i) => (
              <p
                key={i}
                data-line={i}
                className={cn(
                  "transition-all duration-300",
                  i === activeIndex
                    ? "text-xl font-bold text-white"
                    : "text-base text-zinc-600",
                  i < activeIndex && "opacity-50"
                )}
              >
                {line.text}
              </p>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-white/10 p-8 text-center">
            <p className="text-sm text-zinc-400">No lyrics for this track.</p>
            <p className="mt-1 text-xs text-zinc-500">
              Click “Import” above to load an <code className="text-zinc-300">.lrc</code> file.
            </p>
          </div>
        )}
      </div>
      <p className="mt-3 text-center text-[10px] text-zinc-600">
        Lyrics are synced to playback. Import .lrc for time-synced lines.
      </p>
    </div>
  );
}
