//! High-level playback controller.
//!
//! Owns the queue, the current decoder, and the EQ. Owns a background
//! decoder thread that feeds a bounded sample ring buffer; the realtime
//! audio callback (`audio_output::AudioOutput`) drains the buffer in its
//! `data_callback`.
//!
//! Cross-platform: this module has no platform deps (no CPAL). The audio
//! output backend is a separate feature-gated module.

use crossbeam_channel::{bounded, Receiver, Sender};
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use thiserror::Error;

use crate::decoder::{open_file, Decoder, DecoderError};
use crate::effects::{BiquadEq, EqSettings};
use crate::queue::SharedQueue;

/// Realtime sample ring buffer capacity (frames; stereo = 2x samples).
pub const RING_BUFFER_FRAMES: usize = 16384;

/// A single playback command (sent to the decoder thread).
#[derive(Debug)]
enum DecoderCmd {
    Open(PathBuf, f64 /* resume_pos_secs */),
    Stop,
    Seek(f64),
    Exit,
}

/// Public playback state — observable from UI/Kotlin/etc.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PlaybackState {
    Stopped,
    Loading,
    Playing,
    Paused,
    Ended,
}

/// Events the controller emits (UI can subscribe).
#[derive(Debug, Clone, Serialize)]
pub enum PlaybackEvent {
    StateChanged(PlaybackState),
    /// Current track changed.
    TrackChanged {
        id: String,
        duration_secs: f64,
    },
    /// Position update (throttled).
    Position {
        secs: f64,
    },
    /// Track finished; controller auto-advanced to next.
    TrackEnded {
        id: String,
    },
    /// Error during playback.
    Error(String),
}

/// Errors surfaced by the controller.
#[derive(Debug, Error)]
pub enum PlaybackError {
    #[error("decoder error: {0}")]
    Decoder(#[from] DecoderError),
    #[error("no track loaded")]
    NoTrack,
    #[error("ring buffer overflow (decoder too slow)")]
    Overflow,
}

/// The playback controller.
pub struct PlaybackController {
    queue: SharedQueue,
    eq_settings: Mutex<EqSettings>,
    state: Mutex<PlaybackState>,
    current_track_id: Mutex<Option<String>>,
    current_duration: Mutex<f64>,
    current_position: Mutex<f64>,

    /// Realtime sample ring (stereo interleaved f32).
    ring_tx: Sender<f32>,
    /// Backside of the ring buffer — consumed by the audio output backend.
    pub ring_rx: Receiver<f32>,

    /// Command channel to the decoder thread.
    cmd_tx: Sender<DecoderCmd>,
    /// Bumped whenever the audio backend should re-sync to a new stream.
    stream_nonce: AtomicU64,

    /// Stop flag for the decoder thread.
    stop_flag: Arc<AtomicBool>,
}

impl PlaybackController {
    /// Construct a new controller. Spawns the decoder thread.
    pub fn new(queue: SharedQueue) -> Arc<Self> {
        let (ring_tx, ring_rx) = bounded::<f32>(RING_BUFFER_FRAMES * 2);
        let (cmd_tx, cmd_rx) = bounded::<DecoderCmd>(32);
        let stop_flag = Arc::new(AtomicBool::new(false));

        let controller = Arc::new(Self {
            queue,
            eq_settings: Mutex::new(EqSettings::default()),
            state: Mutex::new(PlaybackState::Stopped),
            current_track_id: Mutex::new(None),
            current_duration: Mutex::new(0.0),
            current_position: Mutex::new(0.0),
            ring_tx,
            ring_rx,
            cmd_tx,
            stream_nonce: AtomicU64::new(0),
            stop_flag: stop_flag.clone(),
        });

        // Spawn decoder thread.
        let weak = Arc::downgrade(&controller);
        std::thread::spawn(move || {
            decoder_thread_loop(weak, cmd_rx, stop_flag);
        });

        controller
    }

    /// Open a track file and start playing it.
    pub fn play_file(&self, path: PathBuf, resume_pos_secs: f64) {
        self.set_state(PlaybackState::Loading);
        let _ = self.cmd_tx.send(DecoderCmd::Open(path, resume_pos_secs));
        self.stream_nonce.fetch_add(1, Ordering::SeqCst);
    }

