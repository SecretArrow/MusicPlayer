//! CPAL audio output backend (feature `audio_output`).
//!
//! Drains samples from the `PlaybackController`'s ring buffer in the realtime
//! CPAL callback. Runs on its own audio thread; never blocks.
//!
//! Only f32 output streams are built. f32 is supported by every modern
//! backend (WASAPI, ALSA, CoreAudio, AAudio); devices that cannot do f32
//! surface a clear `UnsupportedFormat` error instead of a silent failure.
//!
//! Thread-safety: cpal's `Stream` is deliberately `!Send`/`!Sync` on some
//! platforms (`NotSendSyncAcrossAllPlatforms`). Therefore the realtime
//! callback only captures a `CallbackState` (Send + Sync), and the `Stream`
//! itself is intentionally leaked (`std::mem::forget`) so it — and its audio
//! thread — live for the whole process. The public handle (`AudioOutput`)
//! contains no `Stream` and is freely Send + Sync.

use crate::effects::BiquadEq;
use crate::playback::PlaybackController;
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{SampleFormat, Stream};
use parking_lot::Mutex;
use std::sync::Arc;
use thiserror::Error;

/// CPAL output errors.
#[derive(Debug, Error)]
pub enum OutputError {
    /// No usable output device on this host.
    #[error("no output device available: {0}")]
    NoDevice(String),
    /// Device cannot produce an f32 stream.
    #[error("output device does not support f32 (got {0:?})")]
    UnsupportedFormat(SampleFormat),
    /// Configuring the default output config failed.
    #[error("default stream config error: {0}")]
    Config(#[from] cpal::DefaultStreamConfigError),
    /// Building the stream failed.
    #[error("build stream error: {0}")]
    Build(#[from] cpal::BuildStreamError),
    /// Playing the stream failed.
    #[error("stream play error: {0}")]
    Play(#[from] cpal::PlayStreamError),
}

/// Everything the realtime callback needs. Auto-`Send + Sync`: the
/// controller handle is an `Arc` of Send+Sync state and the EQ lives behind
/// a parking_lot mutex. cpal's callback closure moves it to its audio thread.
struct CallbackState {
    controller: Arc<PlaybackController>,
    eq_chain: Mutex<BiquadEq>,
    /// Linear volume gain (0.0 = silent, 1.0 = unity, 2.0 = +6 dB).
    /// Applied after EQ chain, before the samples leave the callback.
    volume: Mutex<f32>,
    /// True when the user muted output. When true, the callback writes zeros
    /// instead of the drained samples (without advancing the read position so
    /// playback resumes exactly where it left off on unmute).
    muted: Mutex<bool>,
}

/// Public handle for a running CPAL output stream.
///
/// Contains no `Stream` (which is platform-restricted to !Send), so this is
/// freely Send + Sync and safe to hold from any thread. The actual stream is
/// leaked internally and lives for the whole process; dropping this handle
/// does not stop playback.
pub struct AudioOutput {
    state: Arc<CallbackState>,
}

impl AudioOutput {
    /// Start audio output on the default device.
    pub fn new(controller: Arc<PlaybackController>) -> Result<Self, OutputError> {
        let host = cpal::default_host();
        let device = host
            .default_output_device()
            .ok_or_else(|| OutputError::NoDevice("default output device unavailable".into()))?;
        let supported = device.default_output_config()?;
        let sample_format = supported.sample_format();
        if sample_format != SampleFormat::F32 {
            // Negotiate an f32-capable config instead of failing hard.
            let configs = match device.supported_output_configs() {
                Ok(c) => c,
                Err(e) => return Err(OutputError::NoDevice(e.to_string())),
            };
            let f32cfg = configs
                .filter(|c| c.sample_format() == SampleFormat::F32)
                .max_by(|a, b| a.max_sample_rate().cmp(&b.max_sample_rate()));
            if f32cfg.is_none() {
                return Err(OutputError::UnsupportedFormat(sample_format));
            }
        }

        let eq =
            BiquadEq::from_settings(supported.sample_rate().0 as f64, &controller.eq_settings());

        let state = Arc::new(CallbackState {
            controller: controller.clone(),
            eq_chain: Mutex::new(eq),
            volume: Mutex::new(1.0),
            muted: Mutex::new(false),
        });

        let stream = build_f32_stream(&device, &supported, state.clone())?;
        stream.play()?;

        // Intentionally leak the Stream: it owns the realtime audio thread.
        // Forgetting it keeps playback running for the whole process without
        // needing an Arc around a !Send type.
        std::mem::forget(stream);

        Ok(Self { state })
    }

    /// Update EQ chain — safe from any thread.
    pub fn update_eq(&self, settings: &crate::effects::EqSettings, sample_rate: f64) {
        *self.state.eq_chain.lock() = BiquadEq::from_settings(sample_rate, settings);
    }

    /// Set the linear volume gain (0.0 = silent, 1.0 = unity, 2.0 = +6 dB).
    /// The value is applied on the audio thread at the next callback, so there
    /// are no audio glitches.
    pub fn set_volume(&self, gain: f32) {
        *self.state.volume.lock() = gain.clamp(0.0, 4.0);
    }

    /// Current linear volume gain.
    pub fn volume(&self) -> f32 {
        *self.state.volume.lock()
    }

    /// Mute or unmute output. When muted, the callback writes silence without
    /// advancing the ring buffer read position, so playback resumes in-place.
    pub fn set_muted(&self, muted: bool) {
        *self.state.muted.lock() = muted;
    }

    /// Whether output is currently muted.
    pub fn is_muted(&self) -> bool {
        *self.state.muted.lock()
    }
}

fn build_f32_stream(
    device: &cpal::Device,
    config: &cpal::SupportedStreamConfig,
    state: Arc<CallbackState>,
) -> Result<Stream, OutputError> {
    let err_fn = |err| log::error!("cpal stream error: {err}");
    let stream = device.build_output_stream(
        &config.clone().into(),
        move |out: &mut [f32], _info: &cpal::OutputCallbackInfo| {
            // Mute path: write silence without draining the ring buffer, so
            // playback resumes exactly where it left off on unmute.
            if *state.muted.lock() {
                for s in out.iter_mut() {
                    *s = 0.0;
                }
                return;
            }
            let gain = *state.volume.lock();
            let written = state
                .controller
                .drain_samples_with_eq(out, &mut state.eq_chain.lock());
            // Apply volume gain to the drained samples (in-place).
            if gain != 1.0 {
                for s in &mut out[..written] {
                    *s *= gain;
                }
            }
            // Soft-clip per-channel to prevent clipping when gain > unity.
            // Keeps the signal bounded to [-1, 1] for the DAC.
            if gain > 1.0 {
                for s in &mut out[..written] {
                    *s = crate::effects::soft_clip(*s as f64) as f32;
                }
            }
            // Underrun: fill the remainder with silence.
            for s in &mut out[written..] {
                *s = 0.0;
            }
        },
        err_fn,
        None,
    )?;
    Ok(stream)
}

#[cfg(test)]
mod tests {
    #[test]
    fn output_error_displays() {
        let e = super::OutputError::NoDevice("test".into());
        assert_eq!(format!("{e}"), "no output device available: test");
    }
}
