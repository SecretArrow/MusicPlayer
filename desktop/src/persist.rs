//! Persistence — save / load the user's library index and playlists to disk
//! so their CRUD work survives across app restarts.
//!
//! Files live under the per-user config directory resolved by the `dirs`
//! crate:
//!
//! - Linux:   `~/.config/musicplayer-desktop/`
//! - Windows: `%APPDATA%\musicplayer-desktop\`
//! - macOS:   `~/Library/Application Support/musicplayer-desktop/`
//!
//! Two JSON files are written there:
//!
//! - `library.json` — the cached `Library` (scanned track metadata + play
//!   counts). This is an index; the actual audio files stay where the user
//!   put them. Re-importing the same folder is a no-op (upsert is keyed on
//!   path), and the index lets the app start fast instead of re-scanning
//!   every launch.
//! - `playlists.json` — the user's `PlaylistStore` (created, renamed,
//!   reordered, deleted playlists + their track ids).
//!
//! All write paths create the config dir if missing, write atomically
//! (temp file + rename) so a crash mid-write cannot corrupt the file, and
//! treat any read error (missing file, malformed JSON) as "start empty"
//! rather than crashing the app — losing saved state is bad but failing
//! to launch is worse.

use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

use audio_core::{Library, PlaylistStore};

/// App-specific subdir inside the user's config dir.
const APP_CONFIG_DIR: &str = "musicplayer-desktop";

/// Resolve (and create) the per-user config dir for this app.
/// Returns `None` if the OS doesn't expose a config dir at all (very
/// rare; only some minimal containers). Callers fall back to in-memory
/// state in that case.
pub fn config_dir() -> Option<PathBuf> {
    let base = dirs::config_dir()?;
    let dir = base.join(APP_CONFIG_DIR);
    if !dir.exists() {
        if fs::create_dir_all(&dir).is_err() {
            return None;
        }
    }
    Some(dir)
}

/// Path to the library index file, if a config dir is available.
pub fn library_path() -> Option<PathBuf> {
    config_dir().map(|d| d.join("library.json"))
}

/// Path to the playlists file, if a config dir is available.
pub fn playlists_path() -> Option<PathBuf> {
    config_dir().map(|d| d.join("playlists.json"))
}

/// Load the saved library, or return an empty one if nothing is saved
/// (first launch, missing file, malformed JSON, etc.).
pub fn load_library() -> Library {
    let Some(path) = library_path() else {
        return Library::new();
    };
    match read_json::<Library>(&path) {
        Ok(lib) => lib,
        Err(e) => {
            log::warn!("could not load library from {}: {e}", path.display());
            Library::new()
        }
    }
}

/// Load the saved playlist store, or return an empty one if nothing is
/// saved yet.
pub fn load_playlists() -> PlaylistStore {
    let Some(path) = playlists_path() else {
        return PlaylistStore::new();
    };
    match read_json::<PlaylistStore>(&path) {
        Ok(store) => store,
        Err(e) => {
            log::warn!("could not load playlists from {}: {e}", path.display());
            PlaylistStore::new()
        }
    }
}

/// Save the library index to disk. Best-effort: logs on failure but
/// does not propagate the error — losing a save is preferable to
/// crashing the UI thread.
pub fn save_library(lib: &Library) {
    let Some(path) = library_path() else {
        return;
    };
    if let Err(e) = write_json(&path, lib) {
        log::error!("could not save library to {}: {e}", path.display());
    }
}

/// Save the playlist store to disk. Same best-effort contract as
/// [`save_library`].
pub fn save_playlists(store: &PlaylistStore) {
    let Some(path) = playlists_path() else {
        return;
    };
    if let Err(e) = write_json(&path, store) {
        log::error!("could not save playlists to {}: {e}", path.display());
    }
}

/// Read a JSON file and deserialize it. Any I/O or parse error is
/// returned so callers can decide whether to fall back to a default.
fn read_json<T: serde::de::DeserializeOwned>(path: &Path) -> Result<T, String> {
    let bytes = fs::read(path).map_err(|e| e.to_string())?;
    serde_json::from_slice(&bytes).map_err(|e| e.to_string())
}

/// Write a value as pretty-printed JSON atomically: write to a sibling
/// temp file, then rename it over the target. Rename on the same
/// filesystem is atomic on POSIX and atomic-ish on Windows, so a crash
/// mid-write leaves either the old or the new file, never a truncated
/// half-written one.
fn write_json<T: serde::Serialize>(path: &Path, value: &T) -> Result<(), String> {
    let bytes = serde_json::to_vec_pretty(value).map_err(|e| e.to_string())?;
    let dir = path.parent().ok_or_else(|| "no parent dir".to_string())?;
    let tmp = dir.join(format!(
        ".{}.tmp",
        path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("state")
    ));
    {
        let mut f = fs::File::create(&tmp).map_err(|e| e.to_string())?;
        f.write_all(&bytes).map_err(|e| e.to_string())?;
        f.sync_all().map_err(|e| e.to_string())?;
    }
    fs::rename(&tmp, path).map_err(|e| e.to_string())
}
