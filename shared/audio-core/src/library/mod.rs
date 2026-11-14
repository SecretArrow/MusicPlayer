//! Local music library scanner & index.
//!
//! Walks a directory tree, probes each audio file, caches metadata &
//! artwork. Designed to run incrementally on a background thread.

use crossbeam_channel::{bounded, Receiver, Sender};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use thiserror::Error;

use crate::decoder::ProbeResult;
use crate::metadata::{read_from_file, AudioMetadata};

/// One indexed library entry.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LibraryEntry {
    pub id: String,
    pub path: PathBuf,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub genre: String,
    pub year: u32,
    pub track_number: u32,
    pub duration_secs: f64,
    pub sample_rate: u32,
    pub channels: u32,
    pub bitrate_kbps: u32,
    /// Has embedded artwork?
    pub has_artwork: bool,
    pub added_at_secs: u64,
}

/// Scan progress events (sent from background thread).
#[derive(Debug, Clone, Serialize)]
pub enum ScanProgress {
    /// Scan started; `total_files` is None when unknown.
    Started { total_files: Option<usize> },
    /// One file indexed.
    FileIndexed {
        path: PathBuf,
        current: usize,
        total: Option<usize>,
    },
    /// File was unreadable.
    FileFailed { path: PathBuf, error: String },
    /// Scan finished.
    Done { indexed: usize, failed: usize },
}

/// Library errors.
#[derive(Debug, Error)]
pub enum LibraryError {
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("metadata error: {0}")]
    Metadata(String),
    #[error("scan channel disconnected")]
    ChannelClosed,
}

/// A music library. Thread-safe.
#[derive(Debug, Default, Serialize, Deserialize)]
pub struct Library {
    /// Entries keyed by `id`.
    pub entries: HashMap<String, LibraryEntry>,
    /// IDs sorted by `added_at_secs` descending (most recently added first).
    pub recent_ids: Vec<String>,
    /// Play counts keyed by track ID.
    pub play_counts: HashMap<String, u32>,
    /// Last-played track IDs (most recent first).
    pub recently_played: Vec<String>,
}

impl Library {
    pub fn new() -> Self {
        Self::default()
    }

    /// Upsert an entry (idempotent on `path`).
    pub fn upsert(&mut self, entry: LibraryEntry) {
        if !self.entries.contains_key(&entry.id) {
            self.recent_ids.insert(0, entry.id.clone());
        }
        self.entries.insert(entry.id.clone(), entry);
    }

    /// Lookup by ID.
    pub fn get(&self, id: &str) -> Option<&LibraryEntry> {
        self.entries.get(id)
    }

    /// Lookup by file path.
    pub fn find_by_path(&self, path: &Path) -> Option<&LibraryEntry> {
        self.entries.values().find(|e| e.path == path)
    }

    /// All entries, sorted by title.
    pub fn sorted_by_title(&self) -> Vec<&LibraryEntry> {
        let mut v: Vec<&LibraryEntry> = self.entries.values().collect();
        v.sort_by(|a, b| a.title.cmp(&b.title));
        v
    }

    /// All entries, sorted by artist then album then track number.
    pub fn sorted_by_artist(&self) -> Vec<&LibraryEntry> {
        let mut v: Vec<&LibraryEntry> = self.entries.values().collect();
        v.sort_by(|a, b| {
            a.artist
                .cmp(&b.artist)
                .then(a.album.cmp(&b.album))
                .then(a.track_number.cmp(&b.track_number))
        });
        v
    }

    /// Filter entries by genre.
    pub fn by_genre(&self, genre: &str) -> Vec<&LibraryEntry> {
        self.entries
            .values()
            .filter(|e| e.genre.eq_ignore_ascii_case(genre))
            .collect()
    }

    /// All distinct genres.
    pub fn genres(&self) -> Vec<String> {
        let mut seen = std::collections::HashSet::new();
        let mut out: Vec<String> = Vec::new();
        for e in self.entries.values() {
            if !e.genre.is_empty() && seen.insert(e.genre.to_lowercase()) {
                out.push(e.genre.clone());
            }
        }
        out.sort();
        out
    }

