//! App state — shared between the render thread and event handlers.

use audio_core::PlaybackController;
use parking_lot::RwLock;
use std::sync::Arc;

use crate::theme::Theme;

/// Global app state.
pub struct AppState {
    pub controller: Arc<PlaybackController>,
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
    Settings,
}

impl Default for View {
    fn default() -> Self {
        View::Home
    }
}

impl AppState {
    pub fn new(controller: Arc<PlaybackController>) -> Self {
        Self {
            controller,
            theme: RwLock::new(Theme::default()),
            view: RwLock::new(View::default()),
            show_eq: RwLock::new(false),
            show_queue: RwLock::new(false),
            window_size: RwLock::new((1280.0, 800.0)),
            scale: RwLock::new(1.0),
        }
    }
}
