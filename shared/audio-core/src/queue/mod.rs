//! Play queue with shuffle & repeat.
//!
//! Pure-Rust, no platform deps, fully unit-testable.

use std::collections::HashSet;
use std::sync::Arc;
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};

/// Repeat modes — mirrors the web app's `RepeatMode`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum RepeatMode {
    /// No repeat — stop at end of queue.
    #[default]
    Off,
    /// Repeat the whole queue.
    All,
    /// Repeat the current track.
    One,
}

/// Shuffle modes.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum ShuffleMode {
    /// Sequential playback.
    #[default]
    Off,
    /// Fisher-Yates shuffle of upcoming tracks.
    On,
}

/// A play queue. Internally a `Vec<TrackId>` plus a current index.
///
/// Thread-safe (`Arc<RwLock<...>>`). Shuffle mode preserves the currently
/// playing track at its position and shuffles only the *upcoming* portion —
/// same behavior as the web app.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackQueue {
    /// Ordered list of track IDs.
    pub items: Vec<String>,
    /// Index of the currently-playing track (or 0 when empty).
    pub current: usize,
    pub repeat: RepeatMode,
    pub shuffle: ShuffleMode,
    /// When shuffle is on, this holds the *original* ordering so unshuffling
    /// restores the user's queue.
    pub original_order: Option<Vec<String>>,
    /// Position (seconds) the current track should resume from.
    pub resume_position: f64,
}

impl Default for TrackQueue {
    fn default() -> Self {
        Self {
            items: Vec::new(),
            current: 0,
            repeat: RepeatMode::Off,
            shuffle: ShuffleMode::Off,
            original_order: None,
            resume_position: 0.0,
        }
    }
}

impl TrackQueue {
    /// Build a new queue from an ordered list of track IDs.
    pub fn new(items: Vec<String>) -> Self {
        Self {
            items,
            current: 0,
            ..Default::default()
        }
    }

    /// Returns `true` if the queue is empty.
    pub fn is_empty(&self) -> bool {
        self.items.is_empty()
    }

    /// Queue length.
    pub fn len(&self) -> usize {
        self.items.len()
    }

    /// Currently-playing track ID (or `None` if empty).
    pub fn current_id(&self) -> Option<&str> {
        self.items.get(self.current).map(|s| s.as_str())
    }

    /// Advance to the next track. Returns the new current ID, or `None` if
    /// the queue has ended (and `repeat` is `Off`).
    ///
    /// Honors `RepeatMode::One` (re-plays current) and `RepeatMode::All`
    /// (wraps to start).
    pub fn next(&mut self) -> Option<&str> {
        if self.items.is_empty() {
            return None;
        }
        match self.repeat {
            RepeatMode::One => {
                self.resume_position = 0.0;
                Some(self.items[self.current].as_str())
            }
            RepeatMode::All => {
                self.current = (self.current + 1) % self.items.len();
                self.resume_position = 0.0;
                Some(self.items[self.current].as_str())
            }
            RepeatMode::Off => {
                if self.current + 1 < self.items.len() {
                    self.current += 1;
                    self.resume_position = 0.0;
                    Some(self.items[self.current].as_str())
                } else {
                    None
                }
            }
        }
    }

    /// Go to the previous track. If more than 3 seconds into the current
    /// track, simply restart the current track instead (matches web UX).
    pub fn prev(&mut self, current_position_secs: f64) -> Option<&str> {
        if self.items.is_empty() {
            return None;
        }
        if current_position_secs > 3.0 {
            self.resume_position = 0.0;
            return Some(self.items[self.current].as_str());
        }
        match self.repeat {
            RepeatMode::All => {
                self.current = if self.current == 0 {
                    self.items.len() - 1
                } else {
                    self.current - 1
                };
            }
            _ => {
                self.current = self.current.saturating_sub(1);
            }
        }
        self.resume_position = 0.0;
        Some(self.items[self.current].as_str())
    }

    /// Jump to a specific track ID in the queue. Returns `false` if not found.
    pub fn jump_to(&mut self, track_id: &str) -> bool {
        if let Some(idx) = self.items.iter().position(|i| i == track_id) {
            self.current = idx;
            self.resume_position = 0.0;
            true
        } else {
            false
        }
    }