    /// Record a play (increments play count, prepends to recently_played).
    pub fn record_play(&mut self, track_id: &str) {
        *self.play_counts.entry(track_id.to_string()).or_insert(0) += 1;
        self.recently_played.retain(|i| i != track_id);
        self.recently_played.insert(0, track_id.to_string());
        if self.recently_played.len() > 50 {
            self.recently_played.truncate(50);
        }
    }

    /// Most-played tracks (descending by play count).
    pub fn most_played(&self, limit: usize) -> Vec<(&LibraryEntry, u32)> {
        let mut v: Vec<(&LibraryEntry, u32)> = self
            .play_counts
            .iter()
            .filter_map(|(id, c)| self.entries.get(id).map(|e| (e, *c)))
            .collect();
        v.sort_by(|a, b| b.1.cmp(&a.1));
        v.truncate(limit);
        v
    }

    /// Recently-added entries (first N).
    pub fn recently_added(&self, limit: usize) -> Vec<&LibraryEntry> {
        self.recent_ids
            .iter()
            .filter_map(|id| self.entries.get(id))
            .take(limit)
            .collect()
    }

    /// Search by query (title/artist/album substring, case-insensitive).
    pub fn search(&self, query: &str) -> Vec<&LibraryEntry> {
        let q = query.to_lowercase();
        if q.is_empty() {
            return Vec::new();
        }
        self.entries
            .values()
            .filter(|e| {
                e.title.to_lowercase().contains(&q)
                    || e.artist.to_lowercase().contains(&q)
                    || e.album.to_lowercase().contains(&q)
            })
            .collect()
    }
}

/// File extensions we attempt to scan.
pub const AUDIO_EXTENSIONS: &[&str] = &[
    "mp3", "flac", "wav", "ogg", "opus", "aac", "m4a", "alac", "wma", "aiff",
];

/// Synchronously scan a directory tree and return the populated library.
///
/// For async use, see `spawn_scan` which streams `ScanProgress`.
pub fn scan_dir<P: AsRef<Path>>(root: P) -> Result<Library, LibraryError> {
    let mut lib = Library::new();
    let (tx, rx) = bounded::<ScanProgress>(64);
    let handle = std::thread::spawn(move || {
        while let Ok(_p) = rx.recv() {
            // Drop progress in sync mode.
        }
    });
    scan_dir_into(root, &mut lib, &tx).ok();
    drop(tx);
    let _ = handle.join();
    Ok(lib)
}

/// Scan a directory tree into an existing `Library`, sending progress events.
pub fn scan_dir_into<P: AsRef<Path>>(
    root: P,
    lib: &mut Library,
    progress: &Sender<ScanProgress>,
) -> Result<usize, LibraryError> {
    let root = root.as_ref();
    let mut files: Vec<PathBuf> = Vec::new();
    collect_audio_files(root, &mut files)?;
    let total = files.len();
    let _ = progress.send(ScanProgress::Started {
        total_files: Some(total),
    });

    let mut indexed = 0usize;
    let mut failed = 0usize;
    for (i, path) in files.into_iter().enumerate() {
        match index_one(&path) {
            Ok(entry) => {
                lib.upsert(entry);
                indexed += 1;
                let _ = progress.send(ScanProgress::FileIndexed {
                    path: path.clone(),
                    current: i + 1,
                    total: Some(total),
                });
            }
            Err(e) => {
                failed += 1;
                let _ = progress.send(ScanProgress::FileFailed {
                    path: path.clone(),
                    error: e.to_string(),
                });
            }
        }
    }
    let _ = progress.send(ScanProgress::Done { indexed, failed });
    Ok(indexed)
}

fn collect_audio_files(dir: &Path, out: &mut Vec<PathBuf>) -> std::io::Result<()> {
    if !dir.is_dir() {
        return Ok(());
    }
    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() {
            collect_audio_files(&path, out)?;
        } else if let Some(ext) = path.extension().and_then(|s| s.to_str()) {
            if AUDIO_EXTENSIONS.iter().any(|e| e.eq_ignore_ascii_case(ext)) {
                out.push(path);
            }
        }
    }
    Ok(())
}

