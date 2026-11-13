/**
 * Built-in player themes.
 *
 * Strategy: the whole UI is styled with Tailwind zinc-* utilities, and in
 * Tailwind v4 every color utility compiles to a CSS variable reference
 * (e.g. `bg-zinc-900` -> `background-color: var(--color-zinc-900)`).
 * Overriding those variables re-skins the entire player at runtime —
 * no component changes needed. `--color-white` is remapped too so that
 * alpha overlays (`bg-white/5`, `border-white/10`) stay visible on light
 * themes, and `--accent` provides each theme's highlight color.
 */

export interface PlayerTheme {
  key: string;
  label: string;
  description: string;
  dark: boolean;
  /** Default accent used for highlights (store accent is set to this on switch) */
  accent: string;
  /** [background, surface, accent] — used by the theme picker preview */
  swatch: [string, string, string];
  /** CSS variable overrides applied to the app root + documentElement */
  vars: Record<string, string>;
}

type Scale = [string, string, string, string, string, string, string, string, string, string, string];

/** Build overrides for --color-zinc-50 … --color-zinc-950 from a 50→950 scale. */
function zinc(scale: Scale): Record<string, string> {
  const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  const vars: Record<string, string> = {};
  steps.forEach((step, i) => {
    vars[`--color-zinc-${step}`] = scale[i];
  });
  return vars;
}

export const THEMES: PlayerTheme[] = [
  {
    key: "midnight",
    label: "Midnight",
    description: "Deep charcoal with emerald glow — the original look",
    dark: true,
    accent: "#10B981",
    swatch: ["#09090B", "#18181B", "#10B981"],
    vars: {},
  },
  {
    key: "aurora",
    label: "Aurora",
    description: "Arctic navy night under a cyan shimmer",
    dark: true,
    accent: "#22D3EE",
    swatch: ["#070B14", "#101B2D", "#22D3EE"],
    vars: zinc([
      "#F0F5FC", "#E1EAF6", "#C6D4EA", "#A9BBD9", "#8CA3C7",
      "#45587D", "#2A3B5C", "#1B2A44", "#101B2D", "#0B1220", "#070B14",
    ]),
  },
  {
    key: "sunset",
    label: "Sunset",
    description: "Warm ember browns with molten amber highlights",
    dark: true,
    accent: "#F59E0B",
    swatch: ["#140C07", "#2A1A0F", "#F59E0B"],
    vars: zinc([
      "#FDF4E3", "#F7E6C8", "#EAD1AC", "#D9B68C", "#C49A6C",
      "#7A5230", "#54371F", "#3D2817", "#2A1A0F", "#1D120A", "#140C07",
    ]),
  },
  {
    key: "rosewood",
    label: "Rosewood",
    description: "Velvet maroon tones with a rose neon edge",
    dark: true,
    accent: "#FB7185",
    swatch: ["#12070B", "#2A0F19", "#FB7185"],
    vars: zinc([
      "#FDF0F4", "#F7E1E9", "#E9C6D2", "#D6A5B8", "#C08CA0",
      "#772C46", "#541D31", "#3D1524", "#2A0F19", "#1B0A11", "#12070B",
    ]),
  },
  {
    key: "violet",
    label: "Violet Night",
    description: "Cosmic purple dusk with soft lavender text",
    dark: true,
    accent: "#A78BFA",
    swatch: ["#0B0714", "#1A1230", "#A78BFA"],
    vars: zinc([
      "#F8F3FD", "#EDE4F8", "#D4C6EB", "#BBAADC", "#A293CB",
      "#51418F", "#382866", "#271C48", "#1A1230", "#110B1E", "#0B0714",
    ]),
  },
  {
    key: "ocean",
    label: "Ocean",
    description: "Abyssal navy depths with sky-blue currents",
    dark: true,
    accent: "#38BDF8",
    swatch: ["#050B12", "#0C1E30", "#38BDF8"],
    vars: zinc([
      "#F3F9FD", "#E4F1F9", "#C4DBEC", "#A3C3DB", "#7FA9C9",
      "#2A6188", "#1C4365", "#13304A", "#0C1E30", "#081420", "#050B12",
    ]),
  },
  {
    key: "forest",
    label: "Forest",
    description: "Pine-black greens lit by lime fireflies",
    dark: true,
    accent: "#84CC16",
    swatch: ["#070D08", "#112113", "#84CC16"],
    vars: zinc([
      "#F3FAF3", "#E5F2E5", "#C6DFC8", "#A6C6AB", "#86AC8F",
      "#39653F", "#26482D", "#1B3320", "#112113", "#0B140C", "#070D08",
    ]),
  },
  {
    key: "mono",
    label: "Monochrome",
    description: "Pure grayscale — let the music do the talking",
    dark: true,
    accent: "#FFFFFF",
    swatch: ["#0A0A0A", "#1F1F1F", "#FFFFFF"],
    vars: zinc([
      "#F7F7F7", "#ECECEC", "#D4D4D4", "#B8B8B8", "#9C9C9C",
      "#6E6E6E", "#454545", "#303030", "#1F1F1F", "#141414", "#0A0A0A",
    ]),
  },
  {
    key: "coffee",
    label: "Coffee",
    description: "Roasted espresso browns with caramel cream",
    dark: true,
    accent: "#E8A33D",
    swatch: ["#100B07", "#241A11", "#E8A33D"],
    vars: zinc([
      "#FBF3E7", "#F4E5D2", "#E4CDB4", "#CFB595", "#B99B77",
      "#6E5334", "#4C3823", "#362818", "#241A11", "#17110B", "#100B07",
    ]),
  },
  {
    key: "daylight",
    label: "Daylight",
    description: "Clean light mode with an indigo accent",
    dark: false,
    accent: "#6366F1",
    swatch: ["#FFFFFF", "#E7E7EB", "#6366F1"],
    vars: {
      ...zinc([
        "#0E0E12", "#17171C", "#3A3A44", "#4A4A55", "#5D5D68",
        "#83838D", "#B9B9C1", "#D6D6DC", "#E7E7EB", "#FFFFFF", "#F1F1F4",
      ]),
      // White overlays/borders/text flip dark so cards & borders stay visible
      "--color-white": "#17171C",
    },
  },
];

export const getTheme = (key: string): PlayerTheme =>
  THEMES.find((t) => t.key === key) ?? THEMES[0];
