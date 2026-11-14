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
//! callback only captures a `CallbackState` (Send + Sync: controller handle
//! + EQ mutex), while the `Stream` handle itself stays on the thread that
//! created it and is never moved across threads.

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
}

/// The CPAL backend handle. Contains the `Stream`, which is `!Send` on some
/// platforms — keep this on the thread that created it.
pub struct CpalBackend {
    state: Arc<CallbackState>,
    #[allow(dead_code)]
    stream: Stream,
}

impl CpalBackend {
    /// Build the backend, picking the default output device.
    ///
    /// Returns a shared handle. One additional `Arc` reference is leaked
    /// internally so the CPAL stream (and its realtime thread) stays alive
    /// for the whole process — dropping the returned handle cannot stop
    /// playback.
    pub fn new(controller: Arc<PlaybackController>) -> Result<Arc<Self>, OutputError> {
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
        });

        let stream = build_f32_stream(&device, &supported, state.clone())?;
        stream.play()?;

        let backend = Arc::new(Self { state, stream });

        // Leak one Arc reference — the Stream (and its realtime thread) must
        // never be dropped; playback lasts for the whole process lifetime.
        std::mem::forget(Arc::clone(&backend));

        Ok(backend)
    }

    /// Update EQ chain. Must be called from the thread that created the
    /// backend (the `Stream` inside is platform-restricted to !Send).
    pub fn update_eq(&self, settings: &crate::effects::EqSettings, sample_rate: f64) {
        *self.state.eq_chain.lock() = BiquadEq::from_settings(sample_rate, settings);
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
            let written = state
                .controller
                .drain_samples_with_eq(out, &mut state.eq_chain.lock());
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
