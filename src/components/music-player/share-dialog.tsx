"use client";

import { Facebook, Link2, MessageCircle, Twitter } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CoverArt } from "./cover-art";
import { findTrack, usePlayerStore } from "@/store/player-store";

const SHARE_TARGETS = [
  { label: "X", icon: Twitter },
  { label: "Facebook", icon: Facebook },
  { label: "Messages", icon: MessageCircle },
];

export function ShareDialog() {
  const shareTrackId = usePlayerStore((s) => s.shareTrackId);
  const setShareTrack = usePlayerStore((s) => s.setShareTrack);

  const track = shareTrackId ? findTrack(shareTrackId) : null;
  if (!track) return null;

  const link = `https://aurora-player.example/t/${track.id}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast("Link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) setShareTrack(null);
      }}
    >
      <DialogContent className="max-w-sm border-white/10 bg-zinc-900 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Share track</DialogTitle>
          <DialogDescription className="text-zinc-500">
            Copy a link or share &quot;{track.title}&quot; with friends.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3">
          <CoverArt
            cover={track.cover}
            accent={track.accent}
            title={track.title}
            size="lg"
            rounded="rounded-lg"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-100">
              {track.title}
            </p>
            <p className="truncate text-sm text-zinc-400">{track.artist}</p>
            <p className="mt-1 truncate text-xs text-zinc-500">
              {track.album} &middot; {track.year}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={link}
            aria-label="Share link"
            onFocus={(e) => e.currentTarget.select()}
            className="border-white/10 bg-white/5 font-mono text-xs text-zinc-300"
          />
          <Button
            type="button"
            size="sm"
            onClick={copyLink}
            className="shrink-0 bg-[color:var(--accent)] text-zinc-950 hover:bg-[color:var(--accent)] hover:opacity-90"
          >
            <Link2 className="size-4" />
            Copy
          </Button>
        </div>

        <div className="flex gap-2">
          {SHARE_TARGETS.map(({ label, icon: Icon }) => (
            <Button
              key={label}
              type="button"
              variant="outline"
              onClick={() => toast(`Shared to ${label} (demo)`)}
              className="flex-1 border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10 hover:text-zinc-100"
            >
              <Icon className="size-4" />
              {label}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
