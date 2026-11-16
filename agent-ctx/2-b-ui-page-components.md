# Task 2-b — Artist/Album/Genre/Recent/Stats pages

## Files created (5)
- `src/components/music-player/artist-page.tsx` — `ArtistPage`
- `src/components/music-player/album-page.tsx` — `AlbumPage`
- `src/components/music-player/genre-browse.tsx` — `GenreBrowse`
- `src/components/music-player/recent-view.tsx` — `RecentView`
- `src/components/music-player/stats-view.tsx` — `StatsView`

## What was built
- ArtistPage: hero header card (artist.cover gradient wash + dark overlay), h-44 w-44 cover square with "Verified Artist" Badge (BadgeCheck) overlay strip, h1 name, "{listeners} monthly listeners · {genre}", bio. Action row: accent play/pause circle (plays artist tracks gathered from `artist.albumIds -> album.trackIds`, fallback tracks by artistId; queue = all artist track ids), Follow toggle (local state + toast), Shuffle (store `toggleShuffle` + plays shuffled/orderd artist queue). Albums section via CardRow (`setActiveAlbum`), Popular via TrackTable. Back button -> `setActiveArtist(null)` + `setActiveView("home")`. Friendly empty state if artist missing.
- AlbumPage: hero with big cover, "Album" eyebrow, h1 title, meta "{artistName} · {year} · N songs, M min" (artistName is a button -> `setActiveArtist(album.artistId)`, hover:underline). Accent play circle (album queue), album like (local state, toast only). TrackTable `showAlbum={false}`. Back -> `setActiveAlbum(null)` + `setActiveView("home")`. Empty state if album missing.
- GenreBrowse: no activeGenre -> grid of demoGenres cards (rounded-lg p-5, genre.cover bg, bold white name, "N tracks", hover scale) -> `setActiveGenre(name)`. Active -> cover header strip (genre.cover gradient + dark overlay), h2 + "Explore {genre}", chips row ("All genres" -> `setActiveGenre(null)`), TrackTable of tracks filtered by genre, CardRow of artists in genre -> `setActiveArtist`.
- RecentView: `recentPlayed` (newest first) -> TrackTable; empty state History icon + "Nothing played yet" + hint. NO clear-history button (no store action exists; per instructions did not invent one).
- StatsView: cards grid `grid-cols-2 lg:grid-cols-4` — Tracks played (sum playCounts), Liked songs (likedTrackIds.size), Artists explored (unique artistIds in recentPlayed), Minutes this session (sum playCounts[id]*duration / 60). Top tracks: top 5 by playCounts, rank + cover thumb + title/artist + "N plays" + thin progress bar (h-1 bg-white/10, inner width % of max, bg var(--accent)); rows click -> playTrack with top-5 queue. Empty state (no plays): Music icon + "Play something to see stats here".

## Conventions honored
- Dark design language (zinc-950/900, bg-white/[0.03], border-white/10, rounded-lg, text-zinc-100/400), accent via `text-[color:var(--accent)]` / `bg-[color:var(--accent)]`, Lucide icons, English text, `'use client'` everywhere, toast from "sonner", reused TrackTable/CardRow, only existing store actions used, no existing files modified.

## Lint status
- All 5 new files: ESLint CLEAN (verified with scoped `bunx eslint <files>`).
- Repo-wide `bun run lint` has 2 PRE-EXISTING errors in `src/components/music-player/android-extras.tsx` (react-hooks/set-state-in-effect) — NOT part of this task; left untouched per "fix ONLY your files".
