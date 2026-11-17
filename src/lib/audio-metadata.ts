// Pure-JS audio metadata parser.
//
// Reads ID3v2 (MP3/WAV) and Vorbis comments (FLAC/OGG/Opus) directly from a
// File's byte stream, with graceful filename fallback. Duration always comes
// from a decoded <audio> element because container parsing is fragile.
//
// No external deps — keeps the bundle small and works offline.

export interface TrackMetadata {
  title: string;
  artist: string;
  album: string;
  albumArtist: string;
  genre: string;
  year: number;
  duration: number; // seconds, 0 if unknown
  trackNo: number;
  cover?: string; // data URL if embedded artwork was found
}

const EMPTY: TrackMetadata = {
  title: "",
  artist: "",
  album: "",
  albumArtist: "",
  genre: "",
  year: 0,
  duration: 0,
  trackNo: 0,
};

// ---------- Filename fallback ----------

function basename(path: string): string {
  const clean = path.replace(/\\/g, "/").replace(/^.*\//, "");
  return clean.replace(/\.[^.]+$/, "");
}

/**
 * Parse "Artist - Title" from filename when no tag is present.
 * Returns { artist, title } or null.
 */
function parseFilename(rawName: string): { artist: string; title: string } {
  const name = basename(rawName);
  // Pattern: "01 - Artist - Title" or "Artist - Title" or "01_Title"
  const m = name.match(/^\s*(?:\d+\s*[-_.)]\s*)?(.+?)\s*-\s*(.+)$/);
  if (m) {
    return { artist: m[1].trim(), title: m[2].trim() };
  }
  return { artist: "Unknown artist", title: name.trim() || "Unknown track" };
}

// ---------- Synchsafe / LE int readers ----------

function syncsafe(view: DataView, offset: number): number {
  return (
    ((view.getUint8(offset) & 0x7f) << 21) |
    ((view.getUint8(offset + 1) & 0x7f) << 14) |
    ((view.getUint8(offset + 2) & 0x7f) << 7) |
    (view.getUint8(offset + 3) & 0x7f)
  );
}

function leUint32(view: DataView, offset: number): number {
  return (
    view.getUint8(offset) |
    (view.getUint8(offset + 1) << 8) |
    (view.getUint8(offset + 2) << 16) |
    (view.getUint8(offset + 3) << 24)
  ) >>> 0;
}

// ---------- ID3v2 (MP3 / WAV / embedded in others) ----------

const ID3_FRAMES_TEXT: Record<string, keyof TrackMetadata> = {
  TIT2: "title",
  TPE1: "artist",
  TPE2: "albumArtist",
  TALB: "album",
  TCON: "genre",
  TYER: "year",
  TDRC: "year",
  TRCK: "trackNo",
};

function parseId3v2(buf: ArrayBuffer): Partial<TrackMetadata> {
  const view = new DataView(buf);
  if (view.byteLength < 10) return {};
  if (view.getUint8(0) !== 0x49 || view.getUint8(1) !== 0x44 || view.getUint8(2) !== 0x33) {
    return {}; // "ID3"
  }
  const major = view.getUint8(3);
  const size = syncsafe(view, 6);
  const end = Math.min(10 + size, view.byteLength);
  const out: Partial<TrackMetadata> = {};
  let p = 10;
  while (p + 10 < end) {
    const id = String.fromCharCode(
      view.getUint8(p),
      view.getUint8(p + 1),
      view.getUint8(p + 2),
      view.getUint8(p + 3)
    );
    if (id === "\0\0\0\0") break;
    const frameSize =
      major >= 3 ? syncsafe(view, p + 4) : view.getUint32(p + 4, false);
    const dataStart = p + 10;
    const dataEnd = dataStart + frameSize;
    if (dataEnd > end) break;
    const key = ID3_FRAMES_TEXT[id];
    if (key) {
      const raw = parseId3TextFrame(view, dataStart, frameSize);
      if (raw) {
        if (key === "year") {
          const yr = parseInt(raw.slice(0, 4), 10);
          if (yr > 0) out.year = yr;
        } else if (key === "trackNo") {
          const tn = parseInt(raw.split("/")[0], 10);
          if (tn > 0) out.trackNo = tn;
        } else {
          (out as Record<string, unknown>)[key] = raw;
        }
      }
    } else if (id === "APIC") {
      const cover = parseId3Picture(view, dataStart, frameSize);
      if (cover) out.cover = cover;
    }
    p = dataEnd;
  }
  return out;
}

