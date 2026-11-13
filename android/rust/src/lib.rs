//! Rust bridge for the Android app — exposes `audio_core` via UniFFI.
//!
//! Consumed by Kotlin through generated bindings. The Kotlin layer handles
//! Android lifecycle, Media3 integration, Android Auto, and UI; this crate
//! only exposes the cross-platform audio engine.

uniffi::include_scaffolding!("musicplayer");

use std::sync::Arc;
use parking_lot::Mutex;

use audio_core::effects::EqSettings;
use audio_core::playback::PlaybackState;
use audio_core::queue::{RepeatMode, ShuffleMode, TrackQueue, shared_queue};

/// Initialize the audio engine. Called once at app startup.
pub fn init_engine() {
    let _ = env_logger::try_init();
    log::info!("MusicPlayer Android engine v{}", audio_core::VERSION);
}

/// Library version string.
pub fn version() -> String {
    audio_core::VERSION.to_string()
}

/// The player object exposed to Kotlin.
pub struct Player {
    controller: Arc<audio_core::PlaybackController>,
    queue: Arc<parking_lot::RwLock<TrackQueue>>,
    volume: Mutex<f32>,
}

impl Player {
    /// Construct a new player (called by Kotlin).
    pub fn new() -> Arc<Self> {
        let queue = shared_queue(Vec::new());
        let controller = audio_core::PlaybackController::new(queue.clone());
        Arc::new(Self {
            controller,
            queue,
            volume: Mutex::new(0.7),
        })
    }

    /// Open a file path and start playback.
    pub fn play_file(&self, path: String) {
        let path = std::path::PathBuf::from(path);
        self.controller.play_file(path, 0.0);
    }

    pub fn pause(&self) {
        self.controller.pause();
    }

    pub fn resume(&self) {
        self.controller.resume();
    }

    pub fn stop(&self) {
        self.controller.stop();
    }

    pub fn seek(&self, secs: f64) {
        self.controller.seek(secs);
    }

    pub fn next(&self) {
        self.controller.next(|_id| None);
    }

    pub fn prev(&self) {
        self.controller.prev(|_id| None);
    }

    pub fn set_volume(&self, v: f32) {
        *self.volume.lock() = v.clamp(0.0, 1.0);
        // Note: actual volume scaling happens in the audio backend.
    }

    pub fn state(&self) -> PlaybackState {
        self.controller.state()
    }

    pub fn current_track_id(&self) -> Option<String> {
        self.controller.current_track_id()
    }

    pub fn position(&self) -> f64 {
        self.controller.position()
    }

    pub fn duration(&self) -> f64 {
        self.controller.duration()
    }

    pub fn eq_settings(&self) -> EqSettings {
        self.controller.eq_settings()
    }

    pub fn set_eq(&self, settings: EqSettings) {
        self.controller.set_eq(settings);
    }

    pub fn set_repeat(&self, mode: RepeatMode) {
        let mut q = self.queue.write();
        q.repeat = mode;
    }

    pub fn set_shuffle(&self, on: bool) {
        let mut q = self.queue.write();
        if on {
            q.enable_shuffle();
        } else {
            q.disable_shuffle();
        }
    }

    pub fn shutdown(&self) {
        self.controller.shutdown();
    }
}

impl Default for Player {
    fn default() -> Self {
        Arc::into_inner(Self::new()).unwrap_or_else(|| Self {
            controller: audio_core::PlaybackController::new(shared_queue(Vec::new())),
            queue: shared_queue(Vec::new()),
            volume: Mutex::new(0.7),
        })
    }
}