    /// Append a track to the end of the queue.
    pub fn enqueue(&mut self, track_id: impl Into<String>) {
        let id = track_id.into();
        if let Some(orig) = self.original_order.as_mut() {
            orig.push(id.clone());
        }
        self.items.push(id);
    }

    /// Insert a track immediately after the current one ("play next").
    pub fn play_next(&mut self, track_id: impl Into<String>) {
        let id = track_id.into();
        let insert_at = (self.current + 1).min(self.items.len());
        self.items.insert(insert_at, id);
    }

    /// Remove the track at `index`. Cannot remove the currently-playing track.
    pub fn remove(&mut self, index: usize) -> Option<String> {
        if index >= self.items.len() || index == self.current {
            return None;
        }
        let removed = self.items.remove(index);
        if index < self.current {
            self.current -= 1;
        }
        Some(removed)
    }

    /// Reorder: move `from` → `to`.
    pub fn move_item(&mut self, from: usize, to: usize) -> bool {
        if from == self.current || to == self.current || from >= self.items.len() || to >= self.items.len() {
            return false;
        }
        let item = self.items.remove(from);
        self.items.insert(to, item);
        true
    }

    /// Remove all tracks *after* the current one.
    pub fn clear_upcoming(&mut self) {
        self.items.truncate(self.current + 1);
        self.original_order = self.original_order.take().map(|mut o| {
            o.truncate(self.current + 1);
            o
        });
    }

    /// Enable shuffle. The current track stays put; upcoming tracks are
    /// Fisher-Yates shuffled.
    pub fn enable_shuffle(&mut self) {
        if self.shuffle == ShuffleMode::On || self.items.len() <= 2 {
            self.shuffle = ShuffleMode::On;
            return;
        }
        self.original_order = Some(self.items.clone());
        let head = self.current;
        let mut tail: Vec<String> = self.items.split_off(head + 1);
        fisher_yates(&mut tail);
        self.items.extend(tail);
        self.shuffle = ShuffleMode::On;
    }

    /// Disable shuffle, restoring the original ordering if known.
    pub fn disable_shuffle(&mut self) {
        if self.shuffle == ShuffleMode::Off {
            return;
        }
        if let Some(orig) = self.original_order.take() {
            let current_id = self.items.get(self.current).cloned();
            self.items = orig;
            if let Some(id) = current_id {
                if let Some(idx) = self.items.iter().position(|i| i == &id) {
                    self.current = idx;
                }
            }
        }
        self.shuffle = ShuffleMode::Off;
    }

    /// Cycle repeat mode: off → all → one → off.
    pub fn cycle_repeat(&mut self) -> RepeatMode {
        self.repeat = match self.repeat {
            RepeatMode::Off => RepeatMode::All,
            RepeatMode::All => RepeatMode::One,
            RepeatMode::One => RepeatMode::Off,
        };
        self.repeat
    }

    /// Iterate over distinct track IDs (dedup, preserving first-seen order).
    pub fn unique_ids(&self) -> Vec<String> {
        let mut seen = HashSet::new();
        self.items
            .iter()
            .filter(|i| seen.insert(i.to_string()))
            .cloned()
            .collect()
    }
}

/// Fisher-Yates shuffle — deterministic given a seed (for testing).
pub fn fisher_yates<T>(slice: &mut [T]) {
    use std::time::SystemTime;
    let mut seed = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .map(|d| d.as_nanos() as u64)
        .unwrap_or(0xC0FFEE);
    for i in (1..slice.len()).rev() {
        // xorshift64
        seed ^= seed << 13;
        seed ^= seed >> 7;
        seed ^= seed << 17;
        let j = (seed % (i as u64 + 1)) as usize;
        slice.swap(i, j);
    }
}

/// Thread-safe wrapper around `TrackQueue` for cross-thread sharing.
pub type SharedQueue = Arc<RwLock<TrackQueue>>;