function parseId3TextFrame(view: DataView, start: number, len: number): string | null {
  if (len < 1) return null;
  const encoding = view.getUint8(start);
  const bytes = new Uint8Array(view.buffer, start + 1, len - 1);
  try {
    if (encoding === 0) return new TextDecoder("iso-8859-1").decode(bytes).replace(/\0+$/, "");
    if (encoding === 1) {
      // UTF-16 with BOM
      const td = new TextDecoder("utf-16");
      return td.decode(bytes).replace(/\0+$/, "");
    }
    if (encoding === 2) return new TextDecoder("utf-16be").decode(bytes).replace(/\0+$/, "");
    if (encoding === 3) return new TextDecoder("utf-8").decode(bytes).replace(/\0+$/, "");
  } catch {
    return null;
  }
  return null;
}

function parseId3Picture(view: DataView, start: number, len: number): string | null {
  // APIC: encoding(1) + mime\0 + picType(1) + desc\0 + data
  let p = start + 1; // skip encoding
  const mimeEnd = findNull(view, p, len);
  if (mimeEnd < 0) return null;
  const mime = new TextDecoder("ascii").decode(
    new Uint8Array(view.buffer, p, mimeEnd - p)
  );
  p = mimeEnd + 1; // skip null
  p += 1; // skip picture type
  const descEnd = findNull(view, p, len);
  if (descEnd < 0) return null;
  // Skip desc (assume ISO-8859-1, 1 byte per char or UTF-16 with BOM)
  const descEncoding = view.getUint8(start);
  p = descEnd + (descEncoding === 1 || descEncoding === 2 ? 2 : 1);
  if (p >= start + len) return null;
  const data = new Uint8Array(view.buffer, p, start + len - p);
  // Skip embedded JPEG/PNG only — skip if too large
  if (data.byteLength > 200_000) return null;
  const b64 = bytesToBase64(data);
  return `data:${mime || "image/jpeg"};base64,${b64}`;
}

function findNull(view: DataView, start: number, maxLen: number): number {
  for (let i = start; i < start + maxLen && i < view.byteLength; i++) {
    if (view.getUint8(i) === 0) return i;
  }
  return -1;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

// ---------- Vorbis comments (FLAC / OGG / Opus) ----------

const VORBIS_FIELDS: Record<string, keyof TrackMetadata> = {
  TITLE: "title",
  ARTIST: "artist",
  ALBUM: "album",
  ALBUMARTIST: "albumArtist",
  GENRE: "genre",
  DATE: "year",
  TRACKNUMBER: "trackNo",
};

function parseVorbisFromFlac(buf: ArrayBuffer): Partial<TrackMetadata> {
  const view = new DataView(buf);
  if (view.byteLength < 4) return {};
  if (
    view.getUint8(0) !== 0x66 ||
    view.getUint8(1) !== 0x4c ||
    view.getUint8(2) !== 0x61 ||
    view.getUint8(3) !== 0x43 // "fLaC"
  ) {
    return {};
  }
  let p = 4;
  let out: Partial<TrackMetadata> = {};
  while (p + 4 <= view.byteLength) {
    const blockType = view.getUint8(p) & 0x7f;
    const blockSize = (view.getUint8(p + 1) << 16) | (view.getUint8(p + 2) << 8) | view.getUint8(p + 3);
    p += 4;
    if (blockType === 4) {
      // VORBIS_COMMENT
      out = { ...out, ...parseVorbisCommentBlock(view, p, blockSize) };
      break;
    }
    p += blockSize;
    if (blockType === 0) break; // STREAMINFO — continue
  }
  return out;
}

function parseVorbisFromOgg(buf: ArrayBuffer): Partial<TrackMetadata> {
  // OGG container: pages with "OggS" header. Skip to 2nd page (header+comment).
  // Simple approach: scan for the VORBIS_COMMENT packet signature.
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);
  // Look for "\x03vorbis" (comment packet header in Vorbis) or "\x84" opus tags
  const sigs = [
    [0x03, 0x76, 0x6f, 0x72, 0x62, 0x69, 0x73], // \x03vorbis
  ];
  for (const sig of sigs) {
    const idx = indexOfBytes(bytes, sig);
    if (idx >= 0) {
      // Vendor length follows immediately (LE uint32)
      const start = idx + sig.length;
      return parseVorbisCommentBlock(view, start, view.byteLength - start);
    }
  }
  // Opus: search for "OpusTags"
  const opusSig = [0x4f, 0x70, 0x75, 0x73, 0x54, 0x61, 0x67, 0x73]; // "OpusTags"
  const opusIdx = indexOfBytes(bytes, opusSig);
  if (opusIdx >= 0) {
    const start = opusIdx + opusSig.length;
    return parseVorbisCommentBlock(view, start, view.byteLength - start);
  }
  return {};
}

