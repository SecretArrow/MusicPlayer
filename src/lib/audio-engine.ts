"use client";

/**
 * Singleton Web Audio engine.
 * Chain: <audio> source → 10-band EQ (biquad peaking filters) → preamp → analyser → gain → destination
 * The AudioContext is created lazily on first user gesture (play).
 */

const EQ_FREQS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

export type AudioQuality = "low" | "high" | "lossless";

export interface AudioEngine {
  ctx: AudioContext | null;
  analyser: AnalyserNode | null;
  eqFilters: BiquadFilterNode[];
  preamp: GainNode | null;
  gain: GainNode | null;
  qualityFilter: BiquadFilterNode | null;
  source: MediaElementAudioSourceNode | null;
  ensureContext: (audio: HTMLAudioElement) => void;
  applyEq: (enabled: boolean, bands: number[]) => void;
  setPreamp: (db: number) => void;
  setGain: (v: number) => void;
  /** Smooth gain ramp helper (for fade in/out) */
  rampGain: (to: number, ms: number) => void;
  /** Apply simulated audio quality: low → lowpass ~8 kHz, lossless → bypass */
  applyQuality: (q: AudioQuality) => void;
}

let engine: AudioEngine | null = null;

function createEngine(): AudioEngine {
  const eng: AudioEngine = {
    ctx: null,
    analyser: null,
    eqFilters: [],
    preamp: null,
    gain: null,
    qualityFilter: null,
    source: null,
    ensureContext(audio: HTMLAudioElement) {
      if (eng.ctx) {
        if (eng.ctx.state === "suspended") void eng.ctx.resume();
        return;
      }
      try {
        const Ctor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!Ctor) return;
        const ctx = new Ctor();
        const source = ctx.createMediaElementSource(audio);
        // EQ chain
        const filters = EQ_FREQS.map((f, i) => {
          const filter = ctx.createBiquadFilter();
          filter.type = i === 0 ? "lowshelf" : i === EQ_FREQS.length - 1 ? "highshelf" : "peaking";
          filter.frequency.value = f;
          filter.Q.value = 1;
          filter.gain.value = 0;
          return filter;
        });
        // Quality filter — a lowpass that simulates the bitrate ceiling.
        // Default: lossless (cutoff 20 kHz — effectively bypassed).
        const qualityFilter = ctx.createBiquadFilter();
        qualityFilter.type = "lowpass";
        qualityFilter.frequency.value = 20000;
        qualityFilter.Q.value = 0.7;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.82;
        const preamp = ctx.createGain();
        preamp.gain.value = 1;
        const gain = ctx.createGain();

        // Wire: source → EQ chain → preamp → qualityFilter → analyser → gain → destination
        let node: AudioNode = source;
        for (const f of filters) {
          node.connect(f);
          node = f;
        }
        node.connect(preamp);
        preamp.connect(qualityFilter);
        qualityFilter.connect(analyser);
        analyser.connect(gain);
        gain.connect(ctx.destination);

        eng.ctx = ctx;
        eng.source = source;
        eng.eqFilters = filters;
        eng.preamp = preamp;
        eng.qualityFilter = qualityFilter;
        eng.analyser = analyser;
        eng.gain = gain;
      } catch {
        // Web Audio unavailable — fall back to plain audio element playback
      }
    },
    applyEq(enabled, bands) {
      if (!eng.ctx || eng.eqFilters.length === 0) return;
      eng.eqFilters.forEach((f, i) => {
        const target = enabled ? (bands[i] ?? 0) : 0;
        f.gain.setTargetAtTime(target, eng.ctx!.currentTime, 0.05);
      });
    },
    setPreamp(db) {
      if (!eng.ctx || !eng.preamp) return;
      const linear = Math.pow(10, db / 20);
      eng.preamp.gain.setTargetAtTime(linear, eng.ctx.currentTime, 0.05);
    },
    setGain(v) {
      if (!eng.ctx || !eng.gain) return;
      eng.gain.gain.setTargetAtTime(v, eng.ctx.currentTime, 0.03);
    },
    rampGain(to, ms) {
      if (!eng.ctx || !eng.gain) return;
      const t = eng.ctx.currentTime;
      eng.gain.gain.cancelScheduledValues(t);
      eng.gain.gain.setValueAtTime(eng.gain.gain.value, t);
      eng.gain.gain.linearRampToValueAtTime(to, t + ms / 1000);
    },
    applyQuality(q) {
      if (!eng.ctx || !eng.qualityFilter) return;
      // Low quality → ~8 kHz ceiling (simulated MP3 ~96 kbps)
      // High quality → 16 kHz ceiling (MP3 ~320 kbps)
      // Lossless → 20 kHz (effectively bypassed)
      const cutoff = q === "low" ? 8000 : q === "high" ? 16000 : 20000;
      eng.qualityFilter.frequency.setTargetAtTime(cutoff, eng.ctx.currentTime, 0.05);
    },
  };
  return eng;
}

export function getAudioEngine(): AudioEngine {
  if (!engine) engine = createEngine();
  return engine;
}

export function getAnalyser(): AnalyserNode | null {
  return engine?.analyser ?? null;
}

export { EQ_FREQS };
