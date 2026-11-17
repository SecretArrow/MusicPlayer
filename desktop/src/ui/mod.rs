//! UI rendering — dispatches to per-layout renderers.
//!
//! Mirrors the web app's `src/components/music-player/layouts/*`:
//! every theme maps to a full layout variant (themes are more than colors),
//! so this module renders 8 distinct chrome arrangements driven by the same
//! app state.

#![allow(dead_code)] // widget library: some helpers land before their layouts

pub mod layouts;
pub mod painter;
pub mod text;

use vello::kurbo::{Affine, Point, Rect};
use vello::peniko::Color;
use vello::Scene;

use crate::app::{AppState, View};
use crate::theme::{Layout, Theme};

use text::{fmt_time, prettify_id, FontBook, FontFamily};

// ---------------------------------------------------------------------------
// Hit testing
// ---------------------------------------------------------------------------

/// What to do when a hit region is clicked.
#[derive(Debug, Clone, PartialEq)]
pub enum UiAction {
    SetView(View),
    TogglePlay,
    Stop,
    Next,
    Prev,
    ToggleShuffle,
    CycleRepeat,
    ToggleMute,
    NextTheme,
    /// Seek inside the region: fraction comes from click x within `rect`.
    Seek,
    /// Volume from click x within the region rect.
    SetVolume,
    /// Start playback of a library track by id.
    PlayTrack(String),
    // --- Equalizer ---
    /// Toggle the EQ panel open/closed.
    ToggleEqPanel,
    /// Enable or disable the EQ.
    ToggleEq,
    /// Apply a named preset ("flat", "rock", …).
    ApplyEqPreset(String),
    /// Set an EQ band to a gain (dB). Payload: (band_index, gain_db).
    SetEqBand(usize, f32),
    // --- Import ---
    /// Open the native folder picker; selected path scanned into the library.
    ImportFolder,
    // --- Queue CRUD ---
    /// Add a track id to the end of the queue.
    Enqueue(String),
    /// Insert a track id as the next-to-play item.
    PlayNext(String),
    /// Remove the queue item at the given absolute index.
    RemoveFromQueue(usize),
    /// Jump to (play) the queue item with the given track id.
    JumpToQueue(String),
    /// Move queue item from `from` to `to` (absolute indices).
    MoveQueueItem(usize, usize),
    // --- Playlists ---
    /// Create a new empty playlist with the given title.
    CreatePlaylist(String),
    /// Add a track id to a playlist.
    AddToPlaylist { playlist_id: String, track_id: String },
    /// Delete a playlist by id.
    DeletePlaylist(String),
}

impl UiAction {
    /// Stable debug label (used by tests + logs).
    #[allow(dead_code)]
    pub fn label(&self) -> &'static str {
        match self {
            UiAction::SetView(_) => "set_view",
            UiAction::TogglePlay => "toggle_play",
            UiAction::Stop => "stop",
            UiAction::Next => "next",
            UiAction::Prev => "prev",
            UiAction::ToggleShuffle => "toggle_shuffle",
            UiAction::CycleRepeat => "cycle_repeat",
            UiAction::ToggleMute => "toggle_mute",
            UiAction::NextTheme => "next_theme",
            UiAction::Seek => "seek",
            UiAction::SetVolume => "set_volume",
            UiAction::PlayTrack(_) => "play_track",
            UiAction::ToggleEqPanel => "toggle_eq_panel",
            UiAction::ToggleEq => "toggle_eq",
            UiAction::ApplyEqPreset(_) => "apply_eq_preset",
            UiAction::SetEqBand(_, _) => "set_eq_band",
            UiAction::ImportFolder => "import_folder",
            UiAction::Enqueue(_) => "enqueue",
            UiAction::PlayNext(_) => "play_next",
            UiAction::RemoveFromQueue(_) => "remove_from_queue",
            UiAction::JumpToQueue(_) => "jump_to_queue",
            UiAction::MoveQueueItem(_, _) => "move_queue_item",
            UiAction::CreatePlaylist(_) => "create_playlist",
            UiAction::AddToPlaylist { .. } => "add_to_playlist",
            UiAction::DeletePlaylist(_) => "delete_playlist",
        }
    }
}

