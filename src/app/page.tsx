"use client";

import { MusicPlayerApp } from "@/components/music-player/music-player-demo";
import { Toaster } from "@/components/ui/sonner";

export default function Home() {
  return (
    <main className="h-dvh w-full overflow-hidden bg-zinc-950">
      <MusicPlayerApp />
      <Toaster
        position="bottom-right"
        theme="dark"
        toastOptions={{
          style: {
            background: "#18181B",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#F4F4F5",
          },
        }}
      />
    </main>
  );
}
