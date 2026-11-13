// Music library data — tracks, artists, albums, genres, playlists, lyrics.
// Audio: royalty-free samples from SoundHelix (https://www.soundhelix.com)
// Cover art: CSS gradients (no external images needed)

const SH = "https://www.soundhelix.com/examples/mp3";

export interface Track {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  album: string;
  albumId: string;
  genre: string;
  year: number;
  duration: number; // seconds (approx; real duration read on load)
  src: string;
  cover: string; // gradient CSS
  accent: string;
  plays: string;
}

export interface Artist {
  id: string;
  name: string;
  genre: string;
  listeners: string;
  bio: string;
  accent: string;
  cover: string;
  albumIds: string[];
}

export interface Album {
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  year: number;
  trackIds: string[];
  cover: string;
  accent: string;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  trackIds: string[];
  cover: string;
  accent: string;
  curator: string;
  editable?: boolean; // user-created playlists
}

export interface LyricLine {
  time: number;
  text: string;
}

// ---------- Tracks ----------
export const demoTracks: Track[] = [
  {
    id: "t1", title: "Midnight Pulse", artist: "Aurora Bay", artistId: "ar1",
    album: "Neon Horizons", albumId: "al1", genre: "Synthwave", year: 2024,
    duration: 372, src: `${SH}/SoundHelix-Song-1.mp3`,
    cover: "linear-gradient(135deg,#7C3AED 0%,#DB2777 100%)", accent: "#A855F7", plays: "12.4M",
  },
  {
    id: "t2", title: "Coastline Drift", artist: "The Pine Hearts", artistId: "ar2",
    album: "Salt & Sun", albumId: "al2", genre: "Indie Folk", year: 2023,
    duration: 426, src: `${SH}/SoundHelix-Song-2.mp3`,
    cover: "linear-gradient(135deg,#0EA5E9 0%,#10B981 100%)", accent: "#0EA5E9", plays: "8.7M",
  },
  {
    id: "t3", title: "Velvet Static", artist: "Nora Cassette", artistId: "ar3",
    album: "Analog Dreams", albumId: "al3", genre: "R&B / Soul", year: 2025,
    duration: 297, src: `${SH}/SoundHelix-Song-3.mp3`,
    cover: "linear-gradient(135deg,#F59E0B 0%,#EF4444 100%)", accent: "#F59E0B", plays: "21.3M",
  },
  {
    id: "t4", title: "Crystal Caverns", artist: "Lumen Tide", artistId: "ar4",
    album: "Deep Waters", albumId: "al4", genre: "Ambient", year: 2024,
    duration: 348, src: `${SH}/SoundHelix-Song-4.mp3`,
    cover: "linear-gradient(135deg,#06B6D4 0%,#3B82F6 100%)", accent: "#06B6D4", plays: "5.2M",
  },
  {
    id: "t5", title: "Brass & Embers", artist: "The Hollow Quartet", artistId: "ar5",
    album: "Smoke Signals", albumId: "al5", genre: "Jazz", year: 2022,
    duration: 391, src: `${SH}/SoundHelix-Song-5.mp3`,
    cover: "linear-gradient(135deg,#B45309 0%,#7C2D12 100%)", accent: "#D97706", plays: "3.1M",
  },
  {
    id: "t6", title: "Gravity Falls", artist: "Echo Field", artistId: "ar6",
    album: "Orbit", albumId: "al6", genre: "Alt Rock", year: 2025,
    duration: 412, src: `${SH}/SoundHelix-Song-6.mp3`,
    cover: "linear-gradient(135deg,#1E40AF 0%,#5B21B6 100%)", accent: "#6366F1", plays: "15.8M",
  },
  {
    id: "t7", title: "Saffron Skies", artist: "Mira Sol", artistId: "ar7",
    album: "Daydream", albumId: "al7", genre: "Pop", year: 2024,
    duration: 314, src: `${SH}/SoundHelix-Song-7.mp3`,
    cover: "linear-gradient(135deg,#EAB308 0%,#F97316 100%)", accent: "#FACC15", plays: "32.5M",
  },
  {
    id: "t8", title: "Ember Pulse", artist: "Vox Machina", artistId: "ar8",
    album: "Mechanical Hearts", albumId: "al8", genre: "Electronic", year: 2023,
    duration: 289, src: `${SH}/SoundHelix-Song-8.mp3`,
    cover: "linear-gradient(135deg,#DC2626 0%,#7F1D1D 100%)", accent: "#EF4444", plays: "9.4M",
  },
  {
    id: "t9", title: "Starlight Drive", artist: "Aurora Bay", artistId: "ar1",
    album: "Neon Horizons", albumId: "al1", genre: "Synthwave", year: 2024,
    duration: 344, src: `${SH}/SoundHelix-Song-9.mp3`,
    cover: "linear-gradient(135deg,#8B5CF6 0%,#EC4899 100%)", accent: "#C084FC", plays: "7.9M",
  },
  {
    id: "t10", title: "Harbor Lights", artist: "The Pine Hearts", artistId: "ar2",
    album: "Salt & Sun", albumId: "al2", genre: "Indie Folk", year: 2023,
    duration: 387, src: `${SH}/SoundHelix-Song-10.mp3`,
    cover: "linear-gradient(135deg,#14B8A6 0%,#84CC16 100%)", accent: "#2DD4BF", plays: "6.3M",
  },
  {
    id: "t11", title: "Late Night Drive", artist: "Nora Cassette", artistId: "ar3",
    album: "Analog Dreams", albumId: "al3", genre: "R&B / Soul", year: 2025,
    duration: 325, src: `${SH}/SoundHelix-Song-11.mp3`,
    cover: "linear-gradient(135deg,#F97316 0%,#BE123C 100%)", accent: "#FB923C", plays: "18.2M",
  },
  {
    id: "t12", title: "Deep Current", artist: "Lumen Tide", artistId: "ar4",
    album: "Deep Waters", albumId: "al4", genre: "Ambient", year: 2024,
    duration: 405, src: `${SH}/SoundHelix-Song-12.mp3`,
    cover: "linear-gradient(135deg,#0284C7 0%,#155E75 100%)", accent: "#38BDF8", plays: "4.4M",
  },
  {
    id: "t13", title: "Static Bloom", artist: "Echo Field", artistId: "ar6",
    album: "Orbit", albumId: "al6", genre: "Alt Rock", year: 2025,
    duration: 356, src: `${SH}/SoundHelix-Song-13.mp3`,
    cover: "linear-gradient(135deg,#4F46E5 0%,#9D174D 100%)", accent: "#818CF8", plays: "11.6M",
  },
];