/// A clickable rectangle produced during the last render.
#[derive(Debug, Clone, PartialEq)]
pub struct HitRegion {
    pub rect: Rect,
    pub action: UiAction,
}

impl HitRegion {
    pub fn new(rect: Rect, action: UiAction) -> Self {
        Self { rect, action }
    }

    /// Fraction of `x` inside the region rect, clamped to 0..1 (seek/volume).
    pub fn fraction(&self, x: f64) -> f64 {
        fraction_in_rect(x, self.rect)
    }

    /// Fraction of `y` inside the region rect, clamped to 0..1 (vertical
    /// sliders such as the EQ band controls).
    pub fn fraction_y(&self, y: f64) -> f64 {
        if self.rect.height() <= 0.0 {
            return 0.0;
        }
        ((y - self.rect.y0) / self.rect.height()).clamp(0.0, 1.0)
    }
}

/// Fraction of `x` within `rect`, clamped to 0..1.
pub fn fraction_in_rect(x: f64, rect: Rect) -> f64 {
    if rect.width() <= 0.0 {
        return 0.0;
    }
    ((x - rect.x0) / rect.width()).clamp(0.0, 1.0)
}

/// Topmost region containing the point (regions are emitted back-to-front).
pub fn hit_test(regions: &[HitRegion], x: f64, y: f64) -> Option<&HitRegion> {
    regions
        .iter()
        .rev()
        .find(|r| r.rect.contains(Point::new(x, y)))
}

// ---------------------------------------------------------------------------
// Shared metrics (logical pixels)
// ---------------------------------------------------------------------------

/// Layout constants shared by render + tests.
pub mod metrics {
    pub const SIDEBAR_W: f64 = 240.0;
    pub const BOTTOM_BAR_H: f64 = 96.0;
    pub const NAV_ROW_H: f64 = 44.0;
    pub const TURNTABLE_W: f64 = 320.0;
    pub const FOCUS_STAGE_R: f64 = 180.0;
    pub const TRANSPORT_BTN: f64 = 40.0;
    pub const TRANSPORT_PLAY_BTN: f64 = 56.0;
}

// ---------------------------------------------------------------------------
// App-state snapshots used by the layouts
// ---------------------------------------------------------------------------

/// What the layouts display for the "current track".
#[derive(Debug, Clone, PartialEq)]
pub struct NowPlaying {
    pub id: Option<String>,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub position: f64,
    pub duration: f64,
    pub is_playing: bool,
}

impl NowPlaying {
    /// Progress fraction 0..1 (0 when duration is unknown).
    pub fn progress(&self) -> f64 {
        if self.duration > 0.0 {
            (self.position / self.duration).clamp(0.0, 1.0)
        } else {
            0.0
        }
    }

    pub fn position_label(&self) -> String {
        fmt_time(self.position)
    }

    pub fn duration_label(&self) -> String {
        fmt_time(self.duration)
    }
}

/// Resolve display metadata for the current track from app state.
pub fn now_playing(state: &AppState) -> NowPlaying {
    let id = state.controller.current_track_id();
    let (title, artist, album) = match &id {
        Some(id) => state
            .library
            .read()
            .get(id)
            .map(|e| (e.title.clone(), e.artist.clone(), e.album.clone()))
            .unwrap_or_else(|| {
                (
                    prettify_id(id),
                    "Unknown artist".into(),
                    "Local file".into(),
                )
            }),
        None => (
            "Nothing playing yet".into(),
            "Pick a track from your library".into(),
            String::new(),
        ),
    };
    NowPlaying {
        is_playing: matches!(state.controller.state(), audio_core::PlaybackState::Playing),
        id,
        title,
        artist,
        album,
        position: state.controller.position(),
        duration: state.controller.duration(),
    }
}

