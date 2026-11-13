"use client";

import { useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ListMusic, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { usePlayerStore, useCurrentTrack, formatTime } from "@/store/player-store";
import type { Track } from "@/data/music";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const scrollbarClasses =
  "[scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.12)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb:hover]:bg-white/20";

function TrackThumb({ track, compact }: { track: Track; compact?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "shrink-0 overflow-hidden rounded-md border border-white/10 shadow-md",
        compact ? "h-8 w-8" : "h-10 w-10"
      )}
      style={{ background: track.cover }}
    />
  );
}

interface SortableQueueRowProps {
  track: Track;
  absIndex: number;
  compact: boolean;
  onPlay: (trackId: string) => void;
  onRemove: (absIndex: number) => void;
}

function SortableQueueRow({
  track,
  absIndex,
  compact,
  onPlay,
  onRemove,
}: SortableQueueRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: absIndex });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      role="button"
      tabIndex={0}
      aria-label={`Play ${track.title} by ${track.artist}`}
      onClick={() => onPlay(track.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPlay(track.id);
        }
      }}
      className={cn(
        "group flex cursor-pointer items-center rounded-lg border border-transparent px-2 transition-colors hover:border-white/10 hover:bg-white/[0.05] focus-visible:border-white/20 focus-visible:bg-white/[0.05] focus-visible:outline-none",
        compact ? "gap-2 py-1.5" : "gap-3 py-2",
        isDragging && "relative z-10 border-white/10 bg-white/[0.08] shadow-xl"
      )}
    >
      {/* Drag handle (pointer + touch friendly) */}
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        aria-label={`Reorder ${track.title}`}
        className={cn(
          "-m-1 flex h-8 w-8 shrink-0 touch-none cursor-grab items-center justify-center rounded-md text-zinc-500 outline-none active:cursor-grabbing hover:text-zinc-300 focus-visible:ring-2 focus-visible:ring-white/20",
          "opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 [@media(pointer:coarse)]:opacity-100"
        )}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <TrackThumb track={track} compact={compact} />

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-white">{track.title}</div>
        <div className="truncate text-xs text-zinc-400">{track.artist}</div>
      </div>

      <span className="shrink-0 text-xs tabular-nums text-zinc-500">
        {formatTime(track.duration)}
      </span>

      <button
        type="button"
        aria-label={`Remove ${track.title} from queue`}
        onClick={(e) => {
          e.stopPropagation();
          onRemove(absIndex);
        }}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/10 hover:text-zinc-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:outline-none opacity-0 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function QueuePanel({ compact = false }: { compact?: boolean }) {
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const tracks = usePlayerStore((s) => s.tracks);
  const localTracks = usePlayerStore((s) => s.localTracks);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);
  const reorderQueue = usePlayerStore((s) => s.reorderQueue);
  const clearQueueUpcoming = usePlayerStore((s) => s.clearQueueUpcoming);
  const currentTrack = useCurrentTrack();

  const trackById = useMemo(() => {
    const map = new Map<string, Track>();
    for (const t of tracks) map.set(t.id, t);
    for (const t of localTracks) map.set(t.id, t);
    return map;
  }, [tracks, localTracks]);

  // Upcoming tracks mapped to their ABSOLUTE index in the queue
  const upcoming = useMemo(
    () =>
      queue
        .map((id, absIndex) => ({ id, absIndex }))
        .filter((item) => item.absIndex > currentIndex && trackById.has(item.id)),
    [queue, currentIndex, trackById]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = Number(active.id);
    const to = Number(over.id);
    if (Number.isNaN(from) || Number.isNaN(to)) return;
    reorderQueue(from, to);
  };

  const handleRemove = (absIndex: number) => {
    const id = queue[absIndex];
    const track = id ? trackById.get(id) : undefined;
    removeFromQueue(absIndex);
    toast(
      track ? `Removed “${track.title}” from queue` : "Removed from queue"
    );
  };

  const handleClearUpcoming = () => {
    if (upcoming.length === 0) return;
    clearQueueUpcoming();
    toast(
      `Cleared ${upcoming.length} upcoming track${upcoming.length === 1 ? "" : "s"}`
    );
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ListMusic className="h-5 w-5 text-[color:var(--accent)]" />
          <h2 className="text-base font-semibold tracking-tight text-zinc-100">
            Queue
          </h2>
          <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium tabular-nums text-zinc-400">
            {queue.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearUpcoming}
          disabled={upcoming.length === 0}
          className="h-7 gap-1.5 px-2 text-xs text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear upcoming
        </Button>
      </div>

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto pr-1",
          scrollbarClasses,
          compact && "max-h-72"
        )}
      >
        {/* Now playing (not draggable) */}
        <section aria-label="Now playing" className="mb-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Now playing
          </div>
          {currentTrack ? (
            <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-2">
              <TrackThumb track={currentTrack} compact={compact} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-[color:var(--accent)]">
                  {currentTrack.title}
                </div>
                <div className="truncate text-xs text-zinc-400">
                  {currentTrack.artist}
                </div>
              </div>
              <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                {formatTime(currentTrack.duration)}
              </span>
            </div>
          ) : (
            <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-zinc-500">
              Nothing playing yet.
            </p>
          )}
        </section>

        {/* Next up — draggable */}
        <section aria-label="Next up">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Next up · {upcoming.length}
          </div>
          {upcoming.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/10 px-4 py-6 text-center text-sm text-zinc-500">
              End of queue
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={upcoming.map((u) => u.absIndex)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1">
                  {upcoming.map((u) => {
                    const track = trackById.get(u.id);
                    if (!track) return null;
                    return (
                      <SortableQueueRow
                        key={`${u.absIndex}-${u.id}`}
                        track={track}
                        absIndex={u.absIndex}
                        compact={compact}
                        onPlay={(trackId) => playTrack(trackId, queue)}
                        onRemove={handleRemove}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </section>
      </div>
    </div>
  );
}
