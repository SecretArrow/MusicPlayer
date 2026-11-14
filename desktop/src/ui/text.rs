//! Text plumbing for the desktop UI.
//!
//! Vello 0.3 renders glyph runs via [`vello::Scene::draw_glyphs`], which needs
//! a `peniko::Font` plus pre-shaped `vello::Glyph`s (glyph id + position).
//! Shaping here uses `skrifa` (re-exported by vello) directly: cmap lookup for
//! glyph ids and hmtx for advances. That is enough for the Latin UI text this
//! player needs and avoids pulling a full HarfBuzz-shaped stack.

use std::sync::Arc;

use vello::peniko::{Blob, Font as PenikoFont};
use vello::skrifa::{
    instance::{LocationRef, Size as SkrifaSize},
    FontRef, GlyphId, MetadataProvider,
};
use vello::Glyph;

/// Font families the layouts use (mirrors the web app's font stacks).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FontFamily {
    Sans,
    SansBold,
    Mono,
    Serif,
}

/// One loaded font file + the peniko/vello views over it.
#[derive(Clone, Debug)]
pub struct FontHandle {
    pub font: PenikoFont,
    bytes: Arc<Vec<u8>>,
    index: u32,
}

impl FontHandle {
    fn load(path: &str, index: u32) -> Option<Self> {
        let data = std::fs::read(path).ok()?;
        let bytes = Arc::new(data);
        let blob = Blob::new(bytes.clone());
        Some(Self {
            font: PenikoFont::new(blob, index),
            bytes,
            index,
        })
    }

    /// skrifa view over the same bytes (parsed per call — table directory
    /// scan is cheap relative to a frame).
    pub fn font_ref(&self) -> Option<FontRef<'_>> {
        FontRef::from_index(&self.bytes, self.index).ok()
    }
}

/// Candidate font files, probed in order (Linux first, then macOS/Windows).
const SANS_PATHS: &[&str] = &[
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/TTF/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
    "/usr/share/fonts/opentype/noto/NotoSans-Regular.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "C:\\Windows\\Fonts\\segoeui.ttf",
    "C:\\Windows\\Fonts\\arial.ttf",
];
const SANS_BOLD_PATHS: &[&str] = &[
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "C:\\Windows\\Fonts\\segoeuib.ttf",
    "C:\\Windows\\Fonts\\arialbd.ttf",
];
const MONO_PATHS: &[&str] = &[
    "/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf",
    "/usr/share/fonts/truetype/freefont/FreeMono.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
    "/usr/share/fonts/TTF/DejaVuSansMono.ttf",
    "/System/Library/Fonts/Menlo.ttc",
    "/System/Library/Fonts/Monaco.dfont",
    "C:\\Windows\\Fonts\\consola.ttf",
];
const SERIF_PATHS: &[&str] = &[
    "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSerif.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
    "/usr/share/fonts/TTF/DejaVuSerif.ttf",
    "/System/Library/Fonts/Supplemental/Times New Roman.ttf",
    "C:\\Windows\\Fonts\\times.ttf",
];

/// All fonts used by the UI. Every field is optional: if no system font can
/// be found the layouts still render (shapes/hit-zones) and simply skip text.
#[derive(Debug, Clone, Default)]
pub struct FontBook {
    pub sans: Option<FontHandle>,
    pub sans_bold: Option<FontHandle>,
    pub mono: Option<FontHandle>,
    pub serif: Option<FontHandle>,
}

impl FontBook {
    /// Probe the filesystem once at startup.
    pub fn load() -> Self {
        Self {
            sans: first_existing(SANS_PATHS),
            sans_bold: first_existing(SANS_BOLD_PATHS).or_else(|| first_existing(SANS_PATHS)),
            mono: first_existing(MONO_PATHS).or_else(|| first_existing(SANS_PATHS)),
            serif: first_existing(SERIF_PATHS).or_else(|| first_existing(SANS_PATHS)),
        }
    }

    pub fn handle(&self, family: FontFamily) -> Option<&FontHandle> {
        match family {
            FontFamily::Sans => self.sans.as_ref(),
            FontFamily::SansBold => self.sans_bold.as_ref(),
            FontFamily::Mono => self.mono.as_ref(),
            FontFamily::Serif => self.serif.as_ref(),
        }
    }
}

fn first_existing(paths: &[&str]) -> Option<FontHandle> {
    for path in paths {
        if let Some(h) = FontHandle::load(path, 0) {
            return Some(h);
        }
    }
    None
}

const NO_COORDS: [vello::skrifa::instance::NormalizedCoord; 0] = [];

/// Shape `text` into vello glyphs positioned from (0, 0) — y is the baseline.
/// Unmappable characters advance by a rough fallback width and produce no glyph.
pub fn shape(font: &FontHandle, text: &str, size: f32) -> Vec<Glyph> {
    let Some(font_ref) = font.font_ref() else {
        return Vec::new();
    };
    let charmap = font_ref.charmap();
    let metrics = font_ref.glyph_metrics(SkrifaSize::new(size), LocationRef::new(&NO_COORDS));
    let mut pen_x = 0.0f32;
    let mut glyphs = Vec::with_capacity(text.len());
    for ch in text.chars() {
        let gid: Option<GlyphId> = charmap.map(ch as u32);
        let advance = match gid {
            Some(gid) => metrics.advance_width(gid).unwrap_or(size * 0.5),
            None => match ch {
                '\u{2026}' => size * 0.9, // ellipsis fallback
                _ => size * 0.5,
            },
        };
        if let Some(gid) = gid {
            glyphs.push(Glyph {
                id: gid.to_u32(),
                x: pen_x,
                y: 0.0,
            });
        }
        pen_x += advance;
    }
    glyphs
}

