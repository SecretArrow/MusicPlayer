//! User playlists — CRUD operations on collections of track IDs.
//!
//! Mirrors the web app's `Playlist` interface. Pure Rust, no platform deps.

use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::collections::HashSet;

/// Stable playlist ID.
pub type PlaylistId = String;

/// A user playlist — a named, ordered list of track IDs.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Playlist {
    pub id: PlaylistId,
    pub title: String,
    pub description: String,
    pub track_ids: Vec<String>,
    /// CSS gradient (web) or color spec (native) for cover.
    pub cover: String,
    pub accent: String,
    pub curator: String,
    pub editable: bool,
    pub created_at_secs: u64,
    pub updated_at_secs: u64,
}

impl Playlist {
    /// Create a new empty user playlist.
    pub fn new(title: impl Into<String>, accent: &str) -> Self {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);
        Self {
            id: format!("up-{}", now),
            title: title.into(),
            description: "Your playlist".into(),
            track_ids: Vec::new(),
            cover: "linear-gradient(135deg,#52525B 0%,#18181B 100%)".into(),
            accent: accent.to_string(),
            curator: "You".into(),
            editable: true,
            created_at_secs: now,
            updated_at_secs: now,
        }
    }

    /// Append a track if not already present.
    pub fn add(&mut self, track_id: impl Into<String>) -> bool {
        let id = track_id.into();
        if self.track_ids.iter().any(|t| t == &id) {
            return false;
        }
        self.track_ids.push(id);
        self.touch();
        true
    }

    /// Remove a track from this playlist.
    pub fn remove(&mut self, track_id: &str) -> bool {
        let before = self.track_ids.len();
        self.track_ids.retain(|t| t != track_id);
        let removed = self.track_ids.len() < before;
        if removed {
            self.touch();
        }
        removed
    }

    /// Reorder tracks in this playlist.
    pub fn move_track(&mut self, from: usize, to: usize) -> bool {
        if from >= self.track_ids.len() || to >= self.track_ids.len() || from == to {
            return false;
        }
        let item = self.track_ids.remove(from);
        self.track_ids.insert(to, item);
        self.touch();
        true
    }

    fn touch(&mut self) {
        self.updated_at_secs = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(self.updated_at_secs);
    }
}

/// A store of playlists. Thread-safe (`Arc<RwLock<...>>`).
#[derive(Debug, Default, Serialize, Deserialize)]
pub struct PlaylistStore {
    pub playlists: Vec<Playlist>,
}

impl PlaylistStore {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn get(&self, id: &str) -> Option<&Playlist> {
        self.playlists.iter().find(|p| p.id == id)
    }

    pub fn get_mut(&mut self, id: &str) -> Option<&mut Playlist> {
        self.playlists.iter_mut().find(|p| p.id == id)
    }

    pub fn create(&mut self, title: impl Into<String>, accent: &str) -> PlaylistId {
        let pl = Playlist::new(title, accent);
        let id = pl.id.clone();
        self.playlists.insert(0, pl);
        id
    }

    pub fn delete(&mut self, id: &str) -> bool {
        let before = self.playlists.len();
        self.playlists.retain(|p| p.id != id);
        self.playlists.len() < before
    }

    pub fn add_track(&mut self, playlist_id: &str, track_id: &str) -> bool {
        self.get_mut(playlist_id)
            .map(|p| p.add(track_id))
            .unwrap_or(false)
    }

    pub fn remove_track(&mut self, playlist_id: &str, track_id: &str) -> bool {
        self.get_mut(playlist_id)
            .map(|p| p.remove(track_id))
            .unwrap_or(false)
    }

    /// All unique track IDs across all playlists (for "in any playlist" filters).
    pub fn all_track_ids(&self) -> Vec<String> {
        let mut seen = HashSet::new();
        let mut out = Vec::new();
        for pl in &self.playlists {
            for id in &pl.track_ids {
                if seen.insert(id.clone()) {
                    out.push(id.clone());
                }
            }
        }
        out
    }
}

/// Thread-safe shared playlist store.
pub type SharedPlaylistStore = Arc<RwLock<PlaylistStore>>;

/// Build a new shared playlist store.
pub fn shared_store() -> SharedPlaylistStore {
    Arc::new(RwLock::new(PlaylistStore::new()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn create_and_get() {
        let mut s = PlaylistStore::new();
        let id = s.create("Chill", "#10B981");
        let pl = s.get(&id).unwrap();
        assert_eq!(pl.title, "Chill");
        assert!(pl.track_ids.is_empty());
        assert!(pl.editable);
    }

    #[test]
    fn add_track_dedupes() {
        let mut s = PlaylistStore::new();
        let id = s.create("Chill", "#10B981");
        assert!(s.add_track(&id, "t1"));
        assert!(!s.add_track(&id, "t1"));
        assert_eq!(s.get(&id).unwrap().track_ids.len(), 1);
    }

    #[test]
    fn delete_playlist() {
        let mut s = PlaylistStore::new();
        let id = s.create("Chill", "#10B981");
        assert!(s.delete(&id));
        assert!(s.get(&id).is_none());
    }

    #[test]
    fn move_track_in_playlist() {
        let mut s = PlaylistStore::new();
        let id = s.create("Chill", "#10B981");
        for i in 0..5 {
            s.add_track(&id, &format!("t{}", i));
        }
        assert!(s.get_mut(&id).unwrap().move_track(0, 2));
        assert_eq!(s.get(&id).unwrap().track_ids[0], "t1");
        assert_eq!(s.get(&id).unwrap().track_ids[2], "t0");
    }

    #[test]
    fn all_track_ids_dedupes_across_playlists() {
        let mut s = PlaylistStore::new();
        let a = s.create("A", "#10B981");
        let b = s.create("B", "#F59E0B");
        s.add_track(&a, "t1");
        s.add_track(&a, "t2");
        s.add_track(&b, "t2");
        s.add_track(&b, "t3");
        let ids = s.all_track_ids();
        assert_eq!(ids.len(), 3);
        assert!(ids.iter().any(|i| i == "t1"));
        assert!(ids.iter().any(|i| i == "t2"));
        assert!(ids.iter().any(|i| i == "t3"));
    }
}
