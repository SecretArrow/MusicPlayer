// Lyrics storage — keeps LRC text per track in IndexedDB so imported
// lyrics survive reloads.

const DB_NAME = "aurora-player-lyrics";
const DB_VERSION = 1;
const STORE = "lrc"; // key: trackId, value: { trackId, lrc, addedAt }

export interface StoredLyrics {
  trackId: string;
  lrc: string;
  addedAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "trackId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function putLyrics(rec: StoredLyrics): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(STORE, "readwrite");
    t.objectStore(STORE).put(rec);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export async function getLyrics(trackId: string): Promise<StoredLyrics | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, "readonly");
    const req = t.objectStore(STORE).get(trackId);
    req.onsuccess = () => resolve(req.result as StoredLyrics | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteLyrics(trackId: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(STORE, "readwrite");
    t.objectStore(STORE).delete(trackId);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export async function getAllLyrics(): Promise<StoredLyrics[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, "readonly");
    const req = t.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as StoredLyrics[]);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Pair an .lrc file with a track by filename. Looks for the matching
 * audio file by stripping ".lrc" and comparing basename (case-insensitive).
 */
export function matchLyricsToTrack(
  lrcFileName: string,
  trackFileNames: string[]
): string | null {
  const base = lrcFileName.replace(/\.lrc$/i, "").replace(/\.[^.]+$/, "").toLowerCase();
  for (const f of trackFileNames) {
    const fBase = f.replace(/\.[^.]+$/, "").toLowerCase();
    if (fBase === base) return f;
  }
  return null;
}
