# Task 2-a Work Record — Equalizer / Visualizer / Playback Extras

Agent: 2-a (audio panels agent)
Status: COMPLETED

## Files created (only these; no existing files modified)

1. `src/components/music-player/equalizer-panel.tsx`
2. `src/components/music-player/visualizer.tsx`
3. `src/components/music-player/playback-extras.tsx`

## Exported contracts (exactly as specified)

### equalizer-panel.tsx
- `export function EqualizerPanel({ compact = false }: { compact?: boolean })`
  - Card wrapper: `rounded-lg border border-white/10 bg-white/[0.03] p-4` (compact: `p-3`)
  - Header: SlidersHorizontal icon + "Equalizer" title, Switch bound to `eq.enabled` via `toggleEq()` (accent-colored when on), Reset button → `applyEqPreset('flat', EQ_PRESETS.flat)`
  - Preset shadcn Select bound to `eq.preset`; lists all `EQ_PRESETS` keys + disabled `custom` option; `onValueChange` → `applyEqPreset(name, EQ_PRESETS[name])`
  - 10 vertical band faders: horizontal Slider rotated -90deg inside an absolutely centered wrapper (`h-40`/compact `h-32` outer, `w-40`/`w-32` rotated inner), 0 dB center hairline, min -12 max +12 step 1, value shown as `+N dB` below, frequency labels `32 64 125 250 500 1K 2K 4K 8K 16K` derived from `EQ_FREQS`
  - Band drag → `setEqBand(i, v)` (store then flips preset to `custom`, Select shows "Custom")
  - Accent styling via `[&_[data-slot=slider-range]]:bg-[color:var(--accent)]!` + accent thumb border; bands dim (opacity-50) when EQ off (still interactive)
  - Store deps: `eq`, `setEqBand`, `applyEqPreset`, `toggleEq`

### visualizer.tsx
- `export function Visualizer({ className, height = 80, style, accentColor }: { className?: string; height?: number; style?: "bars" | "wave" | "off"; accentColor?: string })`
  - If `style` undefined → falls back to store `visualizerStyle` (`usePlayerStore(s => s.visualizerStyle)`)
  - `off` or analyser-not-yet-created → placeholder (`rounded border-white/10 bg-white/[0.03]`, centered Music icon + "Play to visualize"); analyser availability polled every 400ms via `getAnalyser()` (engine creates it lazily on first play); placeholder is an overlay on top of the always-mounted canvas
  - bars: 48 bottom-aligned bars from `getByteFrequencyData` (averaged bin slices over first 85% of bins), rounded tops (arcTo path helper), accent vertical gradient alpha fade (0.45 top → 1.0 bottom)
  - wave: `getByteTimeDomainData` polyline, accent gradient stroke
  - Color resolution order: `accentColor` prop → `getComputedStyle(document.documentElement).getPropertyValue('--accent')` → store `accent` → `#10B981`; draw loop re-created when store accent / accentColor changes
  - rAF loop, devicePixelRatio scaling (capped at 2), ResizeObserver on canvas; cleanup cancels rAF + disconnects observer + clears interval
  - Deps: `usePlayerStore` (visualizerStyle, accent), `getAnalyser` from `@/lib/audio-engine`

### playback-extras.tsx (three DropdownMenu-based toolbar triggers)
- `export function PlaybackSpeedMenu({ className, showLabel = true })`
  - Trigger: outline Button with Gauge icon + `{rate}x` label (hidden when `showLabel=false`)
  - Items 0.5x 0.75x 1x 1.25x 1.5x 2x; Check icon (accent) on active `playbackRate`; onSelect → `setPlaybackRate(r)` + `toast(\`Speed ${r}x\`)`
- `export function SleepTimerMenu({ className, showLabel = true })`
  - Trigger: Timer icon; label = mm:ss countdown (via 1s interval tick, remaining computed from `sleep.endsAt` with `formatTime`) when `mode==='time'`, "End of track" when `mode==='end-of-track'`, "Sleep" when off; accent tone when a timer is active
  - Content header label shows "Stops in mm:ss" / "Stops after current track" / "No timer set"
  - Items: 15/30/45/60/90 minutes → `startSleepTimer(m)` + toast; "End of current track" → `setSleepEndOfTrack()` + toast (check when active); "Cancel timer" (destructive, disabled when off) → `cancelSleepTimer()` + toast
- `export function AbRepeatControls({ className })`
  - Inline row: Loop icon (accent when A and B both set) + "Set A" / "Set B" / "Clear" small buttons
  - Labels become `A 1:23` / `B 2:45` (via `formatTime` + `abRepeat.a/b`); title tooltips include live `currentTime`
  - "Set B" disabled until A set; "Clear" disabled when both null; active points styled with `var(--accent)` (border + 10% bg + text)
  - Uses `setAbA` / `setAbB` / `clearAbRepeat`

## Deviations from spec (minor, intentional)
- Visualizer accent fallback chain includes store `accent` (between CSS var and `#10B981`) so it stays live even before `--accent` is set on `:root`.
- Visualizer: when analyser is missing, the placeholder is rendered as an absolute overlay over the (empty) canvas instead of replacing it — same visual result, avoids effect re-mount ordering issues.
- Sleep timer: check mark is shown only on "End of current track" (store does not record which minute preset started a running timer; header shows live remaining instead). Toast added on end-of-track + cancel actions.
- EQ bands remain interactive while EQ is toggled off (only dimmed), so users can pre-set gains; audio-engine.applyEq handles the enabled flag.
- Lint compliance: no synchronous `setState` in effect bodies (react-hooks/set-state-in-effect rule) — countdown uses a tick state + render-time `Date.now()`, analyser detection uses interval callback only.
- Tailwind v4 `!` important suffixes used on trigger/slider overrides to deterministically beat shadcn base classes (dark:bg-input/30 etc.).
- A-B repeat "Loop icon hint" uses lucide `Repeat` (the installed lucide-react version does not export `Loop` — verified via module inspection).

## Integration notes for other agents
- All components are self-contained `'use client'` and render their own card/toolbar chrome: `EqualizerPanel` renders its own card; the three playback-extras triggers are bare toolbar controls (compose them in a flex row).
- `Visualizer` accepts `className` on its wrapper; height is a number (px). Pass `accentColor` only if you need to override the global accent.
- Toasts use `sonner` — ensure a `<Toaster />` is mounted app-level (existing `src/components/ui/sonner.tsx`).

## Lint status
- `bun run lint` → PASS (0 errors, 0 warnings) after fixing 2 `react-hooks/set-state-in-effect` errors.
