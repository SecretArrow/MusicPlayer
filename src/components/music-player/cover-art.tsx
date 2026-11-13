"use client";

import { cn } from "@/lib/utils";

interface CoverArtProps {
  cover: string; // gradient CSS
  accent: string;
  title: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  rounded?: string;
}

const sizeMap: Record<NonNullable<CoverArtProps["size"]>, string> = {
  xs: "h-10 w-10",
  sm: "h-12 w-12",
  md: "h-14 w-14",
  lg: "h-20 w-20",
  xl: "h-44 w-44",
  "2xl": "h-64 w-64",
};

export function CoverArt({
  cover,
  accent,
  title,
  size = "md",
  className,
  rounded = "rounded-md",
}: CoverArtProps) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden shadow-lg",
        sizeMap[size],
        rounded,
        className
      )}
      style={{ background: cover }}
      aria-label={`Cover art for ${title}`}
    >
      <div
        className="absolute inset-0 opacity-25 mix-blend-overlay"
        style={{
          backgroundImage:
            "radial-gradient(circle at 25% 20%, rgba(255,255,255,0.6) 0%, transparent 35%), radial-gradient(circle at 80% 80%, rgba(0,0,0,0.5) 0%, transparent 40%)",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-1"
        style={{ background: accent }}
      />
      <svg
        viewBox="0 0 24 24"
        className="h-1/2 w-1/2 text-white/90"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M12 3v9.28a4 4 0 1 0 2 3.47V6h4V3h-6z" />
      </svg>
    </div>
  );
}
