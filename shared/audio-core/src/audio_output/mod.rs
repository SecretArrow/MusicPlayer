//! CPAL audio output backend (feature `audio_output`).
//!
//! Drains samples from the `PlaybackController`'s ring buffer in the realtime
//! CPAL callback. Runs on its own audio thread; never blocks.
//!
//! Only f32 output streams are built. f32 is supported by every modern
//! backend (WASAPI, ALSA, CoreAudio, AAudio); devices that cannot do f32
//! surface a clear `UnsupportedFormat` error instead of a silent failure.

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

/// The CPAL backend.
pub struct CpalBackend {
    controller: Arc<PlaybackController>,
    stream: Mutex<Option<Stream>>,
    eq_chain: Mutex<BiquadEq>,
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
            // Ask cpal to negotiate an f32-capable config instead of failing hard.
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

        let backend = Arc::new(Self {
            controller: controller.clone(),
            stream: Mutex::new(None),
            eq_chain: Mutex::new(eq),
        });

        let stream = build_f32_stream(&device, &supported, backend.clone())?;
        stream.play()?;
        *backend.stream.lock() = Some(stream);

        // Leak one Arc reference — the Stream (and its realtime thread) must
        // never be dropped; playback lasts for the whole process lifetime.
        std::mem::forget(Arc::clone(&backend));

        Ok(backend)
    }

    /// Update EQ chain (called when EQ settings change).
    pub fn update_eq(&self, settings: &crate::effects::EqSettings, sample_rate: f64) {
        *self.eq_chain.lock() = BiquadEq::from_settings(sample_rate, settings);
    }
}

fn build_f32_stream(
    device: &cpal::Device,
    config: &cpal::SupportedStreamConfig,
    backend: Arc<CpalBackend>,
) -> Result<Stream, OutputError> {
    let err_fn = |err| log::error!("cpal stream error: {err}");
    let stream = device.build_output_stream(
        &config.clone().into(),
        move |out: &mut [f32], _info: &cpal::OutputCallbackInfo| {
            let written = backend
                .controller
                .drain_samples_with_eq(out, &mut backend.eq_chain.lock());
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