// ---------- Artists ----------
export const demoArtists: Artist[] = [
  {
    id: "ar1", name: "Aurora Bay", genre: "Synthwave", listeners: "2.4M",
    bio: "Retro-futurist synthwave duo painting neon skies over drum machines and analog pads.",
    accent: "#A855F7",
    cover: "linear-gradient(135deg,#7C3AED 0%,#DB2777 100%)",
    albumIds: ["al1"],
  },
  {
    id: "ar2", name: "The Pine Hearts", genre: "Indie Folk", listeners: "1.1M",
    bio: "Coastal indie folk trio blending fingerpicked guitars with warm three-part harmonies.",
    accent: "#0EA5E9",
    cover: "linear-gradient(135deg,#0EA5E9 0%,#10B981 100%)",
    albumIds: ["al2"],
  },
  {
    id: "ar3", name: "Nora Cassette", genre: "R&B / Soul", listeners: "3.8M",
    bio: "Silk-voiced songwriter channeling 90s R&B through tape-saturated production.",
    accent: "#F59E0B",
    cover: "linear-gradient(135deg,#F59E0B 0%,#EF4444 100%)",
    albumIds: ["al3"],
  },
  {
    id: "ar4", name: "Lumen Tide", genre: "Ambient", listeners: "640K",
    bio: "Ambient sound sculptor composing slow-moving oceans of synth and field recordings.",
    accent: "#06B6D4",
    cover: "linear-gradient(135deg,#06B6D4 0%,#3B82F6 100%)",
    albumIds: ["al4"],
  },
  {
    id: "ar5", name: "The Hollow Quartet", genre: "Jazz", listeners: "410K",
    bio: "Modern jazz quartet trading smoky headpieces and late-night improvisations.",
    accent: "#D97706",
    cover: "linear-gradient(135deg,#B45309 0%,#7C2D12 100%)",
    albumIds: ["al5"],
  },
  {
    id: "ar6", name: "Echo Field", genre: "Alt Rock", listeners: "1.9M",
    bio: "Alt-rock outfit layering shimmering guitars over pulsing, cinematic choruses.",
    accent: "#6366F1",
    cover: "linear-gradient(135deg,#1E40AF 0%,#5B21B6 100%)",
    albumIds: ["al6"],
  },
  {
    id: "ar7", name: "Mira Sol", genre: "Pop", listeners: "5.2M",
    bio: "Chart-topping pop vocalist turning summer heartbreak into golden hooks.",
    accent: "#FACC15",
    cover: "linear-gradient(135deg,#EAB308 0%,#F97316 100%)",
    albumIds: ["al7"],
  },
  {
    id: "ar8", name: "Vox Machina", genre: "Electronic", listeners: "890K",
    bio: "Electronic producer forging industrial percussion with melodic acid lines.",
    accent: "#EF4444",
    cover: "linear-gradient(135deg,#DC2626 0%,#7F1D1D 100%)",
    albumIds: ["al8"],
  },
];

