"use client";

import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { EQ_FREQS } from "@/lib/audio-engine";
import { EQ_PRESETS, usePlayerStore } from "@/store/player-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

const BAND_LABELS = EQ_FREQS.map((f) => (f >= 1000 ? `${f / 1000}K` : `${f}`));

function formatDb(v: number): string {
  return v > 0 ? `+${v}` : `${v}`;
}

export function EqualizerPanel({ compact = false }: { compact?: boolean }) {
  const eq = usePlayerStore((s) => s.eq);
  const setEqBand = usePlayerStore((s) => s.setEqBand);
  const applyEqPreset = usePlayerStore((s) => s.applyEqPreset);
  const toggleEq = usePlayerStore((s) => s.toggleEq);

  // Rotated vertical slider sizing: wrapper height == slider width
  const sliderLen = compact ? "h-32" : "h-40";
  const sliderWidth = compact ? "w-32" : "w-40";

  return (
    <section
      aria-label="Equalizer"
      className={cn(
        "rounded-lg border border-white/10 bg-white/[0.03]",
        compact ? "p-3" : "p-4"
      )}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal
            className="size-4 text-[color:var(--accent)]"
            aria-hidden
          />
          <h3 className="text-sm font-semibold text-zinc-100">Equalizer</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-400">
            {eq.enabled ? "On" : "Off"}
          </span>
          <Switch
            checked={eq.enabled}
            onCheckedChange={toggleEq}
            aria-label="Toggle equalizer"
            className="data-[state=checked]:bg-[color:var(--accent)]!"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-7! gap-1.5 border-white/10! bg-white/[0.04]! px-2! text-xs! text-zinc-300! hover:bg-white/[0.08]!"
            onClick={() => applyEqPreset("flat", EQ_PRESETS.flat)}
          >
            <RotateCcw className="size-3.5" aria-hidden />
            Reset
          </Button>
        </div>
      </div>

      {/* Preset selector */}
      <div className="mt-3 flex items-center gap-2">
        <Select
          value={eq.preset}
          onValueChange={(name) => {
            const bands = EQ_PRESETS[name];
            if (bands) applyEqPreset(name, bands);
          }}
        >
          <SelectTrigger
            size="sm"
            aria-label="Equalizer preset"
            className="min-w-36 flex-1"
          >
            <SelectValue placeholder="Select preset" />
          </SelectTrigger>
          <SelectContent className="border-white/10! bg-zinc-900!">
            {Object.keys(EQ_PRESETS).map((name) => (
              <SelectItem key={name} value={name} className="capitalize">
                {name}
              </SelectItem>
            ))}
            <SelectItem value="custom" disabled>
              Custom
            </SelectItem>
          </SelectContent>
        </Select>
        <span className="whitespace-nowrap text-[10px] uppercase tracking-wider text-zinc-500">
          -12 / +12 dB
        </span>
      </div>

      {/* 10-band controls (horizontal sliders rotated into vertical faders) */}
      <div
        className={cn(
          "mt-4 grid grid-cols-10 gap-1 transition-opacity",
          !eq.enabled && "opacity-50"
        )}
      >
        {eq.bands.map((value, i) => (
          <div key={i} className="flex flex-col items-center">
            <div className={cn("relative w-full", sliderLen)}>
              {/* 0 dB center line */}
              <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-white/10" />
              <div
                className={cn(
                  "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90",
                  sliderWidth
                )}
              >
                <Slider
                  value={[value]}
                  min={-12}
                  max={12}
                  step={1}
                  onValueChange={(v) => setEqBand(i, v[0] ?? 0)}
                  aria-label={`${BAND_LABELS[i] ?? i} Hz band`}
                  className="[&_[data-slot=slider-range]]:bg-[color:var(--accent)]! [&_[data-slot=slider-thumb]]:size-3.5! [&_[data-slot=slider-thumb]]:border-[color:var(--accent)]! [&_[data-slot=slider-thumb]]:bg-zinc-950! [&_[data-slot=slider-track]]:h-2!"
                />
              </div>
            </div>
            <span
              className={cn(
                "mt-1 whitespace-nowrap text-[10px] tabular-nums",
                value !== 0
                  ? "text-[color:var(--accent)]"
                  : "text-zinc-400"
              )}
            >
              {formatDb(value)}
              <span className="ml-0.5 text-[8px] text-zinc-500">dB</span>
            </span>
            <span
              className="text-[10px] text-zinc-500"
              title={`${EQ_FREQS[i] ?? ""} Hz`}
            >
              {BAND_LABELS[i]}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
