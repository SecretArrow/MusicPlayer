"use client";

import { Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { THEMES, type PlayerTheme } from "@/data/themes";
import { usePlayerStore } from "@/store/player-store";

/**
 * Grid of built-in theme cards. Each card's mini player mock-up reflects the
 * theme's LAYOUT variant (sidebar, glass pill, turntable, cassette reels,
 * HUD, dock, bento tiles, radio console) — not just its palette.
 * Used in the PC settings dialog and the Android theme sheet.
 */
export function ThemePicker({
  columns = 2,
  compact = false,
}: {
  columns?: 2 | 3;
  compact?: boolean;
}) {
  const themeKey = usePlayerStore((s) => s.themeKey);
  const setTheme = usePlayerStore((s) => s.setTheme);

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn("grid gap-2", columns === 2 ? "grid-cols-2" : "grid-cols-3")}
    >
      {THEMES.map((theme) => {
        const active = themeKey === theme.key;
        return (
          <button
            key={theme.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              setTheme(theme.key);
              toast(`Theme: ${theme.label}`);
            }}
            className={cn(
              "group rounded-lg border p-2 text-left transition-all hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
              active
                ? "border-[color:var(--accent)] bg-white/[0.06]"
                : "border-white/10"
            )}
          >
            {/* Mini player mock-up — shape mirrors the real layout variant */}
            <div
              className="relative h-11 w-full overflow-hidden rounded-md"
              style={{
                background: `linear-gradient(135deg, ${theme.swatch[0]} 0%, ${theme.swatch[1]} 100%)`,
              }}
              aria-hidden
            >
              <LayoutPreview theme={theme} />
              {active && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[color:var(--accent)] text-zinc-950">
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                </span>
              )}
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-1">
              <span className="truncate text-xs font-medium text-zinc-100">
                {theme.label}
              </span>
              {!compact && (
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: theme.accent }}
                  aria-hidden
                />
              )}
            </div>
            {!compact && (
              <>
                <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-wide text-[color:var(--accent)]">
                  {theme.layoutLabel}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-zinc-500">
                  {theme.description}
                </p>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

const a = (theme: PlayerTheme, opacity = 1) =>
  `color-mix(in srgb, ${theme.swatch[2]} ${Math.round(opacity * 100)}%, transparent)`;

/** Tiny schematic of each layout variant, drawn with the theme's swatch. */
function LayoutPreview({ theme }: { theme: PlayerTheme }) {
  const [bg, , accent] = theme.swatch;

  switch (theme.layout) {
    case "glass":
      // Floating top pill nav + bottom control pill
      return (
        <>
          <div
            className="absolute left-2 right-6 top-1.5 h-2 rounded-full border"
            style={{ borderColor: a(theme, 0.4), backgroundColor: a(theme, 0.12) }}
          >
            <div className="absolute left-1 top-1/2 h-1 w-4 -translate-y-1/2 rounded-full" style={{ backgroundColor: accent }} />
            <div className="absolute left-7 top-1/2 h-0.5 w-6 -translate-y-1/2 rounded-full" style={{ backgroundColor: a(theme, 0.5) }} />
            <div className="absolute left-14 top-1/2 h-0.5 w-6 -translate-y-1/2 rounded-full" style={{ backgroundColor: a(theme, 0.5) }} />
          </div>
          <div className="absolute bottom-1.5 left-1/2 h-2.5 w-14 -translate-x-1/2 rounded-full border" style={{ borderColor: a(theme, 0.5), backgroundColor: a(theme, 0.15) }}>
            <div className="absolute right-1 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full" style={{ backgroundColor: accent }} />
          </div>
          <div className="absolute left-2 top-5 h-2 w-8 rounded-full" style={{ backgroundColor: a(theme, 0.5) }} />
          <div className="absolute left-2 top-7.5 h-2 w-12 rounded-full" style={{ backgroundColor: a(theme, 0.3) }} />
        </>
      );

    case "vinyl":
      // Shelf lines on the left, spinning disc on the right
      return (
        <>
          <div className="absolute left-2 top-1.5 flex flex-col gap-1">
            <div className="h-0.5 w-8 rounded-full" style={{ backgroundColor: a(theme, 0.6) }} />
            <div className="h-0.5 w-6 rounded-full" style={{ backgroundColor: a(theme, 0.35) }} />
            <div className="h-0.5 w-7 rounded-full" style={{ backgroundColor: a(theme, 0.35) }} />
          </div>
          <div className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border-2" style={{ backgroundColor: bg, borderColor: a(theme, 0.5) }}>
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent }} />
          </div>
          <div className="absolute bottom-1.5 left-2 h-0.5 w-10 rounded-full" style={{ backgroundColor: a(theme, 0.4) }} />
        </>
      );

    case "cassette":
      // Window with two reels + chunky key strip
      return (
        <>
          <div className="absolute left-2 right-2 top-1.5 h-4 rounded-sm border" style={{ borderColor: a(theme, 0.5) }}>
            <div className="absolute left-1 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border" style={{ borderColor: a(theme, 0.8) }} />
            <div className="absolute right-1 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border" style={{ borderColor: a(theme, 0.8) }} />
            <div className="absolute left-1/2 top-1/2 h-px w-3 -translate-x-1/2" style={{ backgroundColor: a(theme, 0.6) }} />
          </div>
          <div className="absolute bottom-1.5 left-2 flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-2 w-3 rounded-[2px] border-b-2" style={{ backgroundColor: a(theme, 0.15), borderBottomColor: a(theme, 0.7) }} />
            ))}
          </div>
        </>
      );

    case "cyber":
      // Left square rail + clipped frame + segmented bar
      return (
        <>
          <div className="absolute left-1.5 top-1.5 flex flex-col gap-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-2 w-2 rounded-[2px] border" style={{ borderColor: i === 0 ? accent : a(theme, 0.5), backgroundColor: i === 0 ? a(theme, 0.3) : "transparent" }} />
            ))}
          </div>
          <div
            className="absolute bottom-1.5 left-5 right-1.5 top-1.5 border"
            style={{ borderColor: a(theme, 0.5), clipPath: "polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 5px 100%, 0 calc(100% - 5px))" }}
          >
            <div className="absolute left-1.5 top-1.5 h-0.5 w-8 rounded-full" style={{ backgroundColor: a(theme, 0.6) }} />
            <div className="absolute bottom-1 left-1.5 right-1 flex gap-px">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-0.5 flex-1 rounded-full" style={{ backgroundColor: i < 6 ? accent : a(theme, 0.3) }} />
              ))}
            </div>
          </div>
        </>
      );

    case "focus":
      // Giant centered cover + bottom dock dots
      return (
        <>
          <div className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-lg" style={{ backgroundColor: accent, boxShadow: `0 0 10px ${a(theme, 0.7)}` }} />
          <div className="absolute bottom-1.5 left-1/2 flex h-2.5 w-16 -translate-x-1/2 items-center justify-center gap-1 rounded-full border" style={{ borderColor: a(theme, 0.5), backgroundColor: a(theme, 0.15) }}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-1 w-1 rounded-full" style={{ backgroundColor: i === 1 ? accent : a(theme, 0.5) }} />
            ))}
          </div>
        </>
      );

    case "mosaic":
      // Bento tiles
      return (
        <>
          <div className="absolute bottom-1.5 left-1.5 right-1.5 top-1.5 grid grid-cols-3 grid-rows-2 gap-1">
            <div className="col-span-2 row-span-2 rounded-sm border" style={{ borderColor: a(theme, 0.5), backgroundColor: a(theme, 0.15) }}>
              <div className="absolute bottom-0.5 left-1 h-0.5 w-6 rounded-full" style={{ backgroundColor: accent }} />
            </div>
            <div className="rounded-sm border" style={{ borderColor: a(theme, 0.4), backgroundColor: a(theme, 0.08) }} />
            <div className="rounded-sm border" style={{ borderColor: a(theme, 0.4), backgroundColor: a(theme, 0.08) }} />
          </div>
        </>
      );

    case "broadcast":
      // Masthead + tuner ticks + studio card
      return (
        <>
          <div className="absolute left-2 right-2 top-1.5 h-2 rounded-sm" style={{ backgroundColor: a(theme, 0.15) }}>
            <div className="absolute left-1 top-1/2 h-1 w-6 -translate-y-1/2 rounded-full" style={{ backgroundColor: accent }} />
          </div>
          <div className="absolute left-2 right-8 top-5 flex justify-between">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-1.5 w-px rounded-full" style={{ backgroundColor: i === 4 ? accent : a(theme, 0.4) }} />
            ))}
          </div>
          <div className="absolute bottom-1.5 right-1.5 flex h-3.5 w-8 items-center justify-center rounded-sm border" style={{ borderColor: a(theme, 0.6) }}>
            <div className="h-1 w-1 rounded-full animate-pulse" style={{ backgroundColor: accent }} />
          </div>
          <div className="absolute bottom-1.5 left-2 h-2.5 w-10 rounded-sm" style={{ backgroundColor: a(theme, 0.25) }} />
        </>
      );

    default:
      // classic: sidebar strip + content bars + bottom player line
      return (
        <>
          <div
            className="absolute left-1.5 top-1.5 h-[calc(100%-12px)] w-3.5 rounded-sm"
            style={{ backgroundColor: theme.swatch[1] }}
          />
          <div className="absolute left-6 top-2 h-1 w-10 rounded-full" style={{ backgroundColor: accent, opacity: 0.9 }} />
          <div className="absolute left-6 top-4 h-1 w-7 rounded-full" style={{ backgroundColor: accent, opacity: 0.45 }} />
          <div className="absolute bottom-2 left-6 right-2 h-1 rounded-full" style={{ backgroundColor: accent, opacity: 0.3 }}>
            <div className="h-full w-2/3 rounded-full" style={{ backgroundColor: accent }} />
          </div>
          <div className="absolute right-2 top-2 flex h-3.5 w-3.5 items-center justify-center rounded-full" style={{ backgroundColor: accent }} />
        </>
      );
  }
}
