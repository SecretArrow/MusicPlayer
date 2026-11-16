"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Track } from "@/data/music";
import { AnimatePresence, motion } from "framer-motion";
import {
  AudioLines,
  ChevronRight,
  Disc3,
  Gauge,
  Heart,
  Keyboard,
  ListEnd,
  ListPlus,
  ListStart,
  Palette,
  Play,
  Plus,
  Share2,
  SlidersHorizontal,
  Timer,
  User,
  Volume1,
  Waves,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  findTrack,
  formatTime,
  useCurrentTrack,
  usePlayerStore,
} from "@/store/player-store";
import { getTheme } from "@/data/themes";
import { EqualizerPanel } from "./equalizer-panel";
import { ThemePicker } from "./theme-picker";

// ---------- Shared sheet chrome ----------

const SHEET_EASE: [number, number, number, number] = [0.32, 0.72, 0, 1];

const SCROLLBAR =
  "[&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-700";

const SELECT_ITEM_CLS =
  "text-xs text-zinc-100 focus:bg-white/10 focus:text-white";

const SELECT_TRIGGER_CLS =
  "border-white/10 bg-white/5 text-xs text-zinc-100";

/**
 * Portals-free absolute overlay frame: fading backdrop + slide-up panel.
 * Rendered inside the parent's relatively-positioned screen container.
 */
