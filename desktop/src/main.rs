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

/// Headless smoke-test entry point: parse CLI flags BEFORE initializing any
/// windowing / audio backend. Used by the post-release smoke-test workflow
/// (`smoke-test.yml`) to validate a freshly-published binary without
/// requiring a display server or audio device.
///
/// Supported flags:
///   --version        Print `musicplayer-desktop <pkg_version>` and exit 0.
///   --smoke-test     Initialize the audio-core library path (no CPAL stream,
///                    no window), report per-subsystem readiness, exit 0 on
///                    success or non-zero on any panic/error.
///   (no flags)       Normal launch: full event loop + window.
fn parse_cli_flags() -> Option<SmokeAction> {
    let mut args = std::env::args().skip(1);
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--version" | "-V" => return Some(SmokeAction::Version),
            "--smoke-test" => return Some(SmokeAction::SmokeTest),
            // Silently ignore winit-injected args (e.g. --help on macOS).
            _ => {}
        }
    }
    None
}

enum SmokeAction {
    Version,
    SmokeTest,
}

fn run_smoke_test() -> i32 {
    use std::io::Write;
    let mut out = std::io::stdout();
    let _ = writeln!(out, "musicplayer-desktop smoke-test starting");

    // Subsystem 1: shared audio-core queue + playback controller.
    let queue = audio_core::queue::shared_queue(Vec::new());
    let controller = audio_core::PlaybackController::new(queue.clone());
    let _ = writeln!(
        out,
        "  [ok] audio-core queue + PlaybackController initialized"
    );

    // Subsystem 2: library (metadata scan path object).
    let _library = Arc::new(parking_lot::RwLock::new(audio_core::Library::new()));
    let _ = writeln!(out, "  [ok] audio-core Library initialized");

    // Subsystem 3: theme + layout table loads without panic.
    let _theme = crate::theme::Theme::default();
    let _ = writeln!(out, "  [ok] desktop theme subsystem initialized");

    // Subsystem 4: controller reports the expected initial state (0.0 secs).
    let pos = controller.position();
    let _ = writeln!(
        out,
        "  [ok] PlaybackController initial position: {pos}s (expected 0.0)"
    );
    if pos != 0.0 {
        let _ = writeln!(
            std::io::stderr(),
            "FAIL: position should be 0.0 at startup, got {pos}"
        );
        return 1;
    }

    let _ = writeln!(out, "musicplayer-desktop smoke-test PASSED");
    0
}

fn main() {
    env_logger::init();
    log::info!(
        "MusicPlayer desktop v{} starting",
        env!("CARGO_PKG_VERSION")
    );

    // Handle headless CLI flags BEFORE touching CPAL / winit. This lets the
    // post-release smoke-test workflow validate the binary on a CI runner
    // with no display server or audio hardware.
    if let Some(action) = parse_cli_flags() {
        let code = match action {
            SmokeAction::Version => {
                println!("musicplayer-desktop {}", env!("CARGO_PKG_VERSION"));
                0
            }
            SmokeAction::SmokeTest => run_smoke_test(),
        };
        std::process::exit(code);
    }

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
