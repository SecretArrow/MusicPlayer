"use client";

import { useMemo, useState } from "react";
import { topPlayers, surveyStats, type PlayerCategory } from "@/data/players";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const categoryFilters: { value: PlayerCategory | "all"; label: string }[] = [
  { value: "all", label: "All 25" },
  { value: "streaming", label: "Global Streaming" },
  { value: "regional", label: "Regional Giants" },
  { value: "audiophile", label: "Hi-Fi / Audiophile" },
  { value: "local", label: "Local Players" },
];

export function PlayerSurvey() {
  const [filter, setFilter] = useState<PlayerCategory | "all">("all");

  const filtered = useMemo(() => {
    if (filter === "all") return topPlayers;
    return topPlayers.filter((p) => p.category === filter);
  }, [filter]);

  return (
    <section id="survey" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Section header */}
      <div className="mb-10 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 items-center rounded-full bg-emerald-500/15 px-3 text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Survey Results
          </span>
          <span className="text-xs text-zinc-500">Updated Nov 2025</span>
        </div>
        <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Top 25 Music Players Worldwide
        </h2>
        <p className="max-w-3xl text-pretty text-zinc-400">
          A consolidated survey of the most popular music players across every major platform —
          global streaming services, regional giants, audiophile-grade players, and beloved local
          offline apps. Ranked by monthly active users, subscribers and cultural footprint.
        </p>
      </div>

      {/* Stat strip */}
      <div className="mb-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {surveyStats.map((s) => (
          <Card
            key={s.label}
            className="border-white/10 bg-white/[0.03] p-5 backdrop-blur"
          >
            <div className="text-2xl font-bold text-emerald-400">{s.value}</div>
            <div className="mt-1 text-sm font-medium text-white">{s.label}</div>
            <div className="mt-1 text-xs text-zinc-500">{s.detail}</div>
          </Card>
        ))}
      </div>

      {/* Category filter chips */}
      <div className="mb-6 flex flex-wrap gap-2">
        {categoryFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              filter === f.value
                ? "border-emerald-500 bg-emerald-500 text-emerald-950"
                : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/20 hover:bg-white/[0.06]"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <Card
            key={p.rank}
            className="group relative overflow-hidden border-white/10 bg-white/[0.03] p-5 transition-all hover:border-white/20 hover:bg-white/[0.06]"
          >
            {/* Accent glow */}
            <div
              className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-15 blur-2xl transition-opacity group-hover:opacity-30"
              style={{ background: p.accentColor }}
            />
            {/* Rank badge */}
            <div className="mb-3 flex items-start justify-between">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{ background: p.accentColor }}
              >
                {p.rank}
              </div>
              <Badge
                variant="outline"
                className="border-white/15 bg-white/5 text-[10px] uppercase tracking-wide text-zinc-400"
              >
                {p.categoryLabel}
              </Badge>
            </div>

            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h3 className="text-lg font-bold text-white">{p.name}</h3>
              {p.marketShare && (
                <span className="text-xs font-semibold text-emerald-400">
                  {p.marketShare}
                </span>
              )}
            </div>

            <p className="mb-3 line-clamp-3 text-sm text-zinc-400">{p.description}</p>

            <div className="mb-3 flex flex-wrap gap-1.5">
              {p.platforms.slice(0, 5).map((pl) => (
                <span
                  key={pl}
                  className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-medium text-zinc-400"
                >
                  {pl}
                </span>
              ))}
              {p.platforms.length > 5 && (
                <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-zinc-500">
                  +{p.platforms.length - 5}
                </span>
              )}
            </div>

            <div className="space-y-1.5 border-t border-white/5 pt-3 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Users</span>
                <span className="font-medium text-zinc-200">{p.users}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Price</span>
                <span className="font-medium text-zinc-200">{p.price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Founded</span>
                <span className="font-medium text-zinc-200">
                  {p.founded} · {p.hq}
                </span>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-md bg-white/[0.02] px-3 py-2 text-xs">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: p.accentColor }}
              />
              <span className="line-clamp-1 text-zinc-300">{p.keyFeature}</span>
            </div>
          </Card>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-zinc-600">
        Sources: MIDiA Research (Q4 2025), IFPI Global Music Report 2025, CNET, What Hi-Fi?, PCMag,
        Business of Apps. Figures rounded to the latest publicly disclosed value.
      </p>
    </section>
  );
}
