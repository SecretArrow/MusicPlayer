//! Integration tests for `PlaybackController` — the playback state machine.
//!
//! The controller owns a background decoder thread, so these tests poll
//! observable state with plain `#[test]` + sleeps (no tokio needed).

use std::path::PathBuf;
use std::time::{Duration, Instant};

use audio_core::effects::{preset_gains, EqSettings};
use audio_core::playback::{PlaybackController, PlaybackState};
use audio_core::queue::shared_queue;

/// Poll until the controller reaches `want`, failing after `timeout`.
///
/// This keeps the tests deterministic without fixed sleeps: the decoder
/// thread reacts to commands within ~50 ms, so 5 s is a generous bound.
fn wait_for_state(ctrl: &PlaybackController, want: PlaybackState, timeout: Duration) {
    let deadline = Instant::now() + timeout;
    while ctrl.state() != want {
        assert!(
            Instant::now() < deadline,
            "controller never reached {want:?} within {timeout:?} (state={:?})",
            ctrl.state(),
        );
        std::thread::sleep(Duration::from_millis(10));
    }
}

#[test]
fn new_controller_starts_stopped() {
    let queue = shared_queue(vec!["a".to_string(), "b".to_string()]);
    let ctrl = PlaybackController::new(queue);

    assert_eq!(ctrl.state(), PlaybackState::Stopped);
    assert!(ctrl.current_track_id().is_none());
    assert_eq!(ctrl.stream_nonce(), 0);
    assert_eq!(ctrl.duration(), 0.0);
    assert_eq!(ctrl.position(), 0.0);

    ctrl.shutdown();
}

#[test]
fn set_eq_roundtrips_through_controller() {
    let ctrl = PlaybackController::new(shared_queue(vec![]));

    let mut settings = EqSettings::default();
    assert!(!settings.enabled, "EQ ships disabled");
    settings.enabled = true;
    settings.preamp_db = -3.5;
    settings.apply_preset("rock");

    ctrl.set_eq(settings);
    let got = ctrl.eq_settings();

    assert!(got.enabled);
    assert_eq!(got.preset, "rock");
    assert_eq!(got.bands, preset_gains("rock"));
    assert_eq!(got.preamp_db, -3.5);

    // A second update overwrites the snapshot (UI thread semantics).
    let mut other = EqSettings::default();
    other.apply_preset("jazz");
    ctrl.set_eq(other);
    assert_eq!(ctrl.eq_settings().preset, "jazz");
    assert_eq!(ctrl.eq_settings().bands, preset_gains("jazz"));

    ctrl.shutdown();
}

#[test]
fn play_file_nonexistent_transitions_safely_back_to_stopped() {
    let dir = tempfile::tempdir().expect("tempdir");
    // A path inside an existing directory, but the file itself is missing.
    let missing: PathBuf = dir.path().join("does-not-exist.mp3");

    let ctrl = PlaybackController::new(shared_queue(vec![]));
    let nonce_before = ctrl.stream_nonce();

    ctrl.play_file(missing, 0.0); // must not panic
    assert_eq!(
        ctrl.stream_nonce(),
        nonce_before + 1,
        "stream nonce must bump even for a failed open"
    );

    // The decoder thread fails to open the file and must fall back to
    // Stopped (never stuck in Loading, never panicking).
    wait_for_state(&ctrl, PlaybackState::Stopped, Duration::from_secs(5));
    assert!(ctrl.current_track_id().is_none(), "no track was opened");
    assert_eq!(ctrl.duration(), 0.0);

    ctrl.shutdown();
}

#[test]
fn stream_nonce_increments_per_play_file() {
    let ctrl = PlaybackController::new(shared_queue(vec![]));

    let n0 = ctrl.stream_nonce();
    ctrl.play_file(PathBuf::from("/definitely/not/here-1.mp3"), 0.0);
    let n1 = ctrl.stream_nonce();
    ctrl.play_file(PathBuf::from("/definitely/not/here-2.mp3"), 5.0);
    let n2 = ctrl.stream_nonce();

    assert_eq!(n1, n0 + 1, "first play_file bumps the nonce by exactly 1");
    assert_eq!(n2, n1 + 1, "second play_file bumps the nonce again");

    wait_for_state(&ctrl, PlaybackState::Stopped, Duration::from_secs(5));
    ctrl.shutdown();
}

#[test]
fn shutdown_is_idempotent_and_drop_does_not_panic() {
    let ctrl = PlaybackController::new(shared_queue(vec!["x".to_string()]));

    ctrl.shutdown();
    ctrl.shutdown(); // second call must be a harmless no-op

    drop(ctrl); // Drop impl calls shutdown() again — must not panic
    std::thread::sleep(Duration::from_millis(100)); // let the decoder thread exit
}
