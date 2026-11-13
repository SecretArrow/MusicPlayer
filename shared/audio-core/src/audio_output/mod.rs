//! CPAL audio output backend (feature `audio_output`).
//!
//! Drains samples from the `PlaybackController`'s ring buffer in the realtime
//! CPAL callback. Runs on its own audio thread; never blocks.

use crate::effects::BiquadEq;
use crate::playback::{PlaybackController, PlaybackState};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{SampleFormat, Stream};
use parking_lot::Mutex;
use std::sync::Arc;
use thiserror::Error;

/// CPAL output errors.
#[derive(Debug, Error)]
pub enum OutputError {
    #[error("no output device available: {0}")]
    NoDevice(String),
    #[error("unsupported sample format: {0:?}")]
    UnsupportedFormat(SampleFormat),
    #[error("cpal error: {0}")]
    Cpal(#[from] cpal::Error),
}

/// The CPAL backend.
pub struct CpalBackend {
    controller: Arc<PlaybackController>,
    stream: Mutex<Option<Stream>>,
    eq_chain: Mutex<BiquadEq>,
}

impl CpalBackend {
    /// Build the backend, picking the default output device.
    pub fn new(controller: Arc<PlaybackController>) -> Result<Self, OutputError> {
        let host = cpal::default_host();
        let device = host
            .default_output_device()
            .ok_or_else(|| OutputError::NoDevice("default output device unavailable".into()))?;
        let supported = device.default_output_config()?;
        let sample_format = supported.sample_format();

        let eq = BiquadEq::from_settings(
            supported.sample_rate().0 as f64,
            &controller.eq_settings(),
        );

        let backend = Arc::new(Self {
            controller: controller.clone(),
            stream: Mutex::new(None),
            eq_chain: Mutex::new(eq),
        });

        let stream = match sample_format {
            SampleFormat::F32 => build_stream::<f32>(&device, &supported, backend.clone())?,
            SampleFormat::I16 => build_stream::<i16>(&device, &supported, backend.clone())?,
            SampleFormat::U16 => build_stream::<u16>(&device, &supported, backend.clone())?,
            other => return Err(OutputError::UnsupportedFormat(other)),
        };
        stream.play()?;
        *backend.stream.lock() = Some(stream);

        Ok(Arc::try_unwrap(backend)
            .map_err(|_| OutputError::NoDevice("backend still shared after build".into()))?)
    }

    /// Update EQ chain (called when EQ settings change).
    pub fn update_eq(&self, settings: &crate::effects::EqSettings, sample_rate: f64) {
        *self.eq_chain.lock() = BiquadEq::from_settings(sample_rate, settings);
    }
}

fn build_stream<T>(
    device: &cpal::Device,
    config: &cpal::SupportedStreamConfig,
    backend: Arc<CpalBackend>,
) -> Result<Stream, OutputError>
where
    T: cpal::Sample + 'static,
    T: num_traits::cast::FromPrimitive,
{
    let sample_rate = config.sample_rate().0;
    let channels = config.channels() as usize;
    let err_fn = |err| log::error!("cpal stream error: {}", err);
    let stream = device.build_output_stream(
        &config.into(),
        move |out: &mut [T], _info: &cpal::OutputCallbackInfo| {
            // Convert requested output to f32 buffer.
            let mut buf_f32 = vec![0.0f32; out.len()];
            let written = backend.controller.drain_samples_with_eq(
                &mut buf_f32,
                &mut backend.eq_chain.lock(),
            );
            // If underrun, fill remainder with silence.
            for s in &mut out[written..] {
                *s = T::from_f64(0.0).unwrap_or_else(|| T::from_i32(0).unwrap());
            }
            // Convert f32 → T.
            let conv = |v: f32| -> T {
                let clamped = v.clamp(-1.0, 1.0);
                T::from_f64(clamped as f64).unwrap_or_else(|| T::from_i32(0).unwrap())
            };
            for (i, slot) in out.iter_mut().enumerate() {
                if i < written {
                    *slot = conv(buf_f32[i]);
                }
            }
            // Silence unused warnings.
            let _ = (sample_rate, channels);
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
        assert_eq!(format!("{}", e), "no output device available: test");
    }
}