function SheetFrame({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children?: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div key="sheet-frame" className="absolute inset-0 z-40">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          {/* Slide-up panel */}
          <motion.div
            className="absolute inset-0 flex flex-col bg-zinc-900/95 backdrop-blur-xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.2, ease: SHEET_EASE }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DragHandle() {
  return (
    <div className="flex justify-center pt-3" aria-hidden="true">
      <div className="h-1 w-28 rounded-full bg-zinc-600" />
    </div>
  );
}

function SheetHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-5 py-2">
      <h2 className="text-base font-bold text-white">{title}</h2>
      <button
        onClick={onClose}
        aria-label="Close"
        className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

/** Options-sheet row: label (icon + text + optional sub text) with a control on the right. */
function OptionRow({
  icon: Icon,
  label,
  sub,
  children,
}: {
  icon: LucideIcon;
  label: string;
  sub?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/5 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <Icon className="h-4 w-4 shrink-0 text-zinc-400" />
          <span className="text-sm text-zinc-100">{label}</span>
        </div>
        {sub && (
          <div className="pl-7 pt-0.5 text-[11px] text-zinc-400">{sub}</div>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/** Tappable full-width row: icon + label, optional trailing element. */
function ActionRow({
  icon: Icon,
  iconClassName,
  label,
  onClick,
  right,
}: {
  icon: LucideIcon;
  iconClassName?: string;
  label: string;
  onClick?: () => void;
  right?: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 border-b border-white/5 py-3 text-left transition-colors hover:bg-white/[0.04]"
    >
      <span className="flex min-w-0 items-center gap-3">
        <Icon className={cn("h-5 w-5 shrink-0 text-zinc-400", iconClassName)} />
        <span className="truncate text-sm text-zinc-100">{label}</span>
      </span>
      {right}
    </button>
  );
}

// ---------- Constants ----------

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const SLEEP_MINUTES = [15, 30, 45, 60, 90];

const QUALITY_LABEL: Record<"low" | "high" | "lossless", string> = {
  low: "Low",
  high: "High",
  lossless: "Lossless",
};

// ---------- OptionsSheet ----------

export function OptionsSheet({
  open,
  onClose,
  onOpenEqualizer,
  onOpenThemes,
}: {
  open: boolean;
  onClose: () => void;
  onOpenEqualizer: () => void;
  onOpenThemes: () => void;
}) {
  const playbackRate = usePlayerStore((s) => s.playbackRate);
  const setPlaybackRate = usePlayerStore((s) => s.setPlaybackRate);
  const sleep = usePlayerStore((s) => s.sleep);
  const startSleepTimer = usePlayerStore((s) => s.startSleepTimer);
  const setSleepEndOfTrack = usePlayerStore((s) => s.setSleepEndOfTrack);
  const cancelSleepTimer = usePlayerStore((s) => s.cancelSleepTimer);
  const audioQuality = usePlayerStore((s) => s.audioQuality);
  const setAudioQuality = usePlayerStore((s) => s.setAudioQuality);
  const crossfade = usePlayerStore((s) => s.crossfade);
  const setCrossfade = usePlayerStore((s) => s.setCrossfade);
  const normalize = usePlayerStore((s) => s.normalize);
  const setNormalize = usePlayerStore((s) => s.setNormalize);
  const setShareTrack = usePlayerStore((s) => s.setShareTrack);
  const currentTrack = useCurrentTrack();

  const [now, setNow] = useState(() => Date.now());

  // Live countdown: tick every second while the sheet is open with a timed sleep running
  useEffect(() => {
    if (!open || sleep.mode !== "time" || sleep.endsAt == null) return;
    const update = () => setNow(Date.now());
    // Refresh asynchronously right away, then once per second
    const initial = setTimeout(update, 0);
    const timer = setInterval(update, 1000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [open, sleep.mode, sleep.endsAt]);

  // Derive the Select value from the current sleep mode (nearest option while counting down)
  const sleepSelectValue = (() => {
    if (sleep.mode === "off") return "off";
    if (sleep.mode === "end-of-track") return "eot";
    const minsLeft = Math.max(
      1,
      Math.round(((sleep.endsAt ?? 0) - now) / 60000)
    );
    return String(
      SLEEP_MINUTES.reduce((best, m) =>
        Math.abs(m - minsLeft) < Math.abs(best - minsLeft) ? m : best
      )
    );
  })();

  const sleepSub: ReactNode =
    sleep.mode === "time" && sleep.endsAt != null ? (
      <span className="text-[color:var(--accent)]">
        Ends in{" "}
        {formatTime(Math.max(0, Math.ceil((sleep.endsAt - now) / 1000)))}
      </span>
    ) : sleep.mode === "end-of-track" ? (
      <span>Will stop after the current track</span>
    ) : undefined;

  const handleSleepChange = (v: string) => {
    if (v === "off") cancelSleepTimer();
    else if (v === "eot") setSleepEndOfTrack();
    else startSleepTimer(Number(v));
  };

  return (
    <SheetFrame open={open} onClose={onClose}>
      <DragHandle />
      <SheetHeader title="Playback options" onClose={onClose} />

      <div className={cn("flex-1 overflow-y-auto px-5 pb-6", SCROLLBAR)}>
        {/* Playback speed */}
        <OptionRow icon={Gauge} label="Playback speed">
          <Select
            value={String(playbackRate)}
            onValueChange={(v) => setPlaybackRate(Number(v))}
          >
            <SelectTrigger
              size="sm"
              className={cn(SELECT_TRIGGER_CLS, "w-[76px]")}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-zinc-800">
              {SPEEDS.map((r) => (
                <SelectItem key={r} value={String(r)} className={SELECT_ITEM_CLS}>
                  {r}x
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </OptionRow>

        {/* Sleep timer */}
        <OptionRow icon={Timer} label="Sleep timer" sub={sleepSub}>
          <Select value={sleepSelectValue} onValueChange={handleSleepChange}>
            <SelectTrigger
              size="sm"
              className={cn(SELECT_TRIGGER_CLS, "w-32")}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-zinc-800">
              <SelectItem value="off" className={SELECT_ITEM_CLS}>
                Off
              </SelectItem>
              {SLEEP_MINUTES.map((m) => (
                <SelectItem
                  key={m}
                  value={String(m)}
                  className={SELECT_ITEM_CLS}
                >
                  {m} min
                </SelectItem>
              ))}
              <SelectItem value="eot" className={SELECT_ITEM_CLS}>
                End of track
              </SelectItem>
            </SelectContent>
          </Select>
        </OptionRow>

        {/* Audio quality */}
        <OptionRow icon={AudioLines} label="Audio quality">
          <Select
            value={audioQuality}
            onValueChange={(v) => {
              const q = v as "low" | "high" | "lossless";
              setAudioQuality(q);
              toast(`Audio quality set to ${QUALITY_LABEL[q]}`);
            }}
          >
            <SelectTrigger
              size="sm"
              className={cn(SELECT_TRIGGER_CLS, "w-24")}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-zinc-800">
              {(Object.keys(QUALITY_LABEL) as ("low" | "high" | "lossless")[]).map(
                (q) => (
                  <SelectItem key={q} value={q} className={SELECT_ITEM_CLS}>
                    {QUALITY_LABEL[q]}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </OptionRow>

        {/* Fade transitions */}
        <OptionRow icon={Waves} label="Fade transitions">
          <Switch
            checked={crossfade}
            onCheckedChange={setCrossfade}
            aria-label="Toggle fade transitions"
            className="data-[state=checked]:bg-[color:var(--accent)]"
          />
        </OptionRow>

        {/* Volume normalization */}
        <OptionRow icon={Volume1} label="Volume normalization">
          <Switch
            checked={normalize}
            onCheckedChange={setNormalize}
            aria-label="Toggle volume normalization"
            className="data-[state=checked]:bg-[color:var(--accent)]"
          />
        </OptionRow>

        {/* Theme picker */}
        <ActionRow
          icon={Palette}
          label="Theme"
          onClick={onOpenThemes}
          right={<ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />}
        />

        {/* Equalizer */}
        <ActionRow
          icon={SlidersHorizontal}
          label="Equalizer"
          onClick={onOpenEqualizer}
          right={<ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />}
        />

        {/* Share current song */}
        <ActionRow
          icon={Share2}
          label="Share current song"
          onClick={() => {
            if (!currentTrack) {
              toast("No song is playing");
              return;
            }
            setShareTrack(currentTrack.id);
            onClose();
          }}
        />

        {/* Keyboard shortcuts */}
        <ActionRow
          icon={Keyboard}
          label="Keyboard shortcuts"
          onClick={() => toast("Shortcuts available on desktop (press ?)")}
        />
      </div>
    </SheetFrame>
  );
}

// ---------- EqualizerSheet ----------

export function EqualizerSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <SheetFrame open={open} onClose={onClose}>
      <DragHandle />
      <SheetHeader title="Equalizer" onClose={onClose} />
      <div className={cn("flex-1 overflow-y-auto px-5 pt-1 pb-6", SCROLLBAR)}>
        <EqualizerPanel compact />
      </div>
    </SheetFrame>
  );
}

// ---------- ThemeSheet ----------

export function ThemeSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const themeKey = usePlayerStore((s) => s.themeKey);
  const theme = getTheme(themeKey);

  return (
    <SheetFrame open={open} onClose={onClose}>
      <DragHandle />
      <SheetHeader title="Theme" onClose={onClose} />
      <div className={cn("flex-1 overflow-y-auto px-5 pt-1 pb-6", SCROLLBAR)}>
        <ThemePicker columns={2} compact />
        <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
          <span className="text-zinc-300">{theme.label}</span> — {theme.description}
        </p>
      </div>
    </SheetFrame>
  );
}

// ---------- TrackActionsSheet ----------

export function TrackActionsSheet({
  trackId,
  open,
  onClose,
}: {
  trackId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  // Guard: nothing to resolve -> render nothing
  const track = trackId ? findTrack(trackId) : null;

  return (
    <SheetFrame open={open && track !== null} onClose={onClose}>
      {/* Keyed by track id so per-track UI state (playlist sub-list) resets on change */}
      {track && (
        <TrackActionsContent key={track.id} track={track} onClose={onClose} />
      )}
    </SheetFrame>
  );
}

function TrackActionsContent({
  track,
  onClose,
}: {
  track: Track;
  onClose: () => void;
}) {
  const playlists = usePlayerStore((s) => s.playlists);
  const likedTrackIds = usePlayerStore((s) => s.likedTrackIds);
  const toggleLike = usePlayerStore((s) => s.toggleLike);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const playNext = usePlayerStore((s) => s.playNext);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const addToPlaylist = usePlayerStore((s) => s.addToPlaylist);
  const createPlaylist = usePlayerStore((s) => s.createPlaylist);
  const setActiveArtist = usePlayerStore((s) => s.setActiveArtist);
  const setActiveAlbum = usePlayerStore((s) => s.setActiveAlbum);
  const setShareTrack = usePlayerStore((s) => s.setShareTrack);

  const [showPlaylists, setShowPlaylists] = useState(false);
  const isLiked = likedTrackIds.has(track.id);

  const handleNewPlaylist = () => {
    const n = playlists.filter((p) => p.editable).length + 1;
    const title = `My Playlist #${n}`;
    const id = createPlaylist(title);
    addToPlaylist(id, track.id);
    toast(`Created "${title}" and added the track`);
    onClose();
  };

  return (
    <>
      <DragHandle />

      {/* Track header */}
      <div className="flex items-center gap-3 px-5 pb-2 pt-2">
        <div
          className="h-11 w-11 shrink-0 rounded-md"
          style={{ background: track.cover }}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-white">
            {track.title}
          </div>
          <div className="truncate text-xs text-zinc-400">{track.artist}</div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Actions */}
      <div className={cn("flex-1 overflow-y-auto px-5 pb-6", SCROLLBAR)}>
        <ActionRow
          icon={Play}
          label="Play now"
          onClick={() => {
            playTrack(track.id);
            toast(`Playing "${track.title}"`);
            onClose();
          }}
        />
        <ActionRow
          icon={ListStart}
          label="Play next"
          onClick={() => {
            playNext(track.id);
            toast(`"${track.title}" will play next`);
            onClose();
          }}
        />
        <ActionRow
          icon={ListEnd}
          label="Add to queue"
          onClick={() => {
            addToQueue(track.id);
            toast(`"${track.title}" added to queue`);
            onClose();
          }}
        />
        <ActionRow
          icon={ListPlus}
          label="Add to playlist"
          onClick={() => setShowPlaylists((v) => !v)}
          right={
            <ChevronRight
              className={cn(
                "h-4 w-4 shrink-0 text-zinc-500 transition-transform",
                showPlaylists && "rotate-90"
              )}
            />
          }
        />

        {/* Inline playlist sub-list */}
        {showPlaylists && (
          <div
            className={cn(
              "ml-7 max-h-56 overflow-y-auto border-b border-white/5 py-2 pr-1",
              SCROLLBAR
            )}
          >
            {playlists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => {
                  addToPlaylist(pl.id, track.id);
                  toast(`Added to "${pl.title}"`);
                  onClose();
                }}
                className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-white/[0.06]"
              >
                <span
                  className="h-7 w-7 shrink-0 rounded"
                  style={{ background: pl.cover }}
                />
                <span className="truncate text-sm text-zinc-100">
                  {pl.title}
                </span>
                <span className="ml-auto shrink-0 text-[10px] tabular-nums text-zinc-500">
                  {pl.trackIds.length}
                </span>
              </button>
            ))}
            <button
              onClick={handleNewPlaylist}
              className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-white/[0.06]"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-dashed border-[color:var(--accent)]/60 text-[color:var(--accent)]">
                <Plus className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium text-[color:var(--accent)]">
                New playlist
              </span>
            </button>
          </div>
        )}

        <ActionRow
          icon={Heart}
          iconClassName={
            isLiked ? "fill-current text-[color:var(--accent)]" : undefined
          }
          label={isLiked ? "Liked" : "Like"}
          onClick={() => {
            toggleLike(track.id);
            toast(
              isLiked ? "Removed from Liked Songs" : "Added to Liked Songs"
            );
          }}
        />
        <ActionRow
          icon={User}
          label="Go to artist"
          onClick={() => {
            setActiveArtist(track.artistId);
            onClose();
          }}
        />
        <ActionRow
          icon={Disc3}
          label="Go to album"
          onClick={() => {
            setActiveAlbum(track.albumId);
            onClose();
          }}
        />
        <ActionRow
          icon={Share2}
          label="Share"
          onClick={() => {
            setShareTrack(track.id);
            onClose();
          }}
        />
      </div>
    </>
  );
}