/// One row in a track list / bento tile.
#[derive(Debug, Clone, PartialEq)]
pub struct TrackRow {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub index: usize,
}

/// Rows for track lists — sorted by title from the library. Empty when no
/// library has been scanned (layouts show an empty state instead).
pub fn track_rows(state: &AppState, limit: usize) -> Vec<TrackRow> {
    let library = state.library.read();
    library
        .sorted_by_title()
        .into_iter()
        .take(limit)
        .enumerate()
        .map(|(i, e)| TrackRow {
            id: e.id.clone(),
            title: e.title.clone(),
            artist: e.artist.clone(),
            index: i,
        })
        .collect()
}

// ---------------------------------------------------------------------------
// Renderer entry point
// ---------------------------------------------------------------------------

/// Cached resources (fonts) shared across frames.
pub struct Ui {
    pub fonts: FontBook,
}

impl Ui {
    pub fn new() -> Self {
        Self {
            fonts: FontBook::load(),
        }
    }

    /// Render the full frame. Returns the hit regions for click dispatch.
    pub fn render(
        &self,
        scene: &mut Scene,
        theme: &Theme,
        state: &AppState,
        physical: (f64, f64),
        scale: f64,
    ) -> Vec<HitRegion> {
        let scale = if scale.is_finite() && scale > 0.01 {
            scale
        } else {
            1.0
        };
        let (w, h) = (physical.0 / scale, physical.1 / scale);

        let mut p = painter::Painter::new(scene, &self.fonts, Affine::scale(scale));

        // Background wash — glass gets its aurora gradient, everyone else a
        // subtle vertical fade of the theme background.
        match theme.layout {
            Layout::Glass => layouts::glass::paint_background(&mut p, theme, w, h),
            Layout::Focus => layouts::focus::paint_background(&mut p, theme, w, h),
            Layout::Cyber => layouts::cyber::paint_background(&mut p, theme, w, h),
            _ => {
                let bg = theme.background_color();
                let bg2 = painter::with_alpha(bg, 0.0);
                p.fill_gradient_v(Rect::new(0.0, 0.0, w, h), theme.surface_color(), bg, 0.0);
                let _ = bg2;
            }
        }

        match theme.layout {
            Layout::Classic => layouts::classic::render(&mut p, theme, state, w, h),
            Layout::Glass => layouts::glass::render(&mut p, theme, state, w, h),
            Layout::Vinyl => layouts::vinyl::render(&mut p, theme, state, w, h),
            Layout::Cassette => layouts::cassette::render(&mut p, theme, state, w, h),
            Layout::Cyber => layouts::cyber::render(&mut p, theme, state, w, h),
            Layout::Focus => layouts::focus::render(&mut p, theme, state, w, h),
            Layout::Mosaic => layouts::mosaic::render(&mut p, theme, state, w, h),
            Layout::Broadcast => layouts::broadcast::render(&mut p, theme, state, w, h),
        }
    }
}

impl Default for Ui {
    fn default() -> Self {
        Self::new()
    }
}

// ---------------------------------------------------------------------------
// Shared control builders (used by several layouts)
// ---------------------------------------------------------------------------

use audio_core::{RepeatMode, ShuffleMode};

/// Which nav icon to draw — matches the web app's lucide set.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NavIcon {
    Home,
    Search,
    Library,
    Recent,
    Genres,
    Stats,
}

const NAV_ICONS: [NavIcon; 6] = [
    NavIcon::Home,
    NavIcon::Search,
    NavIcon::Library,
    NavIcon::Recent,
    NavIcon::Genres,
    NavIcon::Stats,
];

/// Default view order — matches `pc-player.tsx` navItems.
pub const NAV_VIEWS: [View; 6] = [
    View::Home,
    View::Search,
    View::Library,
    View::Recent,
    View::Genre,
    View::Stats,
];