fn index_one(path: &Path) -> Result<LibraryEntry, LibraryError> {
    let meta = read_from_file(path).map_err(|e| LibraryError::Metadata(e.to_string()))?;
    // Use the path's hash as a stable ID (deterministic across rescans).
    use std::hash::{Hash, Hasher};
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    path.hash(&mut hasher);
    let id = format!("lib-{:016x}", hasher.finish());

    let added_at_secs = std::fs::metadata(path)
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0);

    Ok(LibraryEntry {
        id,
        path: path.to_path_buf(),
        title: meta.title.unwrap_or_else(|| {
            path.file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("Unknown")
                .to_string()
        }),
        artist: meta.artist.unwrap_or_else(|| "Unknown Artist".into()),
        album: meta.album.unwrap_or_else(|| "Unknown Album".into()),
        genre: meta.genre.unwrap_or_default(),
        year: meta.year.unwrap_or(0),
        track_number: meta.track_number.unwrap_or(0),
        duration_secs: meta.duration_secs.unwrap_or(0.0),
        sample_rate: meta.sample_rate.unwrap_or(crate::ENGINE_SAMPLE_RATE),
        channels: meta.channels.unwrap_or(crate::ENGINE_CHANNELS as u32),
        bitrate_kbps: meta.bitrate_kbps.unwrap_or(0),
        has_artwork: meta.artwork.is_some(),
        added_at_secs,
    })
}

/// Spawn a background scan thread. Returns a `Receiver` for progress events.
pub fn spawn_scan(root: PathBuf) -> Receiver<ScanProgress> {
    let (tx, rx) = bounded(64);
    std::thread::spawn(move || {
        let mut lib = Library::new();
        let _ = scan_dir_into(root, &mut lib, &tx);
        // Note: caller should also receive the final library through a
        // separate channel; here we only stream progress.
    });
    rx
}

/// Shared library wrapper.
pub type SharedLibrary = Arc<RwLock<Library>>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn library_starts_empty() {
        let lib = Library::new();
        assert!(lib.entries.is_empty());
        assert!(lib.recent_ids.is_empty());
    }

    #[test]
    fn upsert_adds_to_recent_ids_once() {
        let mut lib = Library::new();
        let entry = LibraryEntry {
            id: "t1".into(),
            path: "/x.mp3".into(),
            title: "T1".into(),
            artist: "A1".into(),
            album: "Al1".into(),
            genre: "Rock".into(),
            year: 2024,
            track_number: 1,
            duration_secs: 180.0,
            sample_rate: 44100,
            channels: 2,
            bitrate_kbps: 320,
            has_artwork: false,
            added_at_secs: 100,
        };
        lib.upsert(entry.clone());
        assert_eq!(lib.recent_ids.len(), 1);
        lib.upsert(entry.clone());
        assert_eq!(lib.recent_ids.len(), 1, "re-upsert should not duplicate");
    }

    #[test]
    fn record_play_increments_and_prepends() {
        let mut lib = Library::new();
        lib.record_play("t1");
        lib.record_play("t2");
        lib.record_play("t1");
        assert_eq!(lib.play_counts["t1"], 2);
        assert_eq!(lib.recently_played[0], "t1");
        assert_eq!(lib.recently_played[1], "t2");
    }

    #[test]
    fn search_matches_substring_case_insensitively() {
        let mut lib = Library::new();
        for (id, title, artist) in [
            ("t1", "Midnight", "Aurora"),
            ("t2", "Sunrise", "Aurora Bay"),
        ] {
            lib.upsert(LibraryEntry {
                id: id.into(),
                path: format!("/{}.mp3", id).into(),
                title: title.into(),
                artist: artist.into(),
                album: "X".into(),
                genre: "Rock".into(),
                year: 2024,
                track_number: 1,
                duration_secs: 100.0,
                sample_rate: 44100,
                channels: 2,
                bitrate_kbps: 320,
                has_artwork: false,
                added_at_secs: 1,
            });
        }
        assert_eq!(lib.search("mid").len(), 1);
        assert_eq!(lib.search("aurora").len(), 2);
    }

    #[test]
    fn audio_extension_filter() {
        assert!(AUDIO_EXTENSIONS.contains(&"mp3"));
        assert!(AUDIO_EXTENSIONS.contains(&"flac"));
        assert!(AUDIO_EXTENSIONS.contains(&"m4a"));
        assert!(!AUDIO_EXTENSIONS.contains(&"txt"));
    }
}
