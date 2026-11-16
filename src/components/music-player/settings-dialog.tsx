"use client";

import type { ReactNode } from "react";
import { AudioWaveform } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { usePlayerStore, type SettingsTab } from "@/store/player-store";
import { accentPresets } from "@/data/music";
import { ThemePicker } from "./theme-picker";

type AudioQuality = "low" | "high" | "lossless";
type VisualizerStyle = "bars" | "wave" | "off";

const QUALITY_LABELS: Record<AudioQuality, string> = {
  low: "Low (96 kbps)",
  high: "High (320 kbps)",
  lossless: "Lossless (FLAC 24-bit)",
};

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

function SettingsRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-3">
      <div className="min-w-0 space-y-1">
        <Label className="text-zinc-100">{label}</Label>
        {description ? (
          <p className="text-xs text-zinc-500">{description}</p>
        ) : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function SettingsDialog() {
  const showSettings = usePlayerStore((s) => s.showSettings);
  const setShowSettings = usePlayerStore((s) => s.setShowSettings);
  const settingsTab = usePlayerStore((s) => s.settingsTab);
  const setSettingsTab = usePlayerStore((s) => s.setSettingsTab);
  const audioQuality = usePlayerStore((s) => s.audioQuality);
  const setAudioQuality = usePlayerStore((s) => s.setAudioQuality);
  const crossfade = usePlayerStore((s) => s.crossfade);
  const setCrossfade = usePlayerStore((s) => s.setCrossfade);
  const normalize = usePlayerStore((s) => s.normalize);
  const setNormalize = usePlayerStore((s) => s.setNormalize);
  const playbackRate = usePlayerStore((s) => s.playbackRate);
  const setPlaybackRate = usePlayerStore((s) => s.setPlaybackRate);
  const accentKey = usePlayerStore((s) => s.accentKey);
  const setAccent = usePlayerStore((s) => s.setAccent);
  const visualizerStyle = usePlayerStore((s) => s.visualizerStyle);
  const setVisualizerStyle = usePlayerStore((s) => s.setVisualizerStyle);

  return (
    <Dialog open={showSettings} onOpenChange={setShowSettings}>
      <DialogContent className="max-h-[85dvh] max-w-xl overflow-y-auto border-white/10 bg-zinc-900 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Settings</DialogTitle>
          <DialogDescription className="text-zinc-500">
            Tune playback, appearance and more.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={settingsTab}
          onValueChange={(value) => setSettingsTab(value as SettingsTab)}
          className="gap-4"
        >
          <TabsList className="grid h-9 w-full grid-cols-3 border border-white/10 bg-white/5">
            <TabsTrigger
              value="playback"
              className="text-zinc-400 data-[state=active]:bg-white/10 data-[state=active]:text-zinc-100"
            >
              Playback
            </TabsTrigger>
            <TabsTrigger
              value="appearance"
              className="text-zinc-400 data-[state=active]:bg-white/10 data-[state=active]:text-zinc-100"
            >
              Appearance
            </TabsTrigger>
            <TabsTrigger
              value="about"
              className="text-zinc-400 data-[state=active]:bg-white/10 data-[state=active]:text-zinc-100"
            >
              About
            </TabsTrigger>
          </TabsList>

          {/* ---------- Playback ---------- */}
          <TabsContent value="playback" className="mt-1 divide-y divide-white/5">
            <SettingsRow
              label="Audio quality"
              description="Streaming bitrate used for playback"
            >
              <Select
                value={audioQuality}
                onValueChange={(value) => {
                  const quality = value as AudioQuality;
                  setAudioQuality(quality);
                  toast(`Audio quality set to ${QUALITY_LABELS[quality]}`);
                }}
              >
                <SelectTrigger className="w-[190px] border-white/10 bg-white/5 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-zinc-900 text-zinc-100">
                  {(Object.keys(QUALITY_LABELS) as AudioQuality[]).map((q) => (
                    <SelectItem
                      key={q}
                      value={q}
                      className="focus:bg-white/10 focus:text-zinc-100"
                    >
                      {QUALITY_LABELS[q]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingsRow>

            <SettingsRow
              label="Fade transitions"
              description="Smooth fade in/out on play, pause and track change"
            >
              <Switch
                checked={crossfade}
                onCheckedChange={setCrossfade}
                aria-label="Toggle fade transitions"
                className="data-[state=checked]:bg-[color:var(--accent)]"
              />
            </SettingsRow>

            <SettingsRow
              label="Volume normalization"
              description="Keep loudness consistent across tracks"
            >
              <Switch
                checked={normalize}
                onCheckedChange={setNormalize}
                aria-label="Toggle volume normalization"
                className="data-[state=checked]:bg-[color:var(--accent)]"
              />
            </SettingsRow>

            <SettingsRow
              label="Playback speed"
              description="Rate at which tracks are played"
            >
              <Select
                value={String(playbackRate)}
                onValueChange={(value) => setPlaybackRate(Number(value))}
              >
                <SelectTrigger
                  size="sm"
                  className="w-[110px] border-white/10 bg-white/5 text-zinc-100"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-zinc-900 text-zinc-100">
                  {PLAYBACK_RATES.map((rate) => (
                    <SelectItem
                      key={rate}
                      value={String(rate)}
                      className="focus:bg-white/10 focus:text-zinc-100"
                    >
                      {rate}x
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingsRow>
          </TabsContent>

          {/* ---------- Appearance ---------- */}
          <TabsContent value="appearance" className="mt-1 divide-y divide-white/5">
            {/* Built-in themes */}
            <div className="pb-3">
              <div className="space-y-1">
                <Label className="text-zinc-100">Theme</Label>
                <p className="text-xs text-zinc-500">
                  10 built-in themes restyle the whole player instantly.
                </p>
              </div>
              <div className="mt-3">
                <ThemePicker columns={2} />
              </div>
            </div>

            <SettingsRow
              label="Accent color"
              description="Fine-tune the highlight color on top of the theme"
            >
              <div className="flex flex-wrap items-center justify-end gap-2">
                {accentPresets.map((preset) => {
                  const active = accentKey === preset.key;
                  return (
                    <button
                      key={preset.key}
                      type="button"
                      title={preset.label}
                      aria-label={`${preset.label} accent color`}
                      aria-pressed={active}
                      onClick={() => {
                        setAccent(preset.key, preset.color);
                        toast(`Accent color: ${preset.label}`);
                      }}
                      style={{ backgroundColor: preset.color }}
                      className={cn(
                        "h-8 w-8 rounded-full transition-all hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
                        active && "ring-2 ring-white/80 ring-offset-2 ring-offset-zinc-900"
                      )}
                    />
                  );
                })}
              </div>
            </SettingsRow>

            <SettingsRow
              label="Visualizer"
              description="Style of the now-playing visualizer"
            >
              <Select
                value={visualizerStyle}
                onValueChange={(value) => setVisualizerStyle(value as VisualizerStyle)}
              >
                <SelectTrigger
                  size="sm"
                  className="w-[110px] border-white/10 bg-white/5 text-zinc-100"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-zinc-900 text-zinc-100">
                  <SelectItem value="bars" className="focus:bg-white/10 focus:text-zinc-100">
                    Bars
                  </SelectItem>
                  <SelectItem value="wave" className="focus:bg-white/10 focus:text-zinc-100">
                    Wave
                  </SelectItem>
                  <SelectItem value="off" className="focus:bg-white/10 focus:text-zinc-100">
                    Off
                  </SelectItem>
                </SelectContent>
              </Select>
            </SettingsRow>
          </TabsContent>

          {/* ---------- About ---------- */}
          <TabsContent value="about" className="mt-1">
            <div className="flex flex-col items-center gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-6 text-center">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--accent) 15%, transparent)",
                }}
              >
                <AudioWaveform
                  className="size-6"
                  style={{ color: "var(--accent)" }}
                  aria-hidden="true"
                />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-zinc-100">Aurora Player</h3>
                <p className="text-xs text-zinc-500">Version 1.0.0 (demo build)</p>
              </div>
              <p className="max-w-sm text-xs leading-relaxed text-zinc-500">
                Demo audio streams royalty-free samples from SoundHelix
                (soundhelix.com). Cover art is generated with CSS gradients.
              </p>
              <p className="flex items-center gap-2 text-xs text-zinc-400">
                Press
                <kbd className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-mono text-zinc-300">
                  ?
                </kbd>
                for shortcuts
              </p>
              <p className="text-[11px] text-zinc-600">
                Built with Next.js, Tailwind CSS, shadcn/ui and Lucide icons.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