/// Total advance width of `text` at `size` in the given font.
pub fn measure(font: &FontHandle, text: &str, size: f32) -> f32 {
    let Some(font_ref) = font.font_ref() else {
        return 0.0;
    };
    let charmap = font_ref.charmap();
    let metrics = font_ref.glyph_metrics(SkrifaSize::new(size), LocationRef::new(&NO_COORDS));
    let mut width = 0.0f32;
    for ch in text.chars() {
        width += match charmap.map(ch as u32) {
            Some(gid) => metrics.advance_width(gid).unwrap_or(size * 0.5),
            None => match ch {
                '\u{2026}' => size * 0.9, // ellipsis fallback
                _ => size * 0.5,
            },
        };
    }
    width
}

/// Character-based truncation with an ellipsis (pure logic, used both by
/// width-based truncation and directly by tests).
pub fn truncate_chars(text: &str, max_chars: usize) -> String {
    if max_chars == 0 {
        return String::new();
    }
    let count = text.chars().count();
    if count <= max_chars {
        return text.to_string();
    }
    let keep = max_chars.saturating_sub(1);
    let mut out: String = text.chars().take(keep).collect();
    out.push('\u{2026}');
    out
}

/// Width-based truncation: shrink `text` (with ellipsis) until it fits
/// `max_width` at `size`. Returns the (possibly unchanged) string.
pub fn truncate_to_width(font: &FontHandle, text: &str, size: f32, max_width: f32) -> String {
    if measure(font, text, size) <= max_width {
        return text.to_string();
    }
    let total = text.chars().count();
    let mut lo = 0usize;
    let mut hi = total;
    while lo < hi {
        let mid = (lo + hi).div_ceil(2);
        let candidate = truncate_chars(text, mid);
        if measure(font, &candidate, size) <= max_width {
            lo = mid;
        } else {
            hi = mid - 1;
        }
    }
    truncate_chars(text, lo.max(1))
}

/// `m:ss` (or `h:mm:ss` past an hour) — mirrors the web app's `formatTime`.
pub fn fmt_time(secs: f64) -> String {
    let total = if secs.is_finite() && secs > 0.0 {
        secs.floor() as u64
    } else {
        0
    };
    let h = total / 3600;
    let m = (total % 3600) / 60;
    let s = total % 60;
    if h > 0 {
        format!("{h}:{m:02}:{s:02}")
    } else {
        format!("{m}:{s:02}")
    }
}

/// Turn a raw track id / file stem into a human title:
/// `"03-my_favorite_song"` → `"My Favorite Song"`.
pub fn prettify_id(raw: &str) -> String {
    let stem = raw.rsplit(['/', '\\']).next().unwrap_or(raw);
    let stem = stem.trim_end_matches(".mp3");
    let cleaned = stem.replace(['-', '_', '.'], " ");
    let mut out = String::with_capacity(cleaned.len());
    let mut new_word = true;
    for ch in cleaned.chars() {
        if ch.is_whitespace() {
            new_word = true;
            out.push(' ');
        } else if new_word {
            out.extend(ch.to_uppercase());
            new_word = false;
        } else {
            out.push(ch);
        }
    }
    out.trim().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn truncate_chars_adds_ellipsis() {
        assert_eq!(truncate_chars("Hello World", 8), "Hello W\u{2026}");
        assert_eq!(truncate_chars("abc", 10), "abc");
        assert_eq!(truncate_chars("abc", 3), "abc");
        assert_eq!(truncate_chars("abcdef", 1), "\u{2026}");
        assert_eq!(truncate_chars("abcdef", 0), "");
    }

    #[test]
    fn truncate_chars_handles_unicode() {
        // Multi-byte chars count as one char (keep max-1 + ellipsis).
        assert_eq!(truncate_chars("éééééééééé", 4), "ééé\u{2026}");
    }

    #[test]
    fn fmt_time_formats() {
        assert_eq!(fmt_time(0.0), "0:00");
        assert_eq!(fmt_time(4.9), "0:04");
        assert_eq!(fmt_time(61.0), "1:01");
        assert_eq!(fmt_time(600.0), "10:00");
        assert_eq!(fmt_time(3661.0), "1:01:01");
        assert_eq!(fmt_time(-3.0), "0:00");
        assert_eq!(fmt_time(f64::NAN), "0:00");
    }

    #[test]
    fn prettify_id_humanizes_stems() {
        assert_eq!(prettify_id("my_favorite_song"), "My Favorite Song");
        // Leading track numbers are kept, separators become spaces.
        assert_eq!(prettify_id("03-night-drive"), "03 Night Drive");
        // Only the file stem is used; extension is stripped.
        assert_eq!(prettify_id("/music/Artist - Track.mp3"), "Artist   Track");
    }

    #[test]
    fn truncation_without_font_returns_original() {
        // A fabricated handle with no real bytes cannot shape; truncation
        // must still terminate and return something sensible.
        let handle = FontHandle {
            font: PenikoFont::new(Blob::new(Arc::new(Vec::new())), 0),
            bytes: Arc::new(Vec::new()),
            index: 0,
        };
        let out = truncate_to_width(&handle, "Some quite long title text", 14.0, 50.0);
        assert!(!out.is_empty());
    }
}
