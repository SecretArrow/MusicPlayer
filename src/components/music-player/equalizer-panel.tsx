"use client";

import { useEffect, useRef } from "react";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { EQ_FREQS } from "@/lib/audio-engine";
import { EQ_PRESETS, usePlayerStore } from "@/store/player-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

const BAND_LABELS = EQ_FREQS.map((f) => (f >= 1000 ? `${f / 1000}K` : `${f}`));

const PRESET_LABELS: Record<string, string> = {
  "r&b": "R&B",
  "hip-hop": "Hip-Hop",
};

function presetLabel(name: string): string {
  if (PRESET_LABELS[name]) return PRESET_LABELS[name];
  return name
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatDb(v: number): string {
  return v > 0 ? `+${v}` : `${v}`;
}

/**
 * Smooth frequency-response curve preview drawn through the 10 band gains
 * (offset vertically by the preamp). Catmull-Rom spline → cubic béziers.
 */
function EqCurve({ bands, preamp, height }: { bands: number[]; preamp: number; height: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const accent = usePlayerStore((s) => s.accent);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      if (w === 0) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(height * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, height);

      const mid = height / 2;
      const pxPerDb = (height / 2 - 4) / 12;

      // Horizontal grid: +12 / 0 / -12 dB
      ctx.lineWidth = 1;
      [12, 0, -12].forEach((db) => {
        ctx.strokeStyle = db === 0 ? "rgba(128,128,128,0.35)" : "rgba(128,128,128,0.16)";
        const y = Math.round(mid - db * pxPerDb) + 0.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      });

      // Curve points (band gains shifted by preamp)
      const n = bands.length;
      const pts: [number, number][] = bands.map((db, i) => [
        4 + (i / (n - 1)) * (w - 8),
        mid - Math.max(-12, Math.min(12, db + preamp)) * pxPerDb,
      ]);

      // Catmull-Rom → bézier path
      const path = new Path2D();
      path.moveTo(pts[0][0], pts[0][1]);
      for (let i = 0; i < n - 1; i++) {
        const p0 = pts[Math.max(i - 1, 0)];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[Math.min(i + 2, n - 1)];
        path.bezierCurveTo(
          p1[0] + (p2[0] - p0[0]) / 6,
          p1[1] + (p2[1] - p0[1]) / 6,
          p2[0] - (p3[0] - p1[0]) / 6,
          p2[1] - (p3[1] - p1[1]) / 6,
          p2[0],
          p2[1]
        );
      }

      // Soft fill under the curve
      const fill = new Path2D(path);
      fill.lineTo(pts[n - 1][0], height);
      fill.lineTo(pts[0][0], height);
      fill.closePath();
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = accent;
      ctx.fill(fill);
      ctx.globalAlpha = 1;

      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.stroke(path);

      // Band dots
      ctx.fillStyle = accent;
      pts.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [bands, preamp, accent, height]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{ height }}
      className="w-full rounded-md border border-white/10 bg-white/[0.02]"
    />
  );
}

export function EqualizerPanel({ compact = false }: { compact?: boolean }) {
  const eq = usePlayerStore((s) => s.eq);
  const setEqBand = usePlayerStore((s) => s.setEqBand);
  const applyEqPreset = usePlayerStore((s) => s.applyEqPreset);
  const setPreamp = usePlayerStore((s) => s.setPreamp);
  const toggleEq = usePlayerStore((s) => s.toggleEq);

  // Rotated vertical slider sizing: wrapper height == slider width
  const sliderLen = compact ? "h-28" : "h-40";
  const sliderWidth = compact ? "w-28" : "w-40";

  const handlePreset = (name: string) => {
    const bands = EQ_PRESETS[name];
    if (!bands) return;
    applyEqPreset(name, bands);
    if (!eq.enabled) toggleEq(); // picking a preset implies wanting EQ on
  };

  return (
    <section
      aria-label="Equalizer"
      className={cn(
        "overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]",
        compact ? "p-3" : "p-4"
      )}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal
            className="size-4 shrink-0 text-[color:var(--accent)]"
            aria-hidden
          />
          <h3 className="text-sm font-semibold text-zinc-100">Equalizer</h3>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Switch
            checked={eq.enabled}
            onCheckedChange={toggleEq}
            aria-label="Toggle equalizer"
            className="data-[state=checked]:bg-[color:var(--accent)]!"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-7! gap-1 border-white/10! bg-white/[0.04]! px-2! text-xs! text-zinc-300! hover:bg-white/[0.08]!"
            onClick={() => applyEqPreset("flat", EQ_PRESETS.flat)}
          >
            <RotateCcw className="size-3.5" aria-hidden />
            Reset
          </Button>
        </div>
      </div>

      {/* Preset chips */}
      <div
        role="listbox"
        aria-label="Equalizer presets"
        className="mt-3 flex flex-wrap gap-1"
      >
        {Object.keys(EQ_PRESETS).map((name) => {
          const active = eq.preset === name;
          return (
            <button
              key={name}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => handlePreset(name)}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px] leading-4 transition-colors",
                active
                  ? "border-transparent bg-[color:var(--accent)] font-medium text-zinc-950"
                  : "border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/10 hover:text-zinc-100"
              )}
            >
              {presetLabel(name)}
            </button>
          );
        })}
        {/* Informative chip — shown when bands were tweaked manually */}
        {eq.preset === "custom" && (
          <span
            role="option"
            aria-selected
            className="rounded-full border border-transparent bg-[color:var(--accent)] px-2 py-0.5 text-[11px] font-medium leading-4 text-zinc-950"
          >
            Custom
          </span>
        )}
      </div>

      {/* Response curve */}
      <div className={cn("mt-3 transition-opacity", !eq.enabled && "opacity-60")}>
        <EqCurve bands={eq.bands} preamp={eq.enabled ? eq.preamp : 0} height={compact ? 56 : 84} />
      </div>

      {/* Preamp */}
      <div className={cn("mt-3 flex items-center gap-3", compact && "gap-2")}>
        <span className="w-14 shrink-0 text-xs text-zinc-400">Preamp</span>
        <Slider
          value={[eq.preamp]}
          min={-12}
          max={12}
          step={1}
          onValueChange={(v) => setPreamp(v[0] ?? 0)}
          aria-label="Preamp gain"
          className="[&_[data-slot=slider-range]]:bg-[color:var(--accent)]! [&_[data-slot=slider-thumb]]:size-3.5! [&_[data-slot=slider-thumb]]:border-[color:var(--accent)]! [&_[data-slot=slider-thumb]]:bg-zinc-950! [&_[data-slot=slider-track]]:h-1.5!"
        />
        <span
          className={cn(
            "w-12 shrink-0 text-right text-xs tabular-nums",
            eq.preamp !== 0 ? "text-[color:var(--accent)]" : "text-zinc-400"
          )}
        >
          {formatDb(eq.preamp)} dB
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
