//! Rust bridge for the Android app — exposes `audio_core` via UniFFI.
//!
//! Consumed by Kotlin through generated bindings. The Kotlin layer handles
//! Android lifecycle, Media3 integration, Android Auto, and UI; this crate
//! only exposes the cross-platform audio engine.
//!
//! ## UniFFI style
//!
//! This crate uses the modern **proc-macro** API (UniFFI 0.28): the interface
//! is declared directly in Rust with `#[uniffi::export]`, `#[uniffi::Object]`,
//! `#[derive(uniffi::Record)]` and `#[derive(uniffi::Enum)]` — there is no
//! `.udl` file and no `build.rs`. Scaffolding is initialized by
//! `uniffi::setup_scaffolding!` below and bindings are generated in
//! **library mode** from the built cdylib (see `generate-bindings.sh`).
//!
//! Kotlin-side names are unchanged compared to the old UDL file:
//!   - namespace / package: `uniffi.musicplayer`
//!   - object: `Player`
//!   - enums: `PlaybackState`, `RepeatMode`
//!   - record: `EqSettings` (with `bands: List<Float>`)
//!
//! `audio_core` types cannot be annotated with UniFFI derives (that crate has
//! no UniFFI dependency), so this crate defines thin bridge-local mirror types
//! with the same names and converts to/from the core types.

use std::sync::Arc;

use audio_core::effects::EqSettings as CoreEqSettings;
use audio_core::playback::PlaybackState as CorePlaybackState;
use audio_core::queue::{RepeatMode as CoreRepeatMode, TrackQueue};
use parking_lot::Mutex;

uniffi::setup_scaffolding!("musicplayer");

// ---------------------------------------------------------------------------
// Bridge-local UniFFI types (mirrors of the audio-core types)
// ---------------------------------------------------------------------------

/// Playback state — mirror of `audio_core::playback::PlaybackState`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, uniffi::Enum)]
pub enum PlaybackState {
    Stopped,
    Loading,
    Playing,
    Paused,
    Ended,
}

impl From<CorePlaybackState> for PlaybackState {
    fn from(s: CorePlaybackState) -> Self {
        match s {
            CorePlaybackState::Stopped => Self::Stopped,
            CorePlaybackState::Loading => Self::Loading,
            CorePlaybackState::Playing => Self::Playing,
            CorePlaybackState::Paused => Self::Paused,
            CorePlaybackState::Ended => Self::Ended,
        }
    }
}

/// Repeat mode — mirror of `audio_core::queue::RepeatMode`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, uniffi::Enum)]
pub enum RepeatMode {
    /// No repeat — stop at end of queue.
    Off,
    /// Repeat the whole queue.
    All,
    /// Repeat the current track.
    One,
}

impl From<CoreRepeatMode> for RepeatMode {
    fn from(m: CoreRepeatMode) -> Self {
        match m {
            CoreRepeatMode::Off => Self::Off,
            CoreRepeatMode::All => Self::All,
            CoreRepeatMode::One => Self::One,
        }
    }
}

impl From<RepeatMode> for CoreRepeatMode {
    fn from(m: RepeatMode) -> Self {
        match m {
            RepeatMode::Off => Self::Off,
            RepeatMode::All => Self::All,
            RepeatMode::One => Self::One,
        }
    }
}

/// EQ settings — mirror of `audio_core::effects::EqSettings`.
///
/// The core type stores `bands` as `[f32; 10]`; UniFFI cannot express fixed
/// arrays, so Kotlin sees `bands: List<Float>`. Conversions pad with `0.0`
/// (flat) or truncate to keep exactly 10 bands.
#[derive(Debug, Clone, uniffi::Record)]
pub struct EqSettings {
    pub enabled: bool,
    pub preset: String,
    /// Preamp in dB, applied after the EQ chain.
    pub preamp_db: f32,
    /// 10 bands, gain dB each.
    pub bands: Vec<f32>,
}