pub fn nav_icon_for(view: View) -> NavIcon {
    match view {
        View::Home => NavIcon::Home,
        View::Search => NavIcon::Search,
        View::Library => NavIcon::Library,
        View::Recent => NavIcon::Recent,
        View::Genre => NavIcon::Genres,
        View::Stats => NavIcon::Stats,
        _ => NavIcon::Home,
    }
}

/// Sidebar column of nav rows (classic + vinyl rails).
#[allow(clippy::too_many_arguments)]
pub fn draw_nav_column(
    p: &mut painter::Painter,
    theme: &Theme,
    x: f64,
    y0: f64,
    width: f64,
    row_h: f64,
    labels: &[&str; 6],
    active: View,
) -> Vec<HitRegion> {
    let mut zones = Vec::with_capacity(6);
    for (i, label) in labels.iter().enumerate() {
        let row = Rect::new(
            x + 12.0,
            y0 + i as f64 * row_h,
            x + width - 12.0,
            y0 + (i + 1) as f64 * row_h - 6.0,
        );
        let view = NAV_VIEWS[i];
        let is_active = active == view;
        if is_active {
            p.fill_rrect(row, 8.0, p.overlay(0.10));
        }
        let icon_color = if is_active {
            theme.text_color()
        } else {
            theme.text_muted_color()
        };
        let cx = x + 34.0;
        let cy = (row.y0 + row.y1) / 2.0;
        draw_nav_icon(p, NAV_ICONS[i], cx, cy, 20.0, icon_color);
        p.text_trunc(
            FontFamily::Sans,
            x + 56.0,
            cy + 6.0,
            label,
            14.0,
            icon_color,
            row.width() - 50.0,
        );
        zones.push(HitRegion::new(row, UiAction::SetView(view)));
    }
    zones
}

pub fn draw_nav_icon(
    p: &mut painter::Painter,
    icon: NavIcon,
    cx: f64,
    cy: f64,
    s: f64,
    color: Color,
) {
    use painter::*;
    match icon {
        NavIcon::Home => icon_home(p, cx, cy, s, color),
        NavIcon::Search => icon_search(p, cx, cy, s, color),
        NavIcon::Library => icon_library(p, cx, cy, s, color),
        NavIcon::Recent => icon_recent(p, cx, cy, s, color),
        NavIcon::Genres => icon_genres(p, cx, cy, s, color),
        NavIcon::Stats => icon_stats(p, cx, cy, s, color),
    }
}

/// Standard transport row geometry (shuffle/prev/play/next/repeat centers).
pub struct TransportGeometry {
    pub shuffle: Point,
    pub prev: Point,
    pub play: Point,
    pub next: Point,
    pub repeat: Point,
}

impl TransportGeometry {
    pub fn centered(cx: f64, cy: f64) -> Self {
        let spacing = 52.0;
        Self {
            shuffle: Point::new(cx - 2.0 * spacing, cy),
            prev: Point::new(cx - spacing, cy),
            play: Point::new(cx, cy),
            next: Point::new(cx + spacing, cy),
            repeat: Point::new(cx + 2.0 * spacing, cy),
        }
    }

    pub fn hit_rects(&self) -> [Rect; 5] {
        let mk = |c: Point, s: f64| {
            Rect::new(c.x - s / 2.0, c.y - s / 2.0, c.x + s / 2.0, c.y + s / 2.0)
        };
        [
            mk(self.shuffle, metrics::TRANSPORT_BTN),
            mk(self.prev, metrics::TRANSPORT_BTN),
            mk(self.play, metrics::TRANSPORT_PLAY_BTN),
            mk(self.next, metrics::TRANSPORT_BTN),
            mk(self.repeat, metrics::TRANSPORT_BTN),
        ]
    }
}

