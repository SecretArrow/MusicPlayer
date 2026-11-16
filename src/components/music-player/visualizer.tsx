"use client";

import { useEffect, useRef, useState } from "react";
import { Music } from "lucide-react";
import { getAnalyser } from "@/lib/audio-engine";
import { usePlayerStore } from "@/store/player-store";
import { cn } from "@/lib/utils";

const BAR_COUNT = 48;
const FALLBACK_ACCENT = "#10B981";

type VisualizerStyle = "bars" | "wave" | "off";

function resolveAccent(explicit?: string, storeAccent?: string): string {
  if (explicit) return explicit;
  if (typeof document !== "undefined") {
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue("--accent")
      .trim();
    if (v) return v;
  }
  return storeAccent || FALLBACK_ACCENT;
}

function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const s = m[1];
  const r =
    s.length === 3 ? parseInt(s[0] + s[0], 16) : parseInt(s.slice(0, 2), 16);
  const g =
    s.length === 3 ? parseInt(s[1] + s[1], 16) : parseInt(s.slice(2, 4), 16);
  const b =
    s.length === 3 ? parseInt(s[2] + s[2], 16) : parseInt(s.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function roundTopRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, Math.max(h, 0.1) / 2);
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
}

function VisualizerPlaceholder({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03]",
        className
      )}
      style={style}
    >
      <Music className="size-5 text-zinc-600" aria-hidden />
      <span className="text-xs text-zinc-500">Play to visualize</span>
    </div>
  );
}

export function Visualizer({
  className,
  height = 80,
  style,
  accentColor,
}: {
  className?: string;
  height?: number;
  style?: VisualizerStyle;
  accentColor?: string;
}) {
  const storeStyle = usePlayerStore((s) => s.visualizerStyle);
  const storeAccent = usePlayerStore((s) => s.accent);
  const activeStyle = style ?? storeStyle;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [analyserReady, setAnalyserReady] = useState(false);

  // The analyser is created lazily on first play — poll until it exists.
  useEffect(() => {
    if (activeStyle === "off") return;
    const id = window.setInterval(
      () => setAnalyserReady(getAnalyser() !== null),
      400
    );
    return () => window.clearInterval(id);
  }, [activeStyle]);

  // Canvas draw loop
  useEffect(() => {
    if (activeStyle === "off") return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // Resolve accent once at draw-loop start
    const color = resolveAccent(accentColor, storeAccent);

    const freqData = new Uint8Array(128); // frequencyBinCount for fftSize 256
    const timeData = new Uint8Array(256); // fftSize samples
    let raf = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const analyser = getAnalyser();
      if (!analyser || w <= 1 || h <= 1) return;

      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, hexToRgba(color, 0.45));
      grad.addColorStop(1, color);

      if (activeStyle === "bars") {
        analyser.getByteFrequencyData(freqData);
        const slot = w / BAR_COUNT;
        const barWidth = Math.max(1, slot * 0.62);
        const usable = Math.floor(freqData.length * 0.85);
        ctx.fillStyle = grad;
        for (let i = 0; i < BAR_COUNT; i++) {
          const start = Math.floor((i / BAR_COUNT) * usable);
          const end = Math.max(
            start + 1,
            Math.floor(((i + 1) / BAR_COUNT) * usable)
          );
          let sum = 0;
          for (let j = start; j < end; j++) sum += freqData[j];
          const v = sum / (end - start) / 255;
          const barH = v * h * 0.94;
          if (barH < dpr) continue;
          const x = i * slot + (slot - barWidth) / 2;
          roundTopRect(ctx, x, h - barH, barWidth, barH, barWidth / 2);
          ctx.fill();
        }
      } else {
        analyser.getByteTimeDomainData(timeData);
        ctx.beginPath();
        const n = timeData.length;
        for (let i = 0; i < n; i++) {
          const x = (i / (n - 1)) * w;
          const t = (timeData[i] - 128) / 128;
          const y = h / 2 + t * (h / 2) * 0.9;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.lineWidth = Math.max(1.5, 1.5 * dpr);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = grad;
        ctx.stroke();
      }
    };

    draw();
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [activeStyle, accentColor, storeAccent]);

  if (activeStyle === "off") {
    return <VisualizerPlaceholder className={className} style={{ height }} />;
  }

  return (
    <div className={cn("relative", className)} style={{ height }}>
      <canvas
        ref={canvasRef}
        className="block h-full w-full rounded-lg border border-white/10 bg-white/[0.03]"
        aria-hidden
      />
      {!analyserReady && (
        <VisualizerPlaceholder className="absolute inset-0" />
      )}
    </div>
  );
}
