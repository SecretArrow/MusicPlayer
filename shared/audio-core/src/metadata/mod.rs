//! Audio metadata extraction (lofty-backed).
//!
//! Reads ID3 (MP3), Vorbis comments (OGG/FLAC/Opus), MP4 atoms (M4A/ALAC/AAC),
//! and embedded artwork.

use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::Arc;
use thiserror::Error;

/// Embedded artwork payload (bytes + mime).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Artwork {
    /// Raw image bytes (PNG/JPEG).
    #[serde(with = "serde_bytes_arc")]
    pub data: Arc<Vec<u8>>,
    /// Mime type (`image/png`, `image/jpeg`, ...).
    pub mime: String,
}

/// Serde adapter that serializes `Arc<Vec<u8>>` as a plain byte array.
mod serde_bytes_arc {
    use serde::{Deserialize, Deserializer, Serializer};
    use std::sync::Arc;

    pub fn serialize<S>(v: &Arc<Vec<u8>>, s: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serde_bytes::serialize(v.as_slice(), s)
    }

    pub fn deserialize<'de, D>(d: D) -> Result<Arc<Vec<u8>>, D::Error>
    where
        D: Deserializer<'de>,
    {
        let bytes: Vec<u8> = serde_bytes::deserialize(d)?;
        Ok(Arc::new(bytes))
    }
}

/// Audio metadata extracted from a file's tags.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct AudioMetadata {
    pub title: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub album_artist: Option<String>,
    pub genre: Option<String>,
    pub year: Option<u32>,
    pub track_number: Option<u32>,
    pub total_tracks: Option<u32>,
    pub disc_number: Option<u32>,
    pub composer: Option<String>,
    pub comment: Option<String>,
    pub duration_secs: Option<f64>,
    pub sample_rate: Option<u32>,
    pub channels: Option<u32>,
    pub bitrate_kbps: Option<u32>,
    pub artwork: Option<Artwork>,
}

/// Metadata read errors.
#[derive(Debug, Error)]
pub enum MetadataError {
    /// File could not be read.
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    /// lofty could not parse the file.
    #[error("parse error: {0}")]
    Parse(String),
    /// lofty was not built (feature disabled).
    #[error("metadata feature is disabled")]
    Disabled,
}

/// Read metadata from a file on disk.
pub fn read_from_file<P: AsRef<Path>>(path: P) -> Result<AudioMetadata, MetadataError> {
    #[cfg(feature = "metadata")]
    {
        let tagged = lofty::probe::read_from_path(path.as_ref())
            .map_err(|e| MetadataError::Parse(e.to_string()))?;
        Ok(extract(tagged))
    }
    #[cfg(not(feature = "metadata"))]
    {
        let _ = path;
        Err(MetadataError::Disabled)
    }
}

/// Read metadata from an in-memory byte slice (Android SAF / network streams).
pub fn read_from_bytes(bytes: Arc<Vec<u8>>) -> Result<AudioMetadata, MetadataError> {
    #[cfg(feature = "metadata")]
    {
        use lofty::probe::Probe;
        let reader = std::io::Cursor::new(bytes.as_slice().to_vec());
        let tagged = Probe::new(reader)
            .guess_file_type()
            .map_err(|e| MetadataError::Parse(e.to_string()))?
            .read()
            .map_err(|e| MetadataError::Parse(e.to_string()))?;
        Ok(extract(tagged))
    }
    #[cfg(not(feature = "metadata"))]
    {
        let _ = bytes;
        Err(MetadataError::Disabled)
    }
}

#[cfg(feature = "metadata")]
fn extract(tagged: lofty::file::TaggedFile) -> AudioMetadata {
    use lofty::file::{AudioFile, TaggedFileExt};
    use lofty::tag::{Accessor, ItemKey};

    let properties = tagged.properties();
    let duration_secs = properties.duration().as_secs_f64();
    let sample_rate = properties.sample_rate();
    let channels = properties.channels().map(|c| c as u32);
    let bitrate_kbps = properties.audio_bitrate();

    let mut out = AudioMetadata {
        duration_secs: if duration_secs > 0.0 {
            Some(duration_secs)
        } else {
            None
        },
        sample_rate,
        channels,
        bitrate_kbps,
        ..Default::default()
    };

    // Prefer the primary tag (any format); fall back to format-specific.
    if let Some(tag) = tagged.primary_tag() {
        out.title = tag.title().map(|s| s.to_string());
        out.artist = tag.artist().map(|s| s.to_string());
        out.album = tag.album().map(|s| s.to_string());
        out.album_artist = tag.get_string(&ItemKey::AlbumArtist).map(|s| s.to_string());
        out.genre = tag.genre().map(|s| s.to_string());
        out.year = tag.year().map(|y| y as u32);
        out.track_number = tag.track().map(|t| t as u32);
        out.total_tracks = tag.track_total().map(|t| t as u32);
        out.disc_number = tag.disk().map(|d| d as u32);
        out.composer = tag.get_string(&ItemKey::Composer).map(|s| s.to_string());
        out.comment = tag.get_string(&ItemKey::Comment).map(|s| s.to_string());

        // First embedded picture.
        if let Some(pic) = tag.pictures().first() {
            out.artwork = Some(Artwork {
                data: Arc::new(pic.data().to_vec()),
                mime: pic
                    .mime_type()
                    .map(|m| m.to_string())
                    .unwrap_or_else(|| "application/octet-stream".into()),
            });
        }
    }

    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_metadata_is_empty() {
        let m = AudioMetadata::default();
        assert!(m.title.is_none());
        assert!(m.duration_secs.is_none());
    }

    #[test]
    fn metadata_round_trips_through_json() {
        let m = AudioMetadata {
            title: Some("Test".into()),
            artist: Some("Artist".into()),
            duration_secs: Some(180.0),
            ..Default::default()
        };
        let json = serde_json::to_string(&m).unwrap();
        let back: AudioMetadata = serde_json::from_str(&json).unwrap();
        assert_eq!(back.title.as_deref(), Some("Test"));
        assert_eq!(back.duration_secs, Some(180.0));
    }

    #[test]
    fn artwork_round_trips_through_json() {
        let a = Artwork {
            data: Arc::new(vec![0x89, 0x50, 0x4E, 0x47]),
            mime: "image/png".into(),
        };
        let json = serde_json::to_string(&a).unwrap();
        let back: Artwork = serde_json::from_str(&json).unwrap();
        assert_eq!(back.mime, "image/png");
        assert_eq!(back.data.as_slice(), &[0x89, 0x50, 0x4E, 0x47]);
    }
}
