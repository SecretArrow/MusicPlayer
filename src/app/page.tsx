"use client";

import { HeroSection } from "@/components/survey/hero-section";
import { PlayerSurvey } from "@/components/survey/player-survey";
import { MusicPlayerDemo } from "@/components/music-player/music-player-demo";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* Dark wrapper for the whole page */}
      <div className="bg-zinc-950">
        <HeroSection />
        <PlayerSurvey />
        <MusicPlayerDemo />
        <footer className="border-t border-white/5 bg-zinc-950 px-4 py-8 text-center text-xs text-zinc-600">
          <p>
            Built with Next.js · Tailwind CSS · shadcn/ui · Zustand · Framer Motion
          </p>
          <p className="mt-1">
            Survey data compiled from MIDiA Research, IFPI, CNET, What Hi-Fi?, PCMag &amp;
            Business of Apps (latest publicly disclosed figures, 2025).
          </p>
          <p className="mt-1">
            Demo audio courtesy of SoundHelix royalty-free samples. Cover art generated with CSS
            gradients.
          </p>
        </footer>
      </div>
    </main>
  );
}