/// Draw the standard transport cluster; returns its hit regions.
pub fn draw_transport(
    p: &mut painter::Painter,
    theme: &Theme,
    geo: &TransportGeometry,
    np: &NowPlaying,
    shuffle: ShuffleMode,
    repeat: RepeatMode,
) -> Vec<HitRegion> {
    use painter::*;
    let mut zones = Vec::with_capacity(5);
    let muted = theme.text_muted_color();
    let accent = theme.accent_color();
    let s = 18.0;

    // Shuffle
    let shuf_color = if shuffle == ShuffleMode::On {
        accent
    } else {
        muted
    };
    icon_shuffle(p, geo.shuffle.x, geo.shuffle.y, s, shuf_color);

    // Prev
    p.fill(&icon_prev_path(geo.prev.x, geo.prev.y, s), muted);

    // Play/pause — filled accent circle
    p.fill_circle(
        geo.play.x,
        geo.play.y,
        metrics::TRANSPORT_PLAY_BTN / 2.0,
        accent,
    );
    let glyph = Color::rgb8(0x0A, 0x0A, 0x0A);
    if np.is_playing {
        p.fill(&icon_pause_path(geo.play.x, geo.play.y, 22.0), glyph);
    } else {
        p.fill(&icon_play_path(geo.play.x, geo.play.y, 22.0), glyph);
    }

    // Next
    p.fill(&icon_next_path(geo.next.x, geo.next.y, s), muted);

    // Repeat
    let rep_color = if repeat != RepeatMode::Off {
        accent
    } else {
        muted
    };
    icon_repeat(p, geo.repeat.x, geo.repeat.y, s, rep_color);
    if repeat == RepeatMode::One {
        p.text(
            FontFamily::Sans,
            geo.repeat.x - 4.0,
            geo.repeat.y + 4.0,
            "1",
            9.0,
            accent,
        );
    }

    for (rect, action) in geo.hit_rects().into_iter().zip([
        UiAction::ToggleShuffle,
        UiAction::Prev,
        UiAction::TogglePlay,
        UiAction::Next,
        UiAction::CycleRepeat,
    ]) {
        zones.push(HitRegion::new(rect, action));
    }
    zones
}

/// Horizontal progress/seek bar with optional time labels; returns [Seek].
pub fn draw_progress(
    p: &mut painter::Painter,
    theme: &Theme,
    rect: Rect,
    np: &NowPlaying,
    show_labels: bool,
) -> Vec<HitRegion> {
    let mut zones = Vec::new();
    let track_h = 5.0;
    let cy = (rect.y0 + rect.y1) / 2.0;
    let (bx0, bx1) = (rect.x0, rect.x1);
    if show_labels {
        p.text(
            FontFamily::Sans,
            bx0,
            rect.y1,
            &np.position_label(),
            11.0,
            theme.text_muted_color(),
        );
        let dur = np.duration_label();
        let w = p.text_width(FontFamily::Sans, &dur, 11.0);
        p.text(
            FontFamily::Sans,
            bx1 - w,
            rect.y1,
            &dur,
            11.0,
            theme.text_muted_color(),
        );
    }
    let frac = np.progress();
    let fill = painter::with_alpha(theme.text_color(), 0.15);
    p.fill_rrect(
        Rect::new(bx0, cy - track_h / 2.0, bx1, cy + track_h / 2.0),
        2.5,
        fill,
    );
    if frac > 0.0 {
        p.fill_rrect(
            Rect::new(
                bx0,
                cy - track_h / 2.0,
                bx0 + (bx1 - bx0) * frac,
                cy + track_h / 2.0,
            ),
            2.5,
            theme.accent_color(),
        );
    }
    // Knob
    p.fill_circle(bx0 + (bx1 - bx0) * frac, cy, 5.0, theme.text_color());
    zones.push(HitRegion::new(rect, UiAction::Seek));
    zones
}

