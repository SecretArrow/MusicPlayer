"use client";

/**
 * Theme layout switcher — the heart of "themes are more than colors".
 * Reads the active theme's `layout` field and mounts the matching full
 * layout variant. Midnight / Monochrome / Daylight stay on the classic
 * sidebar shell; the other seven themes each get their own chrome,
 * icon set, typography and control positions.
 */

import { getTheme } from "@/data/themes";
import { usePlayerStore } from "@/store/player-store";
import { PcPlayer } from "../pc-player";
import { GlassLayout } from "./glass";
import { VinylLayout } from "./vinyl";
import { CassetteLayout } from "./cassette";
import { CyberLayout } from "./cyber";
import { FocusLayout } from "./focus";
import { MosaicLayout } from "./mosaic";
import { BroadcastLayout } from "./broadcast";

export function ThemeLayoutSwitch() {
  const themeKey = usePlayerStore((s) => s.themeKey);
  const layout = getTheme(themeKey).layout;

  switch (layout) {
    case "glass":
      return <GlassLayout />;
    case "vinyl":
      return <VinylLayout />;
    case "cassette":
      return <CassetteLayout />;
    case "cyber":
      return <CyberLayout />;
    case "focus":
      return <FocusLayout />;
    case "mosaic":
      return <MosaicLayout />;
    case "broadcast":
      return <BroadcastLayout />;
    default:
      return <PcPlayer />;
  }
}