function parseVorbisCommentBlock(view: DataView, start: number, len: number): Partial<TrackMetadata> {
  const out: Partial<TrackMetadata> = {};
  let p = start;
  if (p + 4 > view.byteLength) return out;
  const vendorLen = leUint32(view, p);
  p += 4 + vendorLen;
  if (p + 4 > view.byteLength) return out;
  const count = leUint32(view, p);
  p += 4;
  for (let i = 0; i < count && p < view.byteLength; i++) {
    if (p + 4 > view.byteLength) break;
    const cLen = leUint32(view, p);
    p += 4;
    if (cLen <= 0 || p + cLen > view.byteLength) break;
    const raw = new TextDecoder("utf-8").decode(new Uint8Array(view.buffer, p, cLen));
    p += cLen;
    const eq = raw.indexOf("=");
    if (eq <= 0) continue;
    const key = raw.slice(0, eq).toUpperCase();
    const val = raw.slice(eq + 1);
    const field = VORBIS_FIELDS[key];
    if (!field) continue;
    if (field === "year") {
      const yr = parseInt(val.slice(0, 4), 10);
      if (yr > 0) out.year = yr;
    } else if (field === "trackNo") {
      const tn = parseInt(val.split("/")[0], 10);
      if (tn > 0) out.trackNo = tn;
    } else {
      (out as Record<string, unknown>)[field] = val;
    }
  }
  return out;
}

function indexOfBytes(haystack: Uint8Array, needle: number[]): number {
  outer: for (let i = 0; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

// ---------- Duration via <audio> ----------

function readDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || typeof Audio === "undefined") {
      resolve(0);
      return;
    }
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";
    let done = false;
    const finish = (val: number) => {
      if (done) return;
      done = true;
      URL.revokeObjectURL(url);
      resolve(val);
    };
    audio.addEventListener("loadedmetadata", () => {
      const d = audio.duration;
      finish(isFinite(d) ? d : 0);
    });
    audio.addEventListener("error", () => finish(0));
    audio.src = url;
    // Safety: some browsers never fire loadedmetadata for OGG/Opus
    setTimeout(() => finish(audio.duration && isFinite(audio.duration) ? audio.duration : 0), 4000);
  });
}

// ---------- Public API ----------

/**
 * Parse metadata from an audio File. Always returns a complete object;
 * unknown fields default to filename-derived values.
 */
export async function parseAudioMetadata(
  file: File,
  opts: { folderHint?: string } = {}
): Promise<TrackMetadata> {
  const duration = await readDuration(file);
  const head = await file.slice(0, Math.min(file.size, 256 * 1024)).arrayBuffer();
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();

  let parsed: Partial<TrackMetadata> = {};
  if (ext === "mp3" || ext === "wav" || ext === "aac") {
    parsed = parseId3v2(head);
  } else if (ext === "flac") {
    parsed = parseVorbisFromFlac(head);
  } else if (ext === "ogg" || ext === "opus" || ext === "oga") {
    parsed = parseVorbisFromOgg(head);
  } else if (ext === "m4a" || ext === "mp4" || ext === "m4b") {
    // Try ID3v2 first (rare), then Vorbis (rare), then fall through to filename
    parsed = { ...parseId3v2(head), ...parseVorbisFromFlac(head) };
  } else {
    // Unknown — try both
    parsed = { ...parseId3v2(head), ...parseVorbisFromFlac(head) };
  }

  const fallback = parseFilename(file.name);
  const result: TrackMetadata = {
    ...EMPTY,
    duration,
    title: parsed.title || fallback.title,
    artist: parsed.artist || fallback.artist,
    album: parsed.album || opts.folderHint || "Unknown album",
    albumArtist: parsed.albumArtist || parsed.artist || fallback.artist,
    genre: parsed.genre || "Unknown",
    year: parsed.year || new Date(file.lastModified).getFullYear(),
    trackNo: parsed.trackNo || 0,
    cover: parsed.cover,
  };
  return result;
}

export { basename as basenameFromPath };
