//! Theme definitions — mirrors the web app's `src/data/themes.ts`.
//!
//! Each theme carries its color palette AND its layout variant, matching the
//! web app's per-theme layout system. The native renderer dispatches to the
//! matching `ui::layout::*` module based on `layout`.

use serde::{Deserialize, Serialize};

/// Layout variant — matches the web app's `ThemeLayout`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Layout {
    /// Sidebar left + bottom player bar (Midnight / Monochrome / Daylight).
    Classic,
    /// Top pill nav, floating frosted panels (Aurora).
    Glass,
    /// Turntable side panel (Sunset).
    Vinyl,
    /// Retro tape deck with reels (Rosewood).
    Cassette,
    /// Neon HUD terminal (Violet Night).
    Cyber,
    /// Immersive stage with bottom dock (Ocean).
    Focus,
    /// Bento tile dashboard (Forest).
    Mosaic,
    /// Radio station console with tuner (Coffee).
    Broadcast,
}

/// A theme definition — mirrors the web app's `PlayerTheme`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Theme {
    pub key: String,
    pub label: String,
    pub description: String,
    pub dark: bool,
    pub layout: Layout,
    pub accent: [u8; 3], // RGB
    pub background: [u8; 3],
    pub surface: [u8; 3],
    pub text: [u8; 3],
    pub text_muted: [u8; 3],
    pub border: [u8; 3],
}

impl Default for Theme {
    fn default() -> Self {
        THEMES[0].clone()
    }
}

/// All 10 built-in themes — same data as the web app.
pub static THEMES: [Theme; 10] = [
    Theme {
        key: "midnight".into(),
        label: "Midnight".into(),
        description: "Deep charcoal with emerald glow".into(),
        dark: true,
        layout: Layout::Classic,
        accent: [0x10, 0xB9, 0x81],
        background: [0x09, 0x09, 0x0B],
        surface: [0x18, 0x18, 0x1B],
        text: [0xFA, 0xFA, 0xFA],
        text_muted: [0xA1, 0xA1, 0xAA],
        border: [0x27, 0x27, 0x2A],
    },
    Theme {
        key: "aurora".into(),
        label: "Aurora".into(),
        description: "Glass deck — floating frosted panels".into(),
        dark: true,
        layout: Layout::Glass,
        accent: [0x22, 0xD3, 0xEE],
        background: [0x07, 0x0B, 0x14],
        surface: [0x10, 0x1B, 0x2D],
        text: [0xF0, 0xF5, 0xFC],
        text_muted: [0x8C, 0xA3, 0xC7],
        border: [0x1B, 0x2A, 0x44],
    },
    Theme {
        key: "sunset".into(),
        label: "Sunset".into(),
        description: "Vinyl lounge — spinning turntable".into(),
        dark: true,
        layout: Layout::Vinyl,
        accent: [0xF5, 0x9E, 0x0B],
        background: [0x14, 0x0C, 0x07],
        surface: [0x2A, 0x1A, 0x0F],
        text: [0xFD, 0xF4, 0xE3],
        text_muted: [0xC4, 0x9A, 0x6C],
        border: [0x3D, 0x28, 0x17],
    },
    Theme {
        key: "rosewood".into(),
        label: "Rosewood".into(),
        description: "Cassette deck — velvet maroon hi-fi".into(),
        dark: true,
        layout: Layout::Cassette,
        accent: [0xFB, 0x71, 0x85],
        background: [0x12, 0x07, 0x0B],
        surface: [0x2A, 0x0F, 0x19],
        text: [0xFD, 0xF0, 0xF4],
        text_muted: [0xC0, 0x8C, 0xA0],
        border: [0x3D, 0x15, 0x24],
    },
    Theme {
        key: "violet".into(),
        label: "Violet Night".into(),
        description: "Neon terminal — monospace HUD".into(),
        dark: true,
        layout: Layout::Cyber,
        accent: [0xA7, 0x8B, 0xFA],
        background: [0x0B, 0x07, 0x14],
        surface: [0x1A, 0x12, 0x30],
        text: [0xF8, 0xF3, 0xFD],
        text_muted: [0xA2, 0x93, 0xCB],
        border: [0x27, 0x1C, 0x48],
    },
    Theme {
        key: "ocean".into(),
        label: "Ocean".into(),
        description: "Wave focus — immersive stage + dock".into(),
        dark: true,
        layout: Layout::Focus,
        accent: [0x38, 0xBD, 0xF8],
        background: [0x05, 0x0B, 0x12],
        surface: [0x0C, 0x1E, 0x30],
        text: [0xF3, 0xF9, 0xFD],
        text_muted: [0x7F, 0xA9, 0xC9],
        border: [0x13, 0x30, 0x4A],
    },
    Theme {
        key: "forest".into(),
        label: "Forest".into(),
        description: "Bento garden — tile dashboard".into(),
        dark: true,
        layout: Layout::Mosaic,
        accent: [0x84, 0xCC, 0x16],
        background: [0x07, 0x0D, 0x08],
        surface: [0x11, 0x21, 0x13],
        text: [0xF3, 0xFA, 0xF3],
        text_muted: [0x86, 0xAC, 0x8F],
        border: [0x1B, 0x33, 0x20],
    },
    Theme {
        key: "mono".into(),
        label: "Monochrome".into(),
        description: "Pure grayscale".into(),
        dark: true,
        layout: Layout::Classic,
        accent: [0xFF, 0xFF, 0xFF],
        background: [0x0A, 0x0A, 0x0A],
        surface: [0x1F, 0x1F, 0x1F],
        text: [0xF7, 0xF7, 0xF7],
        text_muted: [0x9C, 0x9C, 0x9C],
        border: [0x30, 0x30, 0x30],
    },
    Theme {
        key: "coffee".into(),
        label: "Coffee".into(),
        description: "Radio console — tuner + studio".into(),
        dark: true,
        layout: Layout::Broadcast,
        accent: [0xE8, 0xA3, 0x3D],
        background: [0x10, 0x0B, 0x07],
        surface: [0x24, 0x1A, 0x11],
        text: [0xFB, 0xF3, 0xE7],
        text_muted: [0xB9, 0x9B, 0x77],
        border: [0x36, 0x28, 0x18],
    },
    Theme {
        key: "daylight".into(),
        label: "Daylight".into(),
        description: "Clean light mode with indigo accent".into(),
        dark: false,
        layout: Layout::Classic,
        accent: [0x63, 0x66, 0xF1],
        background: [0xFF, 0xFF, 0xFF],
        surface: [0xE7, 0xE7, 0xEB],
        text: [0x17, 0x17, 0x1C],
        text_muted: [0x83, 0x83, 0x8D],
        border: [0xD6, 0xD6, 0xDC],
    },
];

impl Theme {
    /// Look up by key.
    pub fn by_key(key: &str) -> Self {
        THEMES
            .iter()
            .find(|t| t.key == key)
            .cloned()
            .unwrap_or_else(|| THEMES[0].clone())
    }
}
