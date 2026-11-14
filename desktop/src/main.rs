//! MusicPlayer — native desktop entry point.
//!
//! Bootstraps a Winit 0.30 event loop, initializes the audio engine +
//! playback controller, and hands rendering to `render::VelloApp`.
//! The event loop is the single source of truth for input + redraw.

#![forbid(unsafe_op_in_unsafe_fn)]

mod app;
mod render;
mod theme;
mod ui;

use std::sync::Arc;

fn main() {
    env_logger::init();
    log::info!(
        "MusicPlayer desktop v{} starting",
        env!("CARGO_PKG_VERSION")
    );

    // Build the audio engine + playback controller + shared library.
    let queue = audio_core::queue::shared_queue(Vec::new());
    let controller = audio_core::PlaybackController::new(queue.clone());
    let library = Arc::new(parking_lot::RwLock::new(audio_core::Library::new()));

    // Initialize the CPAL audio backend (feature "audio"; requires ALSA on Linux).
    // The stream is leaked internally by AudioOutput::new and runs for the
    // whole process; dropping the returned handle does not stop playback.
    #[cfg(feature = "audio")]
    {
        match audio_core::audio_output::AudioOutput::new(controller.clone()) {
            Ok(_audio) => {}
            Err(e) => {
                log::error!("audio backend init failed: {e}");
            }
        }
    }
    #[cfg(not(feature = "audio"))]
    {
        log::warn!("built without audio_output — playback will be silent");
    }

    // Initialize the app state.
    let app_state = Arc::new(app::AppState::new(controller, queue, library));

    // Winit 0.30: EventLoop<T> is generic; window creation happens in
    // ApplicationHandler::resumed via create_window (no WindowBuilder).
    let event_loop = winit::event_loop::EventLoop::builder()
        .build()
        .expect("failed to create event loop");

    let mut handler = render::VelloApp::new(app_state);
    event_loop.run_app(&mut handler).expect("event loop failed");
}