/// Volume icon + slider; returns [ToggleMute, SetVolume].
pub fn draw_volume(
    p: &mut painter::Painter,
    theme: &Theme,
    icon_center: Point,
    bar: Rect,
    volume: f64,
    muted: bool,
) -> Vec<HitRegion> {
    use painter::*;
    let color = theme.text_muted_color();
    icon_volume(
        p,
        icon_center.x,
        icon_center.y,
        18.0,
        color,
        muted || volume <= 0.0,
    );
    let cy = (bar.y0 + bar.y1) / 2.0;
    let frac = if muted { 0.0 } else { volume.clamp(0.0, 1.0) };
    let fill = painter::with_alpha(theme.text_color(), 0.15);
    p.fill_rrect(bar, 2.5, fill);
    if frac > 0.0 {
        p.fill_rrect(
            Rect::new(bar.x0, cy - 2.5, bar.x0 + bar.width() * frac, cy + 2.5),
            2.5,
            theme.accent_color(),
        );
    }
    let icon_rect = Rect::new(
        icon_center.x - 14.0,
        icon_center.y - 14.0,
        icon_center.x + 14.0,
        icon_center.y + 14.0,
    );
    vec![
        HitRegion::new(icon_rect, UiAction::ToggleMute),
        HitRegion::new(bar, UiAction::SetVolume),
    ]
}

/// Compact round icon button (for docks/toolbars); returns its hit region.
pub fn draw_icon_button(
    p: &mut painter::Painter,
    theme: &Theme,
    center: Point,
    size: f64,
    icon: NavIcon,
    active: bool,
) -> HitRegion {
    let color = if active {
        theme.accent_color()
    } else {
        theme.text_muted_color()
    };
    if active {
        p.fill_circle(center.x, center.y, size / 2.0, p.overlay(0.10));
    }
    draw_nav_icon(p, icon, center.x, center.y, size * 0.55, color);
    let rect = Rect::new(
        center.x - size / 2.0,
        center.y - size / 2.0,
        center.x + size / 2.0,
        center.y + size / 2.0,
    );
    HitRegion::new(rect, UiAction::SetView(nav_view_for_icon(icon)))
}

pub fn nav_view_for_icon(icon: NavIcon) -> View {
    match icon {
        NavIcon::Home => View::Home,
        NavIcon::Search => View::Search,
        NavIcon::Library => View::Library,
        NavIcon::Recent => View::Recent,
        NavIcon::Genres => View::Genre,
        NavIcon::Stats => View::Stats,
    }
}

/// Small toolbar with a theme-cycler button; returns [NextTheme].
pub fn draw_theme_button(p: &mut painter::Painter, theme: &Theme, center: Point) -> HitRegion {
    use painter::*;
    icon_palette(
        p,
        center.x,
        center.y,
        16.0,
        theme.text_muted_color(),
        theme.accent_color(),
    );
    let rect = Rect::new(
        center.x - 13.0,
        center.y - 13.0,
        center.x + 13.0,
        center.y + 13.0,
    );
    HitRegion::new(rect, UiAction::NextTheme)
}

/// Generic icon button that emits an arbitrary [UiAction]. Used for the
/// EQ-panel toggle and the folder-import button (which don't have a View
/// to navigate to, so they can't reuse [draw_icon_button]).
pub fn draw_action_button(
    p: &mut painter::Painter,
    theme: &Theme,
    center: Point,
    icon: ActionIcon,
    active: bool,
    action: UiAction,
) -> HitRegion {
    let color = if active {
        theme.accent_color()
    } else {
        theme.text_muted_color()
    };
    if active {
        p.fill_circle(center.x, center.y, 13.0, p.overlay(0.10));
    }
    use painter::ActionIcon as PaintAction;
    painter::draw_action_icon(p, icon as PaintAction, center.x, center.y, 16.0, color);
    let rect = Rect::new(
        center.x - 13.0,
        center.y - 13.0,
        center.x + 13.0,
        center.y + 13.0,
    );
    HitRegion::new(rect, action)
}

/// Re-export of painter::ActionIcon so layouts can reference the icon set
/// without needing to depend on the painter module directly.
pub use painter::ActionIcon;
