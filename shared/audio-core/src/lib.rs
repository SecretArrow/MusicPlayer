//! audio-core — shared Rust audio engine.
//!
//! Consumed by:
//! - `desktop` Rust app (Vello + Winit + CPAL)
//! - `android` Kotlin app (via UniFFI/JNI)
//!
//! Modules:
//! - `decoder` — format-agnostic decoding facade (Symphonia-backed).
//! - `playback` — high-level playback controller (play/pause/seek/queue transitions).
//! - `queue` — play queue with shuffle/repeat.
//! - `playlist` — user playlists CRUD.
//! - `metadata` — ID3/Vorbis/FLAC tag extraction (lofty-backed).
//! - `effects` — 10-band biquad EQ + preamp + soft-clip.
//! - `library` — local music library scanning & indexing.
//! - `audio_output` — CPAL audio output backend (feature `audio_output`).
//!
//! Audio callbacks NEVER allocate or block. All blocking work happens on the
//! decoder thread; only pre-decoded samples are fed to the realtime callback.

#![forbid(unsafe_op_in_unsafe_fn)]
#![warn(missing_docs)]
#![allow(clippy::needless_doctest_main)]

pub mod decoder;
pub mod playback;
pub mod queue;
pub mod playlist;
pub mod metadata;
pub mod effects;
pub mod library;

#[cfg(feature = "audio_output")]
pub mod audio_output;

pub use decoder::{DecodedFrame, Decoder, DecoderError, ProbeResult};
pub use effects::{EqBand, EqSettings, BiquadEq, Biquad, EQ_FREQS, preset_gains, preset_names};
pub use library::{Library, LibraryEntry, ScanProgress};
pub use metadata::{AudioMetadata, Artwork};
pub use playback::{PlaybackController, PlaybackEvent, PlaybackState};
pub use playlist::{Playlist, PlaylistId, PlaylistStore};
pub use queue::{RepeatMode, ShuffleMode, TrackQueue};

/// Library version string.
pub const VERSION: &str = env!("CARGO_PKG_VERSION");

/// Sample rate (Hz) used by the engine's internal mix bus.
pub const ENGINE_SAMPLE_RATE: u32 = 44_100;
/// Channel count (stereo) used by the engine's internal mix bus.
pub const ENGINE_CHANNELS: usize = 2;

/// Re-export of core types for convenience.
pub mod prelude {
    pub use crate::*;
}
