# UI Parity Specification

The native desktop and Android apps reproduce the existing web app's
appearance and interaction as closely as technically possible.

## Reference: web app

Source of truth: `/home/z/my-project/src/components/music-player/*.tsx`

## Color system

The web app uses Tailwind zinc-* utilities, which compile to CSS variables
(`var(--color-zinc-50)` etc.). Each theme overrides these variables at
runtime to re-skin the entire player.

| Layer | Default (Midnight) | Source |
| --- | --- | --- |
| Background | `#09090B` (zinc-950) | `themes.ts` vars |
| Surface | `#18181B` (zinc-900) | `themes.ts` vars |
| Border | `#27272A` (zinc-800) | `themes.ts` vars |
| Text | `#FAFAFA` (zinc-50) | `themes.ts` vars |
| Text muted | `#A1A1AA` (zinc-400) | `themes.ts` vars |
| Accent | `#10B981` (emerald-500) | `themes.ts` accent |

## Themes (10 built-in)

| Key | Layout | Accent | Dark? |
| --- | --- | --- | --- |
| midnight | Classic | #10B981 | yes |
| aurora | Glass | #22D3EE | yes |
| sunset | Vinyl | #F59E0B | yes |
| rosewood | Cassette | #FB7185 | yes |
| violet | Cyber | #A78BFA | yes |
| ocean | Focus | #38BDF8 | yes |
| forest | Mosaic | #84CC16 | yes |
| mono | Classic | #FFFFFF | yes |
| coffee | Broadcast | #E8A33D | yes |
| daylight | Classic | #6366F1 | no (light mode) |

Each theme carries its full color scale (zinc-50 → zinc-950) plus accent,
plus its `layout` variant. The desktop renderer dispatches to the matching
`ui::render_*` function; the Android renderer dispatches to the matching
`ui/screens/<Layout>Screen.kt`.

## Layout variants (8)

### Classic (Midnight, Monochrome, Daylight)
- Left sidebar (240px) with nav items: Home, Search, Library, Playlists, Lyrics, Settings
- Bottom player bar (96px) with: cover, title/artist, progress bar, controls
- Main content area: scrollable list/grid

### Glass (Aurora)
- Top pill nav (centered, 4 items)
- Floating frosted panels (backdrop-blur on web; semi-transparent fill on native)
- Pill-shaped player bar at bottom

### Vinyl (Sunset)
- Left turntable side panel (320px) with spinning record
- Record has center label in accent color
- Right side: track list + info

### Cassette (Rosewood)
- Center cassette deck (body height 220px)
- Two reels (left/right), accent-colored circles
- Below: chunky hi-fi keys (play/pause/ff/rw)

### Cyber (Violet Night)
- HUD frame with clipped corners (stroke 2px in accent)
- Monospace typography
- Scanline overlay (simulated)

### Focus (Ocean)
- Immersive center stage (large circle 360px diameter)
- Bottom dock (player controls)
- No sidebar

### Mosaic (Forest)
- Bento tile dashboard (2x2 grid of tiles)
- First tile is accent-colored
- Each tile = a category (Recently played / Most played / Library / Playlists)

### Broadcast (Coffee)
- Radio console with tuner dial at bottom
- "ON AIR" indicator
- Tuner needle in accent color

## Typography

| Element | Font (web) | Font (native desktop) | Font (Android) |
| --- | --- | --- | --- |
| Body | ui-sans-serif / system | Roboto Flex | Roboto Flex |
| Headings | ui-sans-serif / system bold | Roboto Flex Bold | Roboto Flex Bold |
| Mono (Cyber theme) | ui-monospace | JetBrains Mono | JetBrains Mono |

## Spacing & sizing

| Element | Size |
| --- | --- |
| Sidebar width | 240px (classic) / 320px (vinyl) |
| Bottom player bar height | 96px |
| Top nav height (glass) | 56px |
| Track row height | 64px (web) / 72dp (Android touch target) |
| Cover art size (track row) | 56px |
| Cover art size (now playing) | 240px |
| Border radius | 8px (cards) / 16px (panels) / 24px (floating panels) |

## Animation & transitions

| Element | Web | Native |
| --- | --- | --- |
| Track row hover | 150ms ease-out | press feedback 100ms |
| Sidebar item active | dot slides in 200ms | same |
| Player bar fade-in | 250ms | same |
| Vinyl rotation | linear infinite 6s/rev | same |
| Theme switch | color vars transition 300ms | Compose animateColorAsState 300ms |

## Player controls

| Control | Web icon | Native icon |
| --- | --- | --- |
| Play | lucide `Play` | material `PlayArrow` |
| Pause | lucide `Pause` | material `Pause` |
| Previous | lucide `SkipBack` | material `SkipPrevious` |
| Next | lucide `SkipForward` | material `SkipNext` |
| Shuffle | lucide `Shuffle` | material `Shuffle` |
| Repeat | lucide `Repeat` / `Repeat1` | material `Repeat` / `RepeatOne` |
| Like | lucide `Heart` / `HeartCrack` | material `Favorite` / `FavoriteBorder` |
| Volume | lucide `Volume2` | material `VolumeUp` |
| Queue | lucide `ListMusic` | material `QueueMusic` |

## Responsive breakpoints

| Width (px) | Layout |
| --- | --- |
| < 640 | Mobile (bottom nav, single column) |
| 640–1024 | Tablet (sidebar collapsible) |
| > 1024 | Desktop (full sidebar) |

## Light vs dark

The web app ships 9 dark themes and 1 light theme (Daylight). The native
apps follow the same convention: theme switch updates the entire color
system (background, surface, text, border, accent) via `MaterialTheme`
(Android) or `Theme` struct (desktop).

## Visual regression testing

The `ci-desktop.yml` and `ci-android.yml` workflows include screenshot
capture steps that render the player UI at standard resolutions and
compare against baseline snapshots stored in `docs/baselines/`. Failures
are reported as artifacts.

| Resolution | Type |
| --- | --- |
| 1280x800 | Desktop default |
| 1920x1080 | Desktop high |
| 360x800 | Android phone portrait |
| 800x1280 | Android tablet portrait |
| 1280x720 | Android Auto head unit |
