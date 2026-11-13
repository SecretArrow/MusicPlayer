"use client";

import { Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { THEMES } from "@/data/themes";
import { usePlayerStore } from "@/store/player-store";

/**
 * Grid of built-in theme cards with a mini player mock-up preview.
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
            {/* Mini player mock-up */}
            <div
              className="relative h-11 w-full overflow-hidden rounded-md"
              style={{
                background: `linear-gradient(135deg, ${theme.swatch[0]} 0%, ${theme.swatch[1]} 100%)`,
              }}
              aria-hidden
            >
              {/* sidebar strip */}
              <div
                className="absolute left-1.5 top-1.5 h-[calc(100%-12px)] w-3.5 rounded-sm"
                style={{ backgroundColor: theme.swatch[1] }}
              />
              {/* text bars */}
              <div
                className="absolute left-6 top-2 h-1 w-10 rounded-full"
                style={{ backgroundColor: theme.swatch[2], opacity: 0.9 }}
              />
              <div
                className="absolute left-6 top-4 h-1 w-7 rounded-full"
                style={{ backgroundColor: theme.swatch[2], opacity: 0.45 }}
              />
              {/* progress bar */}
              <div
                className="absolute bottom-2 left-6 right-2 h-1 rounded-full"
                style={{ backgroundColor: theme.swatch[2], opacity: 0.3 }}
              >
                <div
                  className="h-full w-2/3 rounded-full"
                  style={{ backgroundColor: theme.swatch[2] }}
                />
              </div>
              {/* play dot */}
              <div
                className="absolute right-2 top-2 flex h-3.5 w-3.5 items-center justify-center rounded-full"
                style={{ backgroundColor: theme.swatch[2] }}
              />
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
              <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-zinc-500">
                {theme.description}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}