    /// Pause playback.
    pub fn pause(&self) {
        self.set_state(PlaybackState::Paused);
    }

    /// Resume playback.
    pub fn resume(&self) {
        self.set_state(PlaybackState::Playing);
    }

    /// Stop playback and clear the decoder.
    pub fn stop(&self) {
        let _ = self.cmd_tx.send(DecoderCmd::Stop);
        self.set_state(PlaybackState::Stopped);
    }

    /// Seek to a position (seconds).
    pub fn seek(&self, secs: f64) {
        let _ = self.cmd_tx.send(DecoderCmd::Seek(secs));
    }

    /// Advance to the next track in the queue.
    pub fn next(&self, library_path_lookup: impl Fn(&str) -> Option<PathBuf>) {
        let next_id = {
            let mut q = self.queue.write();
            q.next().map(|s| s.to_string())
        };
        if let Some(id) = next_id {
            if let Some(path) = library_path_lookup(&id) {
                *self.current_track_id.lock() = Some(id);
                self.play_file(path, 0.0);
            }
        } else {
            self.set_state(PlaybackState::Ended);
        }
    }

    /// Go to the previous track.
    pub fn prev(&self, library_path_lookup: impl Fn(&str) -> Option<PathBuf>) {
        let pos = *self.current_position.lock();
        let prev_id = {
            let mut q = self.queue.write();
            q.prev(pos).map(|s| s.to_string())
        };
        if let Some(id) = prev_id {
            if let Some(path) = library_path_lookup(&id) {
                *self.current_track_id.lock() = Some(id);
                self.play_file(path, 0.0);
            }
        }
    }

    /// Update EQ settings (called from UI thread). The decoder thread picks
    /// them up on its next sample batch.
    pub fn set_eq(&self, settings: EqSettings) {
        *self.eq_settings.lock() = settings;
    }

    /// Get the current EQ settings (snapshot).
    pub fn eq_settings(&self) -> EqSettings {
        self.eq_settings.lock().clone()
    }

    /// Get the current playback state.
    pub fn state(&self) -> PlaybackState {
        *self.state.lock()
    }

    /// Current track ID.
    pub fn current_track_id(&self) -> Option<String> {
        self.current_track_id.lock().clone()
    }

    /// Current track duration (seconds).
    pub fn duration(&self) -> f64 {
        *self.current_duration.lock()
    }

    /// Current playback position (seconds).
    pub fn position(&self) -> f64 {
        *self.current_position.lock()
    }

    /// Stream nonce — bumped when the audio backend should re-sync.
    pub fn stream_nonce(&self) -> u64 {
        self.stream_nonce.load(Ordering::SeqCst)
    }

    /// Drain `n` samples from the realtime ring (called by audio callback).
    /// Returns the actual number of samples drained.
    pub fn drain_samples(&self, out: &mut [f32]) -> usize {
        let mut written = 0;
        for slot in out.iter_mut() {
            match self.ring_rx.try_recv() {
                Ok(s) => {
                    *slot = s;
                    written += 1;
                }
                Err(_) => break,
            }
        }
        written
    }

    /// Drain `n` samples with EQ applied. This is the realtime audio path —
    /// called from the audio output callback.
    pub fn drain_samples_with_eq(&self, out: &mut [f32], eq: &mut BiquadEq) -> usize {
        let written = self.drain_samples(out);
        if written > 0 {
            eq.process_buffer(&mut out[..written]);
        }
        written
    }

    /// Shutdown the decoder thread.
    pub fn shutdown(&self) {
        let _ = self.cmd_tx.send(DecoderCmd::Exit);
        self.stop_flag.store(true, Ordering::SeqCst);
    }

    fn set_state(&self, state: PlaybackState) {
        *self.state.lock() = state;
    }

    fn on_decoder_open(&self, id: &str, duration: f64) {
        *self.current_track_id.lock() = Some(id.to_string());
        *self.current_duration.lock() = duration;
        *self.current_position.lock() = 0.0;
        self.set_state(PlaybackState::Playing);
    }

    fn on_decoder_position(&self, secs: f64) {
        *self.current_position.lock() = secs;
    }

