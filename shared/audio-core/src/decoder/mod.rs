//! Audio decoder facade (Symphonia-backed).
//!
//! Provides a streaming decoder interface that yields interleaved stereo
//! f32 samples at the engine's sample rate (44.1 kHz). The decoder runs on
//! its own thread and communicates with the realtime audio callback through
//! a bounded ring buffer (see `playback`).

use std::fs::File;
use std::path::Path;
use std::sync::Arc;
use thiserror::Error;

use crate::ENGINE_CHANNELS;
use crate::ENGINE_SAMPLE_RATE;

/// A decoded frame: interleaved stereo f32 samples in [-1.0, 1.0].
#[derive(Debug, Clone)]
pub struct DecodedFrame {
    /// Interleaved samples (length = channels * frames_per_block).
    pub samples: Vec<f32>,
    /// Sample rate of this decoded block.
    pub sample_rate: u32,
    /// Channel count.
    pub channels: usize,
}

/// Errors surfaced by the decoder.
#[derive(Debug, Error)]
pub enum DecoderError {
    /// File could not be opened or read.
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    /// Format probe failed (unknown/unsupported codec).
    #[error("format probe failed: {0}")]
    Probe(String),
    /// Decoder reported a malformed frame.
    #[error("decode error: {0}")]
    Decode(String),
    /// Unsupported codec — Symphonia was built without the matching feature.
    #[error("unsupported codec: {0}")]
    UnsupportedCodec(String),
    /// Seek failed (e.g. file does not support seeking).
    #[error("seek failed: {0}")]
    Seek(String),
}

/// Result of probing a file for format/codec info.
#[derive(Debug, Clone)]
pub struct ProbeResult {
    /// Format short name ("mp3", "vorbis", "flac", ...).
    pub format: String,
    /// Codec short name.
    pub codec: String,
    /// Total duration in seconds, if known.
    pub duration_secs: Option<f64>,
    /// Sample rate (Hz).
    pub sample_rate: u32,
    /// Channel count.
    pub channels: usize,
}

/// Decoder trait — Symphonia-backed impl in `SymDecoder`.
pub trait Decoder: Send {
    /// Probe metadata (codec, duration, etc.).
    fn probe(&self) -> ProbeResult;
    /// Decode the next block of samples. Returns `Ok(None)` at end-of-stream.
    fn next_block(&mut self) -> Result<Option<DecodedFrame>, DecoderError>;
    /// Seek to an absolute time in seconds.
    fn seek(&mut self, time_secs: f64) -> Result<(), DecoderError>;
    /// Current playback position in seconds.
    fn position(&self) -> f64;
}

/// Construct a decoder for a file on disk.
pub fn open_file<P: AsRef<Path>>(path: P) -> Result<Box<dyn Decoder>, DecoderError> {
    #[cfg(feature = "decoder")]
    {
        let file = File::open(path)?;
        Ok(Box::new(crate::decoder::symphonia_decoder::SymDecoder::from_file(file)?))
    }
    #[cfg(not(feature = "decoder"))]
    {
        let _ = path;
        Err(DecoderError::UnsupportedCodec(
            "decoder feature is disabled; build with --features decoder".into(),
        ))
    }
}

/// Construct a decoder for an in-memory byte slice (used by tests & Android SAF).
pub fn open_bytes(bytes: Arc<Vec<u8>>) -> Result<Box<dyn Decoder>, DecoderError> {
    #[cfg(feature = "decoder")]
    {
        Ok(Box::new(crate::decoder::symphonia_decoder::SymDecoder::from_bytes(bytes)?))
    }
    #[cfg(not(feature = "decoder"))]
    {
        let _ = bytes;
        Err(DecoderError::UnsupportedCodec(
            "decoder feature is disabled; build with --features decoder".into(),
        ))
    }
}

#[cfg(feature = "decoder")]
pub mod symphonia_decoder {
    //! Symphonia-backed decoder implementation.

    use super::*;
    use symphonia::core::audio::{AudioBuffer, AudioBufferRef, Signal};
    use symphonia::core::codecs::{DecoderOptions, CODEC_TYPE_NULL};
    use symphonia::core::formats::{FormatOptions, FormatReader, SeekMode, SeekTo};
    use symphonia::core::io::{MediaSourceStream, MediaSourceStreamOptions};
    use symphonia::core::meta::MetadataOptions;
    use symphonia::core::sample::Sample;
    use symphonia::core::units::{Time, TimeBase};

    /// Convert a Symphonia `AudioBufferRef` to interleaved f32 samples.
    ///
    /// Works by allocating a destination f32 AudioBuffer (same channels/rate)
    /// and using `AudioBufferRef::convert` to fill it, then reading per-channel
    /// planes and interleaving.
    fn to_interleaved_f32(buf: AudioBufferRef) -> Vec<f32> {
        let channels = buf.spec().channels.count();
        let frames = buf.frames();
        let mut dest: AudioBuffer<f32> = buf.make_equivalent::<f32>();
        buf.convert::<f32>(&mut dest);
        // `Signal::chan(channel)` returns &[S] for AudioBuffer<S>.
        let mut out = Vec::with_capacity(frames * channels);
        for frame in 0..frames {
            for ch in 0..channels {
                let plane: &[f32] = dest.chan(ch);
                let s = plane.get(frame).copied().unwrap_or(0.0);
                out.push(s);
            }
        }
        out
    }

