//! MusicPlayer — native desktop entry point.
//!
//! Bootstraps a Winit window, initializes the audio engine + playback
//! controller, and runs the Vello render loop. The window event loop is
//! the single source of truth for input + redraw.

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

    // Build the audio engine + playback controller.
    let queue = audio_core::queue::shared_queue(Vec::new());
    let controller = audio_core::PlaybackController::new(queue);

    // Create the Winit event loop + window.
    let event_loop = winit::event_loop::EventLoop::new().expect("failed to create event loop");
    let window = winit::window::WindowBuilder::new()
        .with_title("MusicPlayer")
        .with_inner_size(winit::dpi::LogicalSize::new(1280.0, 800.0))
        .with_min_inner_size(winit::dpi::LogicalSize::new(800.0, 600.0))
        .build(&event_loop)
        .expect("failed to create window");

    // Initialize the CPAL audio backend.
    let backend = match audio_core::audio_output::CpalBackend::new(controller.clone()) {
        Ok(b) => Some(b),
        Err(e) => {
            log::error!("audio backend init failed: {}", e);
            None
        }
    };
    let _ = backend;

    // Initialize the app state.
    let app_state = Arc::new(app::AppState::new(controller));

    // Run the Vello renderer.
    pollster::block_on(render::run(event_loop, window, app_state));
}
