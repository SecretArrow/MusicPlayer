// Demo music tracks (royalty-free from SoundHelix)
// Album art uses gradient placeholders generated inline

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // seconds
  src: string;
  cover: string; // gradient CSS
  accent: string; // hex
  year: number;
  genre: string;
  plays: string;
}

// SoundHelix provides royalty-free MP3 tracks for demos
const SH = "https://www.soundhelix.com/examples/mp3";

export const demoTracks: Track[] = [
  {
    id: "t1",
    title: "Midnight Pulse",
    artist: "Aurora Bay",
    album: "Neon Horizons",
    duration: 372,
    src: `${SH}/SoundHelix-Song-1.mp3`,
    cover: "linear-gradient(135deg,#7C3AED 0%,#DB2777 100%)",
    accent: "#A855F7",
    year: 2024,
    genre: "Synthwave",
    plays: "12.4M",
  },
  {
    id: "t2",
    title: "Coastline Drift",
    artist: "The Pine Hearts",
    album: "Salt & Sun",
    duration: 426,
    src: `${SH}/SoundHelix-Song-2.mp3`,
    cover: "linear-gradient(135deg,#0EA5E9 0%,#10B981 100%)",
    accent: "#0EA5E9",
    year: 2023,
    genre: "Indie Folk",
    plays: "8.7M",
  },
  {
    id: "t3",
    title: "Velvet Static",
    artist: "Nora Cassette",
    album: "Analog Dreams",
    duration: 297,
    src: `${SH}/SoundHelix-Song-3.mp3`,
    cover: "linear-gradient(135deg,#F59E0B 0%,#EF4444 100%)",
    accent: "#F59E0B",
    year: 2025,
    genre: "R&B / Soul",
    plays: "21.3M",
  },
  {
    id: "t4",
    title: "Crystal Caverns",
    artist: "Lumen Tide",
    album: "Deep Waters",
    duration: 348,
    src: `${SH}/SoundHelix-Song-4.mp3`,
    cover: "linear-gradient(135deg,#06B6D4 0%,#3B82F6 100%)",
    accent: "#06B6D4",
    year: 2024,
    genre: "Ambient",
    plays: "5.2M",
  },
  {
    id: "t5",
    title: "Brass & Embers",
    artist: "The Hollow Quartet",
    album: "Smoke Signals",
    duration: 391,
    src: `${SH}/SoundHelix-Song-5.mp3`,
    cover: "linear-gradient(135deg,#B45309 0%,#7C2D12 100%)",
    accent: "#D97706",
    year: 2022,
    genre: "Jazz",
    plays: "3.1M",
  },
  {
    id: "t6",
    title: "Gravity Falls",
    artist: "Echo Field",
    album: "Orbit",
    duration: 412,
    src: `${SH}/SoundHelix-Song-6.mp3`,
    cover: "linear-gradient(135deg,#1E40AF 0%,#5B21B6 100%)",
    accent: "#6366F1",
    year: 2025,
    genre: "Alt Rock",
    plays: "15.8M",
  },
  {
    id: "t7",
    title: "Saffron Skies",
    artist: "Mira Sol",
    album: "Daydream",
    duration: 314,
    src: `${SH}/SoundHelix-Song-7.mp3`,
    cover: "linear-gradient(135deg,#EAB308 0%,#F97316 100%)",
    accent: "#FACC15",
    year: 2024,
    genre: "Pop",
    plays: "32.5M",
  },
  {
    id: "t8",
    title: "Ember Pulse",
    artist: "Vox Machina",
    album: "Mechanical Hearts",
    duration: 289,
    src: `${SH}/SoundHelix-Song-8.mp3`,
    cover: "linear-gradient(135deg,#DC2626 0%,#7F1D1D 100%)",
    accent: "#EF4444",
    year: 2023,
    genre: "Electronic",
    plays: "9.4M",
  },
];

export interface Playlist {
  id: string;
  title: string;
  description: string;
  trackIds: string[];
  cover: string;
  accent: string;
  curator: string;
}

export const demoPlaylists: Playlist[] = [
  {
    id: "p1",
    title: "Today's Top Hits",
    description: "The hottest tracks right now, updated daily",
    trackIds: ["t1", "t3", "t7", "t8", "t6"],
    cover: "linear-gradient(135deg,#7C3AED 0%,#DB2777 50%,#F59E0B 100%)",
    accent: "#A855F7",
    curator: "Editorial Team",
  },
  {
    id: "p2",
    title: "Chill Vibes",
    description: "Lo-fi beats and ambient grooves for focus",
    trackIds: ["t4", "t2", "t7"],
    cover: "linear-gradient(135deg,#0EA5E9 0%,#06B6D4 100%)",
    accent: "#06B6D4",
    curator: "Editorial Team",
  },
  {
    id: "p3",
    title: "Late Night Jazz",
    description: "Smooth grooves for the after-hours",
    trackIds: ["t5", "t3", "t8"],
    cover: "linear-gradient(135deg,#B45309 0%,#1F2937 100%)",
    accent: "#D97706",
    curator: "Editorial Team",
  },
  {
    id: "p4",
    title: "Discover Weekly",
    description: "Fresh picks tailored to your taste",
    trackIds: ["t6", "t1", "t5", "t2"],
    cover: "linear-gradient(135deg,#1E40AF 0%,#DB2777 100%)",
    accent: "#6366F1",
    curator: "Editorial Team",
  },
  {
    id: "p5",
    title: "Workout Energy",
    description: "Pump-up tracks for your training session",
    trackIds: ["t8", "t1", "t7", "t6"],
    cover: "linear-gradient(135deg,#DC2626 0%,#F59E0B 100%)",
    accent: "#EF4444",
    curator: "Editorial Team",
  },
  {
    id: "p6",
    title: "Acoustic Mornings",
    description: "Soft acoustic songs to start your day",
    trackIds: ["t2", "t7", "t4"],
    cover: "linear-gradient(135deg,#10B981 0%,#EAB308 100%)",
    accent: "#22C55E",
    curator: "Editorial Team",
  },
];

// Sample synced lyric lines for the demo (timed)
export interface LyricLine {
  time: number;
  text: string;
}

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
];
