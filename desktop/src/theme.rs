//! Theme definitions — mirrors the web app's `src/data/themes.ts`.
//!
//! Each theme carries its color palette AND its layout variant, matching the
//! web app's per-theme layout system. The native renderer dispatches to the
//! matching `ui::layouts::*` module based on `layout`.

/// Layout variant — matches the web app's `ThemeLayout`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
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
#[derive(Debug, Clone, Copy)]
#[allow(dead_code)] // full field set mirrors the web app; dark/description used by picker UI later
pub struct Theme {
    pub key: &'static str,
    pub label: &'static str,
    pub description: &'static str,
    pub dark: bool,
    pub layout: Layout,
    pub accent: [u8; 3],
    pub background: [u8; 3],
    pub surface: [u8; 3],
    pub text: [u8; 3],
    pub text_muted: [u8; 3],
    pub border: [u8; 3],
}

impl Default for Theme {
    fn default() -> Self {
        THEMES[0]
    }
}

/// All 10 built-in themes — same data as the web app.
pub static THEMES: [Theme; 10] = [
    Theme {
        key: "midnight",
        label: "Midnight",
        description: "Deep charcoal with emerald glow",
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
        key: "aurora",
        label: "Aurora",
        description: "Glass deck — floating frosted panels",
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
        key: "sunset",
        label: "Sunset",
        description: "Vinyl lounge — spinning turntable",
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
        key: "rosewood",
        label: "Rosewood",
        description: "Cassette deck — velvet maroon hi-fi",
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
        key: "violet",
        label: "Violet Night",
        description: "Neon terminal — monospace HUD",
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
        key: "ocean",
        label: "Ocean",
        description: "Wave focus — immersive stage + dock",
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
        key: "forest",
        label: "Forest",
        description: "Bento garden — tile dashboard",
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
        key: "mono",
        label: "Monochrome",
        description: "Pure grayscale",
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
        key: "coffee",
        label: "Coffee",
        description: "Radio console — tuner + studio",
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
        key: "daylight",
        label: "Daylight",
        description: "Clean light mode with indigo accent",
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
    #[allow(dead_code)] // used by the upcoming theme-picker view
    pub fn by_key(key: &str) -> Self {
        THEMES
            .iter()
            .find(|t| t.key == key)
            .copied()
            .unwrap_or(THEMES[0])
    }

    fn color_of(slot: [u8; 3]) -> vello::peniko::Color {
        vello::peniko::Color::rgb8(slot[0], slot[1], slot[2])
    }

    pub fn accent_color(&self) -> vello::peniko::Color {
        Self::color_of(self.accent)
    }

    pub fn background_color(&self) -> vello::peniko::Color {
        Self::color_of(self.background)
    }

    pub fn surface_color(&self) -> vello::peniko::Color {
        Self::color_of(self.surface)
    }

    pub fn text_color(&self) -> vello::peniko::Color {
        Self::color_of(self.text)
    }

    pub fn text_muted_color(&self) -> vello::peniko::Color {
        Self::color_of(self.text_muted)
    }

    pub fn border_color(&self) -> vello::peniko::Color {
        Self::color_of(self.border)
    }

    /// Index of this theme in the built-in list (for the next() helper).
    pub fn index(&self) -> usize {
        THEMES.iter().position(|t| t.key == self.key).unwrap_or(0)
    }

    /// Cycle to the next built-in theme (wraps around).
    pub fn next(&self) -> Self {
        THEMES[(self.index() + 1) % THEMES.len()]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ten_themes_exist() {
        assert_eq!(THEMES.len(), 10);
    }

    #[test]
    fn by_key_resolves_and_falls_back() {
        assert_eq!(Theme::by_key("ocean").key, "ocean");
        assert_eq!(Theme::by_key("nonexistent").key, "midnight");
        assert_eq!(Theme::default().key, "midnight");
    }

    #[test]
    fn layouts_cover_all_variants() {
        let mut seen = std::collections::HashSet::new();
        for t in THEMES.iter() {
            seen.insert(t.layout);
        }
        assert_eq!(seen.len(), 8, "all 8 layout variants must be covered");
    }

    #[test]
    fn daylight_is_the_only_light_theme() {
        for t in THEMES.iter() {
            assert_eq!(t.dark, t.key != "daylight");
        }
    }

    #[test]
    fn next_cycles_through_all_ten() {
        let mut t = Theme::default();
        let mut visited = 0;
        loop {
            t = t.next();
            visited += 1;
            if t.key == Theme::default().key {
                break;
            }
            assert!(visited < 100);
        }
        assert_eq!(visited, 10);
    }
}