// ---------- Albums ----------
export const demoAlbums: Album[] = [
  { id: "al1", title: "Neon Horizons", artistId: "ar1", artistName: "Aurora Bay", year: 2024, trackIds: ["t1", "t9"], cover: "linear-gradient(135deg,#7C3AED 0%,#DB2777 100%)", accent: "#A855F7" },
  { id: "al2", title: "Salt & Sun", artistId: "ar2", artistName: "The Pine Hearts", year: 2023, trackIds: ["t2", "t10"], cover: "linear-gradient(135deg,#0EA5E9 0%,#10B981 100%)", accent: "#0EA5E9" },
  { id: "al3", title: "Analog Dreams", artistId: "ar3", artistName: "Nora Cassette", year: 2025, trackIds: ["t3", "t11"], cover: "linear-gradient(135deg,#F59E0B 0%,#EF4444 100%)", accent: "#F59E0B" },
  { id: "al4", title: "Deep Waters", artistId: "ar4", artistName: "Lumen Tide", year: 2024, trackIds: ["t4", "t12"], cover: "linear-gradient(135deg,#06B6D4 0%,#3B82F6 100%)", accent: "#06B6D4" },
  { id: "al5", title: "Smoke Signals", artistId: "ar5", artistName: "The Hollow Quartet", year: 2022, trackIds: ["t5"], cover: "linear-gradient(135deg,#B45309 0%,#7C2D12 100%)", accent: "#D97706" },
  { id: "al6", title: "Orbit", artistId: "ar6", artistName: "Echo Field", year: 2025, trackIds: ["t6", "t13"], cover: "linear-gradient(135deg,#1E40AF 0%,#5B21B6 100%)", accent: "#6366F1" },
  { id: "al7", title: "Daydream", artistId: "ar7", artistName: "Mira Sol", year: 2024, trackIds: ["t7"], cover: "linear-gradient(135deg,#EAB308 0%,#F97316 100%)", accent: "#FACC15" },
  { id: "al8", title: "Mechanical Hearts", artistId: "ar8", artistName: "Vox Machina", year: 2023, trackIds: ["t8"], cover: "linear-gradient(135deg,#DC2626 0%,#7F1D1D 100%)", accent: "#EF4444" },
];

