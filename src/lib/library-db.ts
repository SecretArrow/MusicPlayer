// IndexedDB-backed library persistence.
//
// Stores the raw File (so playback works after reload), the parsed metadata
// snapshot, and any user collections (playlists, liked set). localStorage is
// too small (5 MB) for audio blobs, so we use IDB which can hold hundreds of MB.

const DB_NAME = "aurora-player-library";
const DB_VERSION = 1;
const STORE_FILES = "files"; // key: trackId, value: { file: File, meta: TrackMetadata, addedAt: number }
const STORE_PLAYLISTS = "playlists"; // key: playlistId, value: StoredPlaylist

export interface StoredFile {
  id: string;
  file: File;
  meta: import("./audio-metadata").TrackMetadata;
  addedAt: number;
}

export interface StoredPlaylist {
  id: string;
  title: string;
  description: string;
  trackIds: string[];
  cover: string;
  accent: string;
  createdAt: number;
  folderOrigin?: string; // for folder-imported playlists
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
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_PLAYLISTS)) {
        db.createObjectStore(STORE_PLAYLISTS, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

// ---------- Files ----------

export async function putFile(rec: StoredFile): Promise<void> {
  await tx(STORE_FILES, "readwrite", (s) => s.put(rec));
}

export async function bulkPutFiles(recs: StoredFile[]): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(STORE_FILES, "readwrite");
    const store = t.objectStore(STORE_FILES);
    for (const r of recs) store.put(r);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export async function getFile(id: string): Promise<StoredFile | undefined> {
  return tx<StoredFile>(STORE_FILES, "readonly", (s) => s.get(id));
}

export async function getAllFiles(): Promise<StoredFile[]> {
  return tx<StoredFile[]>(STORE_FILES, "readonly", (s) => s.getAll());
}

export async function deleteFile(id: string): Promise<void> {
  await tx(STORE_FILES, "readwrite", (s) => s.delete(id));
}

export async function clearAllFiles(): Promise<void> {
  await tx(STORE_FILES, "readwrite", (s) => s.clear());
}

// ---------- Playlists ----------

export async function putPlaylist(p: StoredPlaylist): Promise<void> {
  await tx(STORE_PLAYLISTS, "readwrite", (s) => s.put(p));
}

export async function getAllPlaylists(): Promise<StoredPlaylist[]> {
  return tx<StoredPlaylist[]>(STORE_PLAYLISTS, "readonly", (s) => s.getAll());
}

export async function deletePlaylistFromDB(id: string): Promise<void> {
  await tx(STORE_PLAYLISTS, "readwrite", (s) => s.delete(id));
}

// ---------- Object URL cache ----------

const urlCache = new Map<string, string>();

export async function getObjectUrl(id: string): Promise<string | null> {
  const cached = urlCache.get(id);
  if (cached) return cached;
  const rec = await getFile(id);
  if (!rec) return null;
  const url = URL.createObjectURL(rec.file);
  urlCache.set(id, url);
  return url;
}

export function revokeObjectUrl(id: string): void {
  const url = urlCache.get(id);
  if (url) {
    URL.revokeObjectURL(url);
    urlCache.delete(id);
  }
}

export function primeUrlCache(id: string, file: File): string {
  const existing = urlCache.get(id);
  if (existing) return existing;
  const url = URL.createObjectURL(file);
  urlCache.set(id, url);
  return url;
}