impl From<CoreEqSettings> for EqSettings {
    fn from(s: CoreEqSettings) -> Self {
        Self {
            enabled: s.enabled,
            preset: s.preset.clone(),
            preamp_db: s.preamp_db,
            bands: s.bands.to_vec(),
        }
    }
}

impl From<EqSettings> for CoreEqSettings {
    fn from(s: EqSettings) -> Self {
        let mut bands = [0.0_f32; 10];
        for (dst, src) in bands.iter_mut().zip(s.bands.iter()) {
            *dst = *src;
        }
        Self {
            enabled: s.enabled,
            preset: s.preset,
            preamp_db: s.preamp_db,
            bands,
        }
    }
}

// ---------------------------------------------------------------------------
// Exported free functions
// ---------------------------------------------------------------------------

/// Initialize the audio engine. Called once at app startup.
#[uniffi::export]
pub fn init_engine() {
    let _ = env_logger::try_init();
    log::info!("MusicPlayer Android engine v{}", audio_core::VERSION);
}

/// Library version string.
#[uniffi::export]
pub fn version() -> String {
    audio_core::VERSION.to_string()
}

// ---------------------------------------------------------------------------
// The player object exposed to Kotlin
// ---------------------------------------------------------------------------

/// The player object exposed to Kotlin.
#[derive(uniffi::Object)]
pub struct Player {
    controller: Arc<audio_core::PlaybackController>,
    queue: Arc<parking_lot::RwLock<TrackQueue>>,
    volume: Mutex<f32>,
}

#[uniffi::export]
impl Player {
    /// Construct a new player (called by Kotlin).
    #[uniffi::constructor]
    pub fn new() -> Arc<Self> {
        let queue = audio_core::queue::shared_queue(Vec::new());
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

    /// Seek to position (seconds).
    pub fn seek(&self, secs: f64) {
        self.controller.seek(secs);
    }

    /// Advance to next track.
    pub fn next(&self) {
        self.controller.next(|_id| None);
    }

    /// Go to previous track.
    pub fn prev(&self) {
        self.controller.prev(|_id| None);
    }

    /// Set volume (0..1).
    pub fn set_volume(&self, v: f32) {
        *self.volume.lock() = v.clamp(0.0, 1.0);
        // Note: actual volume scaling happens in the audio backend.
    }

    /// Get current state.
    pub fn state(&self) -> PlaybackState {
        self.controller.state().into()
    }

    /// Get current track ID.
    pub fn current_track_id(&self) -> Option<String> {
        self.controller.current_track_id()
    }

    /// Get current position (seconds).
    pub fn position(&self) -> f64 {
        self.controller.position()
    }

    /// Get current track duration (seconds).
    pub fn duration(&self) -> f64 {
        self.controller.duration()
    }

    /// Get current EQ settings (snapshot).
    pub fn eq_settings(&self) -> EqSettings {
        self.controller.eq_settings().into()
    }

    /// Update EQ settings.
    pub fn set_eq(&self, settings: EqSettings) {
        self.controller.set_eq(settings.into());
    }

    /// Set repeat mode.
    pub fn set_repeat(&self, mode: RepeatMode) {
        let mut q = self.queue.write();
        q.repeat = mode.into();
    }

    /// Toggle shuffle.
    pub fn set_shuffle(&self, on: bool) {
        let mut q = self.queue.write();
        if on {
            q.enable_shuffle();
        } else {
            q.disable_shuffle();
        }
    }

    /// Shutdown the engine.
    pub fn shutdown(&self) {
        self.controller.shutdown();
    }
}

impl Default for Player {
    fn default() -> Self {
        Arc::into_inner(Self::new()).unwrap_or_else(|| Self {
            controller: audio_core::PlaybackController::new(audio_core::queue::shared_queue(
                Vec::new(),
            )),
            queue: audio_core::queue::shared_queue(Vec::new()),
            volume: Mutex::new(0.7),
        })
    }
}