// ---------- Editorial playlists ----------
export const demoPlaylists: Playlist[] = [
  {
    id: "p1", title: "Today's Top Hits", description: "The hottest tracks right now, updated daily",
    trackIds: ["t1", "t3", "t7", "t8", "t6"], cover: "linear-gradient(135deg,#7C3AED 0%,#DB2777 50%,#F59E0B 100%)",
    accent: "#A855F7", curator: "Editorial Team",
  },
  {
    id: "p2", title: "Chill Vibes", description: "Lo-fi beats and ambient grooves for focus",
    trackIds: ["t4", "t2", "t12"], cover: "linear-gradient(135deg,#0EA5E9 0%,#06B6D4 100%)",
    accent: "#06B6D4", curator: "Editorial Team",
  },
  {
    id: "p3", title: "Late Night Jazz", description: "Smooth grooves for the after-hours",
    trackIds: ["t5", "t3", "t11"], cover: "linear-gradient(135deg,#B45309 0%,#1F2937 100%)",
    accent: "#D97706", curator: "Editorial Team",
  },
  {
    id: "p4", title: "Discover Weekly", description: "Fresh picks tailored to your taste",
    trackIds: ["t6", "t1", "t13", "t9"], cover: "linear-gradient(135deg,#1E40AF 0%,#DB2777 100%)",
    accent: "#6366F1", curator: "Editorial Team",
  },
  {
    id: "p5", title: "Workout Energy", description: "Pump-up tracks for your training session",
    trackIds: ["t8", "t1", "t7", "t6"], cover: "linear-gradient(135deg,#DC2626 0%,#F59E0B 100%)",
    accent: "#EF4444", curator: "Editorial Team",
  },
  {
    id: "p6", title: "Acoustic Mornings", description: "Soft acoustic songs to start your day",
    trackIds: ["t2", "t7", "t10"], cover: "linear-gradient(135deg,#10B981 0%,#EAB308 100%)",
    accent: "#22C55E", curator: "Editorial Team",
  },
];

// ---------- Genres ----------
export const demoGenres = [
  { name: "Synthwave", cover: "linear-gradient(135deg,#7C3AED 0%,#DB2777 100%)", accent: "#A855F7" },
  { name: "Indie Folk", cover: "linear-gradient(135deg,#0EA5E9 0%,#10B981 100%)", accent: "#0EA5E9" },
  { name: "R&B / Soul", cover: "linear-gradient(135deg,#F59E0B 0%,#EF4444 100%)", accent: "#F59E0B" },
  { name: "Ambient", cover: "linear-gradient(135deg,#06B6D4 0%,#3B82F6 100%)", accent: "#06B6D4" },
  { name: "Jazz", cover: "linear-gradient(135deg,#B45309 0%,#7C2D12 100%)", accent: "#D97706" },
  { name: "Alt Rock", cover: "linear-gradient(135deg,#1E40AF 0%,#5B21B6 100%)", accent: "#6366F1" },
  { name: "Pop", cover: "linear-gradient(135deg,#EAB308 0%,#F97316 100%)", accent: "#FACC15" },
  { name: "Electronic", cover: "linear-gradient(135deg,#DC2626 0%,#7F1D1D 100%)", accent: "#EF4444" },
];

// ---------- Lyrics (demo, synced for t1) ----------
export const demoLyrics: LyricLine[] = [
  { time: 0, text: "♪ Instrumental intro ♪" },
  { time: 12, text: "City lights are calling out my name" },
  { time: 18, text: "Every heartbeat keeps me in the game" },
  { time: 24, text: "Through the silence, through the noise" },
  { time: 30, text: "I am finding my own voice" },
  { time: 36, text: "Midnight pulse, electric and alive" },
  { time: 42, text: "Dancing till the morning sun arrives" },
  { time: 48, text: "Every breath a brand new melody" },
  { time: 54, text: "Set my restless spirit free" },
  { time: 60, text: "♪ Interlude ♪" },
  { time: 72, text: "Neon shadows on an empty street" },
  { time: 78, text: "Echoes of a dream I can't repeat" },
  { time: 84, text: "Through the silence, through the noise" },
  { time: 90, text: "I am finding my own voice" },
  { time: 96, text: "Midnight pulse, electric and alive" },
  { time: 102, text: "Dancing till the morning sun arrives" },
  { time: 108, text: "Every breath a brand new melody" },
  { time: 114, text: "Set my restless spirit free" },
  { time: 126, text: "♪ Outro ♪" },
];

// ---------- Accent palette (for Settings) ----------
export const accentPresets: { key: string; label: string; color: string }[] = [
  { key: "emerald", label: "Emerald", color: "#10B981" },
  { key: "violet", label: "Violet", color: "#8B5CF6" },
  { key: "amber", label: "Amber", color: "#F59E0B" },
  { key: "rose", label: "Rose", color: "#F43F5E" },
  { key: "cyan", label: "Cyan", color: "#06B6D4" },
  { key: "orange", label: "Orange", color: "#F97316" },
];
