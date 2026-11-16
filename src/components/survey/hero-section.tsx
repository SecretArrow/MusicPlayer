"use client";

import { ChevronDown, Music4, Sparkles } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Background grid + glow */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-emerald-500/20 blur-[120px]" />
        <div className="absolute -right-32 top-32 h-96 w-96 rounded-full bg-purple-500/20 blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-pink-500/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto flex min-h-[80vh] max-w-7xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6 lg:px-8">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
          Survey · Design System · Web Demo
        </div>

        <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
          The World&apos;s Top{" "}
          <span className="bg-gradient-to-r from-emerald-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            25 Music Players
          </span>
          , One Design
        </h1>

        <p className="mt-6 max-w-2xl text-pretty text-base text-zinc-400 sm:text-lg">
          A complete survey of the music streaming landscape in 2025 — global giants, regional
          champions, audiophile-grade services, and beloved local players — paired with a working
          music player design that adapts seamlessly between PC and Android.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <a
            href="#player"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-emerald-950 shadow-lg transition-all hover:scale-105 hover:bg-emerald-400"
          >
            <Music4 className="h-4 w-4" />
            Launch the Player Demo
          </a>
          <a
            href="#survey"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-zinc-200 backdrop-blur transition-colors hover:bg-white/10"
          >
            Read the Survey
          </a>
        </div>

        {/* Quick stats */}
        <div className="mt-16 grid grid-cols-2 gap-6 text-center sm:grid-cols-4">
          {[
            { v: "921M", l: "Subscribers" },
            { v: "$22B", l: "Streaming revenue" },
            { v: "25", l: "Players surveyed" },
            { v: "2", l: "Layouts in demo" },
          ].map((s) => (
            <div key={s.l}>
              <div className="text-2xl font-bold text-white sm:text-3xl">{s.v}</div>
              <div className="mt-1 text-xs uppercase tracking-wider text-zinc-500">{s.l}</div>
            </div>
          ))}
        </div>

        <a
          href="#survey"
          className="mt-16 inline-flex animate-bounce items-center justify-center text-zinc-500 hover:text-white"
          aria-label="Scroll down"
        >
          <ChevronDown className="h-6 w-6" />
        </a>
      </div>
    </section>
  );
}