    pub struct SymDecoder {
        format_reader: Box<dyn FormatReader>,
        decoder: Box<dyn symphonia::core::codecs::Decoder>,
        track_id: u32,
        probe: ProbeResult,
        time_base: Option<TimeBase>,
        current_position_secs: f64,
    }

    impl SymDecoder {
        /// Open a decoder from a file on disk.
        pub fn from_file(file: File) -> Result<Self, DecoderError> {
            let mss = MediaSourceStream::new(Box::new(file), MediaSourceStreamOptions::default());
            Self::from_mss(mss)
        }

        /// Open a decoder from an in-memory byte slice.
        pub fn from_bytes(bytes: Arc<Vec<u8>>) -> Result<Self, DecoderError> {
            // Clone the Vec out of the Arc — Symphonia's MediaSource needs an
            // owned buffer (Cursor<Vec<u8>>), not Cursor<Arc<Vec<u8>>>.
            let owned = (*bytes).clone();
            let cursor = std::io::Cursor::new(owned);
            let mss = MediaSourceStream::new(Box::new(cursor), MediaSourceStreamOptions::default());
            Self::from_mss(mss)
        }

        fn from_mss(mss: MediaSourceStream) -> Result<Self, DecoderError> {
            let hint = symphonia::core::probe::Hint::new();
            let probed = symphonia::default::get_probe()
                .format(
                    &hint,
                    mss,
                    &FormatOptions::default(),
                    &MetadataOptions::default(),
                )
                .map_err(|e| DecoderError::Probe(e.to_string()))?;

            let track = probed
                .format
                .tracks()
                .iter()
                .find(|t| t.codec_params.codec != CODEC_TYPE_NULL)
                .cloned()
                .ok_or_else(|| DecoderError::UnsupportedCodec("no audio track".into()))?;

            let codec_params = &track.codec_params;
            let sample_rate = codec_params.sample_rate.unwrap_or(ENGINE_SAMPLE_RATE);
            let channels = codec_params
                .channels
                .map(|c| c.count())
                .unwrap_or(ENGINE_CHANNELS);
            let time_base = codec_params.time_base;

            let decoder = symphonia::default::get_codecs()
                .make(codec_params, &DecoderOptions::default())
                .map_err(|e| DecoderError::UnsupportedCodec(e.to_string()))?;

            let mut format = probed.format;
            let format_name = format
                .metadata()
                .current()
                .and_then(|_m| None)
                .unwrap_or_else(|| "unknown".into());

            let codec_name = codec_params.codec.to_string();
            let duration_secs = codec_params
                .n_frames
                .and_then(|n| {
                    time_base.map(|tb| {
                        // duration = n_frames * numer / denom
                        (n as f64) * (tb.numer as f64) / (tb.denom as f64)
                    })
                })
                .or_else(|| {
                    codec_params
                        .n_frames
                        .map(|n| n as f64 / sample_rate as f64)
                });

            Ok(Self {
                format_reader: format,
                decoder,
                track_id: track.id,
                probe: ProbeResult {
                    format: format_name,
                    codec: codec_name,
                    duration_secs,
                    sample_rate,
                    channels,
                },
                time_base,
                current_position_secs: 0.0,
            })
        }
    }

    impl Decoder for SymDecoder {
        fn probe(&self) -> ProbeResult {
            self.probe.clone()
        }

        fn next_block(&mut self) -> Result<Option<DecodedFrame>, DecoderError> {
            loop {
                let packet = match self.format_reader.next_packet() {
                    Ok(p) => p,
                    Err(symphonia::core::errors::Error::IoError(ref e))
                        if e.kind() == std::io::ErrorKind::UnexpectedEof =>
                    {
                        return Ok(None);
                    }
                    Err(symphonia::core::errors::Error::ResetRequired) => {
                        return Err(DecoderError::Decode(
                            "decoder reset required (post-seek)".into(),
                        ));
                    }
                    Err(e) => return Err(DecoderError::Decode(e.to_string())),
                };
                if packet.track_id() != self.track_id {
                    continue;
                }
                let decoded = match self.decoder.decode(&packet) {
                    Ok(d) => d,
                    Err(symphonia::core::errors::Error::DecodeError(_)) => continue,
                    Err(e) => return Err(DecoderError::Decode(e.to_string())),
                };
                let frames = decoded.frames();
                let sample_rate = self.probe.sample_rate;
                let channels = self.probe.channels;
                let samples = to_interleaved_f32(decoded);

                // Advance position using packet's timestamp + time_base.
                let pts_secs = self
                    .time_base
                    .map(|tb| {
                        let ts = packet.ts();
                        // timestamp * numer / denom
                        (ts as f64) * (tb.numer as f64) / (tb.denom as f64)
                    })
                    .unwrap_or_else(|| frames as f64 / sample_rate as f64);
                self.current_position_secs = pts_secs;

                return Ok(Some(DecodedFrame { samples, sample_rate, channels }));
            }
        }

        fn seek(&mut self, time_secs: f64) -> Result<(), DecoderError> {
            let seconds = time_secs.floor() as u64;
            let frac = time_secs.fract();
            let time = Time::new(seconds, frac);
            let seek_to = SeekTo::Time {
                time,
                track_id: Some(self.track_id),
            };
            self.format_reader
                .seek(SeekMode::Accurate, seek_to)
                .map_err(|e| DecoderError::Seek(e.to_string()))?;
            self.decoder.reset();
            self.current_position_secs = time_secs;
            Ok(())
        }

        fn position(&self) -> f64 {
            self.current_position_secs
        }
    }
}