    fn on_decoder_end(&self) {
        self.set_state(PlaybackState::Ended);
    }
}

/// The decoder thread loop — runs blocking decode work off the audio thread.
fn decoder_thread_loop(
    weak: std::sync::Weak<PlaybackController>,
    cmd_rx: Receiver<DecoderCmd>,
    stop_flag: Arc<AtomicBool>,
) {
    let mut decoder: Option<Box<dyn Decoder>> = None;

    while !stop_flag.load(Ordering::SeqCst) {
        // Block waiting for a command, with a short timeout so we can poll
        // for position updates & end-of-stream.
        let cmd = match cmd_rx.recv_timeout(std::time::Duration::from_millis(50)) {
            Ok(c) => c,
            Err(crossbeam_channel::RecvTimeoutError::Timeout) => {
                // No new command: continue feeding samples if we have a decoder.
                if let (Some(d), Some(ctrl)) = (&mut decoder, weak.upgrade()) {
                    let is_playing = ctrl.state() == PlaybackState::Playing
                        || ctrl.state() == PlaybackState::Loading;
                    if !is_playing {
                        continue;
                    }
                    match d.next_block() {
                        Ok(Some(frame)) => {
                            ctrl.on_decoder_position(d.position());
                            // Push samples into the ring (with EQ applied).
                            let eq_settings_snapshot = ctrl.eq_settings();
                            let mut eq = BiquadEq::from_settings(
                                frame.sample_rate as f64,
                                &eq_settings_snapshot,
                            );
                            let mut samples = frame.samples.clone();
                            eq.process_buffer(&mut samples);
                            for s in samples {
                                if ctrl.ring_tx.send(s).is_err() {
                                    break; // ring full — back off
                                }
                            }
                        }
                        Ok(None) => {
                            // End of stream — auto-advance handled by caller.
                            ctrl.on_decoder_end();
                            decoder = None;
                        }
                        Err(_e) => {
                            decoder = None;
                        }
                    }
                }
                continue;
            }
            Err(crossbeam_channel::RecvTimeoutError::Disconnected) => break,
        };

        match cmd {
            DecoderCmd::Open(path, resume) => {
                if let Some(ctrl) = weak.upgrade() {
                    match open_file(&path) {
                        Ok(mut d) => {
                            let probe = d.probe();
                            let id = path.to_string_lossy().to_string();
                            ctrl.on_decoder_open(&id, probe.duration_secs.unwrap_or(0.0));
                            if resume > 0.0 {
                                let _ = d.seek(resume);
                            }
                            decoder = Some(d);
                        }
                        Err(e) => {
                            ctrl.set_state(PlaybackState::Stopped);
                            log::error!("decoder open failed: {}", e);
                        }
                    }
                }
            }
            DecoderCmd::Stop => {
                decoder = None;
            }
            DecoderCmd::Seek(secs) => {
                if let Some(d) = decoder.as_mut() {
                    let _ = d.seek(secs);
                }
            }
            DecoderCmd::Exit => break,
        }
    }
}

impl Drop for PlaybackController {
    fn drop(&mut self) {
        self.shutdown();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::queue::shared_queue;

    #[test]
    fn controller_starts_stopped() {
        let q = shared_queue(vec![]);
        let ctrl = PlaybackController::new(q);
        assert_eq!(ctrl.state(), PlaybackState::Stopped);
        assert!(ctrl.current_track_id().is_none());
        ctrl.shutdown();
    }

    #[test]
    fn eq_settings_round_trip() {
        let q = shared_queue(vec![]);
        let ctrl = PlaybackController::new(q);
        let mut s = EqSettings::default();
        s.apply_preset("rock");
        ctrl.set_eq(s.clone());
        assert_eq!(ctrl.eq_settings().preset, "rock");
        ctrl.shutdown();
    }

    #[test]
    fn stream_nonce_increments_on_play_file() {
        let q = shared_queue(vec![]);
        let ctrl = PlaybackController::new(q);
        let n0 = ctrl.stream_nonce();
        ctrl.play_file("/nonexistent.mp3".into(), 0.0);
        let n1 = ctrl.stream_nonce();
        assert_eq!(n1, n0 + 1);
        ctrl.shutdown();
    }
}