/// Build a new shared queue.
pub fn shared_queue(items: Vec<String>) -> SharedQueue {
    Arc::new(RwLock::new(TrackQueue::new(items)))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ids(xs: &[&str]) -> Vec<String> {
        xs.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn next_walks_forward_and_stops_at_end() {
        let mut q = TrackQueue::new(ids(&["a", "b", "c"]));
        assert_eq!(q.current_id(), Some("a"));
        assert_eq!(q.next(), Some("b"));
        assert_eq!(q.next(), Some("c"));
        assert_eq!(q.next(), None);
    }

    #[test]
    fn repeat_all_wraps_around() {
        let mut q = TrackQueue::new(ids(&["a", "b"]));
        q.repeat = RepeatMode::All;
        assert_eq!(q.next(), Some("b"));
        assert_eq!(q.next(), Some("a"));
        assert_eq!(q.next(), Some("b"));
    }

    #[test]
    fn repeat_one_keeps_current() {
        let mut q = TrackQueue::new(ids(&["a", "b"]));
        q.repeat = RepeatMode::One;
        assert_eq!(q.next(), Some("a"));
        assert_eq!(q.next(), Some("a"));
    }

    #[test]
    fn prev_restarts_if_more_than_3s_in() {
        let mut q = TrackQueue::new(ids(&["a", "b"]));
        q.current = 1;
        assert_eq!(q.prev(5.0), Some("b"));
        assert_eq!(q.resume_position, 0.0);
    }

    #[test]
    fn prev_goes_back_if_early_in_track() {
        let mut q = TrackQueue::new(ids(&["a", "b", "c"]));
        q.current = 2;
        assert_eq!(q.prev(1.0), Some("b"));
    }

    #[test]
    fn play_next_inserts_after_current() {
        let mut q = TrackQueue::new(ids(&["a", "b", "c"]));
        q.current = 1;
        q.play_next("x");
        assert_eq!(q.items, ids(&["a", "b", "x", "c"]));
    }

    #[test]
    fn remove_cannot_remove_current() {
        let mut q = TrackQueue::new(ids(&["a", "b", "c"]));
        q.current = 1;
        assert_eq!(q.remove(1), None);
        assert_eq!(q.remove(0), Some("a".into()));
        assert_eq!(q.current, 0);
    }

    #[test]
    fn move_item_skips_current() {
        let mut q = TrackQueue::new(ids(&["a", "b", "c", "d"]));
        q.current = 2; // "c"
        assert!(!q.move_item(2, 0));
        assert!(q.move_item(0, 1)); // a↔b
        assert_eq!(q.items, ids(&["b", "a", "c", "d"]));
        assert_eq!(q.current, 2);
    }

    #[test]
    fn shuffle_preserves_current_position() {
        let mut q = TrackQueue::new(ids(&["a", "b", "c", "d", "e"]));
        q.current = 2; // "c"
        q.enable_shuffle();
        assert_eq!(q.current_id(), Some("c"));
        assert!(q.original_order.is_some());
        let orig_len = q.original_order.as_ref().unwrap().len();
        assert_eq!(orig_len, 5);
        // After unshuffling, current track is still "c"
        q.disable_shuffle();
        assert_eq!(q.current_id(), Some("c"));
    }

    #[test]
    fn cycle_repeat_off_all_one_off() {
        let mut q = TrackQueue::new(ids(&["a"]));
        assert_eq!(q.cycle_repeat(), RepeatMode::All);
        assert_eq!(q.cycle_repeat(), RepeatMode::One);
        assert_eq!(q.cycle_repeat(), RepeatMode::Off);
    }

    #[test]
    fn unique_ids_dedups_preserving_order() {
        let q = TrackQueue::new(ids(&["a", "b", "a", "c", "b"]));
        assert_eq!(q.unique_ids(), ids(&["a", "b", "c"]));
    }

    #[test]
    fn clear_upcoming_keeps_history() {
        let mut q = TrackQueue::new(ids(&["a", "b", "c", "d"]));
        q.current = 1;
        q.clear_upcoming();
        assert_eq!(q.items, ids(&["a", "b"]));
    }
}
