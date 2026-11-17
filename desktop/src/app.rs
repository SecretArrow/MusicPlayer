//! App state — shared between the render thread and event handlers.

use audio_core::{PlaybackController, EqSettings};
use parking_lot::RwLock;
use std::sync::Arc;

use crate::theme::Theme;
use crate::ui::HitRegion;

/// Shared play queue handle (same instance the controller holds).
pub type SharedQueue = Arc<RwLock<TrackQueue>>;

use audio_core::TrackQueue;

/// Global app state.
pub struct AppState {
    pub controller: Arc<PlaybackController>,
    /// Play queue (shuffle/repeat/current selection live here).
    pub queue: SharedQueue,
    /// Scanned library (track metadata for display + path lookups).
    pub library: Arc<RwLock<Library>>,
    /// Optional handle to the live CPAL output stream (None when built
    /// without the `audio` feature). UI volume / mute / EQ changes are
    /// pushed to this handle so they reach the audio thread.
    #[cfg(feature = "audio")]
    pub audio_output: Option<Arc<audio_core::audio_output::AudioOutput>>,
    /// Playlist store (user-created playlists). Lazily populated; persists
    /// only in-memory for the lifetime of the process for now.
    pub playlists: Arc<RwLock<audio_core::PlaylistStore>>,
    pub theme: RwLock<Theme>,
    /// Current view: home / library / playlists / now playing.
    pub view: RwLock<View>,
    /// Whether the EQ panel is open.
    pub show_eq: RwLock<bool>,
    /// Whether the queue panel is open.
    pub show_queue: RwLock<bool>,
    /// Logical window size (DPI-independent).
    pub window_size: RwLock<(f32, f32)>,
    /// DPI scale factor.
    pub scale: RwLock<f32>,
    /// UI volume 0..1 (visual state + pushed to audio backend on change).
    pub volume: RwLock<f32>,
    pub muted: RwLock<bool>,
    /// EQ state (preset name, bands, preamp dB, enabled flag).
    /// Pushed to controller + audio_output whenever it changes.
    pub eq: RwLock<EqSettings>,
    /// Hit regions produced by the last `ui::render` — rebuilt every frame.
    pub hit_zones: RwLock<Vec<HitRegion>>,
    /// Last cursor position in window (physical) coordinates.
    pub mouse_pos: RwLock<(f64, f64)>,
    /// Left mouse button currently held down?
    pub mouse_down: RwLock<bool>,
    /// Monotonic elapsed seconds (for blink/pulse animations).
    pub elapsed: RwLock<f64>,
}

/// Top-level view enum — mirrors the web app's `View`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
#[allow(dead_code)] // mirrors the full web app view set; more views land later
pub enum View {
    #[default]
    Home,
    Library,
    Playlists,
    NowPlaying,
    Queue,
    Lyrics,
    Search,
    Recent,
    Genre,
    Stats,
    Settings,
}

impl AppState {
    pub fn new(
        controller: Arc<PlaybackController>,
        queue: SharedQueue,
        library: Arc<RwLock<Library>>,
        #[cfg(feature = "audio")] audio_output: Option<Arc<audio_core::audio_output::AudioOutput>>,
    ) -> Self {
        let eq = EqSettings::default();
        let s = Self {
            controller,
            queue,
            library,
            #[cfg(feature = "audio")]
            audio_output,
            playlists: Arc::new(RwLock::new(audio_core::PlaylistStore::new())),
            theme: RwLock::new(Theme::default()),
            view: RwLock::new(View::default()),
            show_eq: RwLock::new(false),
            show_queue: RwLock::new(false),
            window_size: RwLock::new((1280.0, 800.0)),
            scale: RwLock::new(1.0),
            volume: RwLock::new(0.8),
            muted: RwLock::new(false),
            eq: RwLock::new(eq.clone()),
            hit_zones: RwLock::new(Vec::new()),
            mouse_pos: RwLock::new((0.0, 0.0)),
            mouse_down: RwLock::new(false),
            elapsed: RwLock::new(0.0),
        };
        // Apply initial volume + EQ to the audio backend.
        s.apply_volume();
        s.apply_eq(&eq);
        s
    }

    /// Push current `volume` + `muted` state to the audio backend (if any).
    /// Linear gain: muted → 0, else volume (0..1) so 1.0 = unity.
    pub fn apply_volume(&self) {
        #[cfg(feature = "audio")]
        if let Some(out) = &self.audio_output {
            let muted = *self.muted.read();
            let vol = *self.volume.read();
            out.set_muted(muted);
            out.set_volume(if muted { 0.0 } else { vol });
        }
        // Without the audio feature we still keep the visual state for UI.
        #[cfg(not(feature = "audio"))]
        {
            let _ = (self.volume.read(), self.muted.read());
        }
    }

    /// Push EQ settings to the playback controller + audio output EQ chain.
    /// `sample_rate` defaults to the engine rate when not known yet.
    pub fn apply_eq(&self, settings: &EqSettings) {
        self.controller.set_eq(settings.clone());
        #[cfg(feature = "audio")]
        if let Some(out) = &self.audio_output {
            out.update_eq(settings, audio_core::ENGINE_SAMPLE_RATE as f64);
        }
    }
}

use audio_core::Library;
