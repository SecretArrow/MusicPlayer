//! App state — shared between the render thread and event handlers.

use audio_core::PlaybackController;
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
    /// UI volume 0..1 (visual state; audio gain follows the backend).
    pub volume: RwLock<f32>,
    pub muted: RwLock<bool>,
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
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum View {
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

impl Default for View {
    fn default() -> Self {
        View::Home
    }
}

impl AppState {
    pub fn new(
        controller: Arc<PlaybackController>,
        queue: SharedQueue,
        library: Arc<RwLock<Library>>,
    ) -> Self {
        Self {
            controller,
            queue,
            library,
            theme: RwLock::new(Theme::default()),
            view: RwLock::new(View::default()),
            show_eq: RwLock::new(false),
            show_queue: RwLock::new(false),
            window_size: RwLock::new((1280.0, 800.0)),
            scale: RwLock::new(1.0),
            volume: RwLock::new(0.8),
            muted: RwLock::new(false),
            hit_zones: RwLock::new(Vec::new()),
            mouse_pos: RwLock::new((0.0, 0.0)),
            mouse_down: RwLock::new(false),
            elapsed: RwLock::new(0.0),
        }
    }
}

use audio_core::Library;
