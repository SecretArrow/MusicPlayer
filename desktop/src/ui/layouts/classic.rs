//! Classic layout — left sidebar, library track list, bottom player bar.
//!
//! Mirrors the web app's sidebar chrome
//! (`src/components/music-player/layouts/index.tsx`): a navigation rail on
//! the left, a scrolling track list in the middle, and a persistent transport
//! bar along the bottom.

use vello::kurbo::{Point, Rect, RoundedRect};
use vello::peniko::Color;

use crate::app::{AppState, View};
use crate::theme::Theme;
use crate::ui::painter::{
    icon_home, icon_library, icon_note, icon_queue, icon_search, icon_sliders, with_alpha, Painter,
};
use crate::ui::text::{fmt_time, FontFamily};
use crate::ui::{
    draw_action_button, draw_progress, draw_theme_button, draw_transport, draw_volume, metrics,
    now_playing, ActionIcon, HitRegion, TransportGeometry, UiAction,
};
use audio_core::LibraryEntry;

/// Sidebar navigation — the six primary destinations.
const NAV: [(&str, View); 6] = [
    ("Home", View::Home),
    ("Search", View::Search),
    ("Library", View::Library),
    ("Playlists", View::Playlists),
    ("Lyrics", View::Lyrics),
    ("Settings", View::Settings),
];

fn draw_nav_icon(p: &mut Painter, i: usize, cx: f64, cy: f64, s: f64, color: Color) {
    match i {
        0 => icon_home(p, cx, cy, s, color),
        1 => icon_search(p, cx, cy, s, color),
        2 => icon_library(p, cx, cy, s, color),
        3 => icon_queue(p, cx, cy, s, color),
        4 => icon_note(p, cx, cy, s, color),
        _ => icon_sliders(p, cx, cy, s, color),
    }
}

/// First `limit` library entries, sorted by title.
fn library_entries(s: &AppState, limit: usize) -> Vec<LibraryEntry> {
    s.library
        .read()
        .sorted_by_title()
        .into_iter()
        .take(limit)
        .cloned()
        .collect()
}

/// Track list rows shared by the main content area; returns hit zones.
fn draw_track_list(
    p: &mut Painter,
    t: &Theme,
    s: &AppState,
    list_x: f64,
    list_r: f64,
    list_top: f64,
    list_bottom: f64,
) -> Vec<HitRegion> {
    let mut zones = Vec::new();
    let (text, muted) = (t.text_color(), t.text_muted_color());
    let entries = library_entries(s, 12);
    let row_h = 40.0;
    let max_rows = (((list_bottom - list_top) / row_h) as usize).clamp(1, 12);
    let list_w = list_r - list_x;
    for (i, e) in entries.iter().take(max_rows).enumerate() {
        let y = list_top + i as f64 * row_h;
        let row = Rect::new(list_x - 8.0, y, list_r, y + row_h);
        if i % 2 == 1 {
            p.fill_rrect(row, 6.0, p.overlay(0.04));
        }
        let cy = y + row_h / 2.0 + 4.0;
        p.text(
            FontFamily::Sans,
            list_x,
            cy,
            &format!("{:02}", i + 1),
            11.0,
            muted,
        );
        p.text_trunc(
            FontFamily::Sans,
            list_x + 36.0,
            cy,
            &e.title,
            14.0,
            text,
            list_w * 0.42,
        );
        p.text_trunc(
            FontFamily::Sans,
            list_x + list_w * 0.5,
            cy,
            &e.artist,
            12.0,
            muted,
            list_w * 0.32,
        );
        let dur = fmt_time(e.duration_secs);
        let dw = p.text_width(FontFamily::Sans, &dur, 12.0);
        p.text(FontFamily::Sans, list_r - dw, cy, &dur, 12.0, muted);
        zones.push(HitRegion::new(row, UiAction::PlayTrack(e.id.clone())));
    }
    if entries.is_empty() {
        p.text(
            FontFamily::Sans,
            list_x,
            list_top + 48.0,
            "No music yet — add files to your music folder and rescan the library.",
            13.0,
            muted,
        );
    }
    zones
}

/// User playlist list — shown when the active view is `View::Playlists`.
///
/// Each row shows the playlist title, track count, and a small ✕ button
/// to delete it. A "+ New playlist" button at the top creates an empty
/// playlist (the title is auto-generated as "New Playlist N"); rename
/// can be triggered by editing the title in a future iteration, but
/// creating + deleting here covers the core "user can CRUD their own
/// playlists" loop end-to-end.
fn draw_playlist_list(
    p: &mut Painter,
    t: &Theme,
    s: &AppState,
    list_x: f64,
    list_r: f64,
    list_top: f64,
    list_bottom: f64,
) -> Vec<HitRegion> {
    let mut zones = Vec::new();
    let (text, muted) = (t.text_color(), t.text_muted_color());
    let accent = t.accent_color();
    let list_w = list_r - list_x;

    // "+ New playlist" button at the top of the list area.
    let new_btn = Rect::new(list_x, list_top, list_r, list_top + 32.0);
    p.fill_rrect(new_btn, 8.0, with_alpha(accent, 0.15));
    p.text(
        FontFamily::SansBold,
        list_x + 12.0,
        list_top + 20.0,
        "+ New playlist",
        13.0,
        accent,
    );
    zones.push(HitRegion::new(
        new_btn,
        UiAction::CreatePlaylist(format!("New Playlist {}", epoch_suffix())),
    ));

    let playlists: Vec<audio_core::Playlist> = {
        let store = s.playlists.read();
        store.playlists.clone()
    };

    if playlists.is_empty() {
        p.text(
            FontFamily::Sans,
            list_x,
            list_top + 64.0,
            "No playlists yet — click \"+ New playlist\" above to create one.",
            13.0,
            muted,
        );
        return zones;
    }

    let row_h = 44.0;
    let body_top = list_top + 44.0;
    let max_rows = (((list_bottom - body_top) / row_h) as usize).clamp(1, 12);
    for (i, pl) in playlists.iter().take(max_rows).enumerate() {
        let y = body_top + i as f64 * row_h;
        let row = Rect::new(list_x - 8.0, y, list_r, y + row_h);
        if i % 2 == 1 {
            p.fill_rrect(row, 6.0, p.overlay(0.04));
        }
        let cy = y + row_h / 2.0 + 4.0;
        // Cover swatch (gradient placeholder).
        let swatch = Rect::new(list_x, y + 8.0, list_x + 28.0, y + row_h - 8.0);
        p.fill_rrect(swatch, 4.0, with_alpha(accent, 0.6));
        icon_note(p, list_x + 14.0, cy, 12.0, with_alpha(text, 0.85));
        p.text_trunc(
            FontFamily::SansBold,
            list_x + 40.0,
            cy,
            &pl.title,
            14.0,
            text,
            list_w * 0.5,
        );
        let count_label = format!("{} tracks", pl.track_ids.len());
        p.text_trunc(
            FontFamily::Sans,
            list_x + list_w * 0.55,
            cy,
            &count_label,
            12.0,
            muted,
            list_w * 0.25,
        );
        // Delete (✕) button at the right edge of the row.
        let del_w = 28.0;
        let del = Rect::new(list_r - del_w, y + 6.0, list_r, y + row_h - 6.0);
        let del_cy = (del.y0 + del.y1) / 2.0 + 4.0;
        p.text(
            FontFamily::SansBold,
            list_r - del_w + 9.0,
            del_cy,
            "✕",
            13.0,
            muted,
        );
        zones.push(HitRegion::new(row, UiAction::SetView(View::NowPlaying)));
        zones.push(HitRegion::new(del, UiAction::DeletePlaylist(pl.id.clone())));
    }
    zones
}

/// Short suffix to disambiguate auto-generated playlist titles when the
/// user creates several in quick succession. Uses the wall-clock seconds
/// so two clicks a second apart produce different titles.
fn epoch_suffix() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() % 100_000)
        .unwrap_or(0)
}

pub fn render(p: &mut Painter, t: &Theme, s: &AppState, w: f64, h: f64) -> Vec<HitRegion> {
    let mut zones = Vec::new();
    let np = now_playing(s);
    let (text, muted) = (t.text_color(), t.text_muted_color());
    let (accent, surface, border) = (t.accent_color(), t.surface_color(), t.border_color());

    let bar_h = metrics::BOTTOM_BAR_H;
    let top = h - bar_h; // player-bar top edge
    let active = *s.view.read();

    // ---------- sidebar ----------
    let sidebar_w = metrics::SIDEBAR_W;
    p.fill_rect(Rect::new(0.0, 0.0, sidebar_w, top), surface);
    p.fill_rect(Rect::new(sidebar_w - 1.0, 0.0, sidebar_w, top), border);
    p.text(FontFamily::SansBold, 24.0, 42.0, "MusicPlayer", 18.0, text);

    let row_h = metrics::NAV_ROW_H;
    for (i, (label, view)) in NAV.iter().enumerate() {
        let y = 64.0 + i as f64 * row_h;
        let row = Rect::new(12.0, y, sidebar_w - 12.0, y + row_h - 6.0);
        let is_active = active == *view;
        if is_active {
            p.fill_rrect(row, 8.0, p.overlay(0.08));
            // accent bar on the leading edge of the active item
            p.fill_rrect(
                Rect::new(row.x0, row.y0 + 7.0, row.x0 + 3.0, row.y1 - 7.0),
                1.5,
                accent,
            );
        }
        let color = if is_active { text } else { muted };
        let cy = (row.y0 + row.y1) / 2.0;
        draw_nav_icon(p, i, 36.0, cy, 20.0, color);
        p.text(FontFamily::Sans, 58.0, cy + 5.0, label, 14.0, color);
        zones.push(HitRegion::new(row, UiAction::SetView(*view)));
    }
    zones.push(draw_theme_button(p, t, Point::new(28.0, top - 30.0)));
    p.text(FontFamily::Sans, 52.0, top - 25.0, t.label, 12.0, muted);

    // ---------- toolbar: EQ toggle + folder import ----------
    // Stack the two action buttons below the theme button so they stay inside
    // the sidebar and don't collide with the nav list.
    let toolbar_y = top + 8.0;
    let eq_active = *s.show_eq.read();
    zones.push(draw_action_button(
        p,
        t,
        Point::new(28.0, toolbar_y),
        ActionIcon::Sliders,
        eq_active,
        UiAction::ToggleEqPanel,
    ));
    zones.push(draw_action_button(
        p,
        t,
        Point::new(58.0, toolbar_y),
        ActionIcon::Folder,
        false,
        UiAction::ImportFolder,
    ));

    // ---------- main content: branch on active view ----------
    let list_x = sidebar_w + 32.0;
    let list_r = w - 32.0;
    match active {
        View::Playlists => {
            let playlists_count = s.playlists.read().playlists.len();
            p.text(FontFamily::SansBold, list_x, 44.0, "Playlists", 22.0, text);
            let sub = format!(
                "{playlists_count} playlist{} · click + to create",
                if playlists_count == 1 { "" } else { "s" }
            );
            p.text(FontFamily::Sans, list_x, 66.0, &sub, 12.0, muted);
            zones.extend(draw_playlist_list(
                p,
                t,
                s,
                list_x,
                list_r,
                92.0,
                top - 12.0,
            ));
        }
        _ => {
            // Default: library track list.
            let entries = library_entries(s, 12);
            p.text(FontFamily::SansBold, list_x, 44.0, "Library", 22.0, text);
            let sub = format!("{} tracks · sorted by title", entries.len());
            p.text(FontFamily::Sans, list_x, 66.0, &sub, 12.0, muted);
            zones.extend(draw_track_list(p, t, s, list_x, list_r, 92.0, top - 12.0));
        }
    }

    // ---------- bottom player bar ----------
    p.fill_rect(Rect::new(0.0, top, w, h), surface);
    p.fill_rect(Rect::new(0.0, top, w, top + 1.0), border);
    // seek strip across the top of the bar
    zones.extend(draw_progress(
        p,
        t,
        Rect::new(0.0, top + 10.0, w, top + 30.0),
        &np,
        false,
    ));

    let cover = Rect::new(16.0, top + 28.0, 76.0, top + 88.0);
    p.fill_gradient_v(cover, accent, with_alpha(surface, 0.4), 8.0);
    icon_note(p, 46.0, top + 58.0, 24.0, with_alpha(text, 0.85));
    let title_w = (w * 0.26).clamp(120.0, 300.0);
    p.text_trunc(
        FontFamily::SansBold,
        92.0,
        top + 46.0,
        &np.title,
        15.0,
        text,
        title_w,
    );
    p.text_trunc(
        FontFamily::Sans,
        92.0,
        top + 70.0,
        &np.artist,
        12.0,
        muted,
        title_w,
    );
    let stamp = format!("{} / {}", np.position_label(), np.duration_label());
    let stamp_x = 92.0 + title_w + 24.0;
    let stamp_w = (w - 392.0 - 12.0 - stamp_x).max(40.0);
    p.text_trunc(
        FontFamily::Sans,
        stamp_x,
        top + 46.0,
        &stamp,
        11.0,
        muted,
        stamp_w,
    );

    let geo = TransportGeometry::centered(w - 260.0, top + 58.0);
    let (shuffle, repeat) = {
        let q = s.queue.read();
        (q.shuffle, q.repeat)
    };
    zones.extend(draw_transport(p, t, &geo, &np, shuffle, repeat));

    let vol_bar = Rect::new(w - 78.0, top + 55.0, w - 16.0, top + 61.0);
    zones.extend(draw_volume(
        p,
        t,
        Point::new(w - 96.0, top + 58.0),
        vol_bar,
        *s.volume.read() as f64,
        *s.muted.read(),
    ));

    // ---------- EQ panel overlay (toggled from the sidebar) ----------
    if *s.show_eq.read() {
        zones.extend(draw_eq_overlay(p, t, s, w, h));
    }

    zones
}

/// Floating EQ panel — 10 vertical band sliders + preset label + enable
/// toggle. Rendered as an overlay above the main content when `show_eq` is on.
fn draw_eq_overlay(p: &mut Painter, t: &Theme, s: &AppState, w: f64, _h: f64) -> Vec<HitRegion> {
    use crate::ui::ActionIcon;
    use audio_core::effects::preset_names;

    let mut zones = Vec::new();
    // Panel occupies the right-hand third of the screen, full content height.
    let panel_w = 360.0_f64.min(w - 40.0);
    let panel_x = w - panel_w - 16.0;
    let panel_y = 60.0;
    let panel_h = 380.0_f64.min(_h - 80.0);
    let panel = Rect::new(panel_x, panel_y, panel_x + panel_w, panel_y + panel_h);
    let bg = with_alpha(t.surface_color(), 0.97);
    p.fill_rrect(panel, 14.0, bg);
    let panel_stroke = RoundedRect::from_rect(panel, 14.0);
    p.stroke(&panel_stroke, 1.0, t.border_color());

    let eq = s.eq.read();
    let text = t.text_color();
    let muted = t.text_muted_color();
    let accent = t.accent_color();

    // Header: title + enable toggle
    p.text(
        FontFamily::SansBold,
        panel_x + 20.0,
        panel_y + 24.0,
        "Equalizer",
        18.0,
        text,
    );
    let preset_label = if eq.enabled {
        eq.preset.clone()
    } else {
        "Off".to_string()
    };
    p.text(
        FontFamily::Sans,
        panel_x + panel_w - 20.0,
        panel_y + 26.0,
        &preset_label,
        12.0,
        if eq.enabled { accent } else { muted },
    );

    // Enable toggle hit zone (top-right corner of header)
    let toggle_rect = Rect::new(
        panel_x + panel_w - 44.0,
        panel_y + 18.0,
        panel_x + panel_w - 20.0,
        panel_y + 38.0,
    );
    zones.push(HitRegion::new(toggle_rect, UiAction::ToggleEq));

    // 10 vertical sliders
    let slider_y0 = panel_y + 70.0;
    let slider_y1 = panel_y + panel_h - 70.0;
    let slider_h = slider_y1 - slider_y0;
    let slider_area_x0 = panel_x + 28.0;
    let slider_area_x1 = panel_x + panel_w - 28.0;
    let slider_count = 10usize;
    let step = (slider_area_x1 - slider_area_x0) / (slider_count - 1) as f64;
    let freqs = audio_core::EQ_FREQS;
    for (i, freq) in freqs.iter().enumerate() {
        let cx = slider_area_x0 + step * i as f64;
        let gain_db = eq.bands[i] as f64;
        // Map gain_db (-12..+12) to vertical fill fraction (0..1): 0 dB → 0.5
        let frac = ((gain_db + 12.0) / 24.0).clamp(0.0, 1.0);
        // Track
        p.fill_rect(
            Rect::new(cx - 2.0, slider_y0, cx + 2.0, slider_y1),
            t.border_color(),
        );
        // Active fill
        let mid_y = slider_y0 + slider_h * (1.0 - frac);
        let active_color = if eq.enabled { accent } else { muted };
        p.fill_rect(
            Rect::new(cx - 2.0, mid_y, cx + 2.0, slider_y0 + slider_h * 0.5),
            active_color,
        );
        // Handle
        p.fill_circle(cx, mid_y, 5.0, active_color);
        // Frequency label below
        let label = if *freq >= 1000.0 {
            format!("{:.0}k", *freq / 1000.0)
        } else {
            format!("{}", freq)
        };
        p.text(
            FontFamily::Sans,
            cx - 12.0,
            slider_y1 + 8.0,
            &label,
            10.0,
            muted,
        );
        // Hit zone — the click y within this rect determines the new gain.
        // The dispatcher computes gain from `fraction` (1 - y_frac) so we only
        // need to encode the band index here.
        let hit = Rect::new(cx - 12.0, slider_y0 - 8.0, cx + 12.0, slider_y1 + 24.0);
        zones.push(HitRegion::new(hit, UiAction::SetEqBand(i, 0.0)));
    }

    // Preset chips along the bottom of the panel
    let chip_y = panel_y + panel_h - 36.0;
    let presets = preset_names();
    let chips_per_row = 4;
    let chip_w = (panel_w - 40.0) / chips_per_row as f64;
    for (i, name) in presets.iter().take(12).enumerate() {
        let row = i / chips_per_row;
        let col = i % chips_per_row;
        let cx = panel_x + 20.0 + col as f64 * chip_w + chip_w / 2.0;
        let cy = chip_y + row as f64 * 24.0;
        let active = eq.preset == *name;
        let color = if active { accent } else { muted };
        let bg_chip = if active {
            with_alpha(accent, 0.18)
        } else {
            with_alpha(t.surface_color(), 0.4)
        };
        let chip_rect = Rect::new(
            cx - chip_w / 2.0 + 4.0,
            cy - 9.0,
            cx + chip_w / 2.0 - 4.0,
            cy + 9.0,
        );
        p.fill_rrect(chip_rect, 9.0, bg_chip);
        p.text(FontFamily::Sans, cx - 30.0, cy + 4.0, name, 10.0, color);
        zones.push(HitRegion::new(
            chip_rect,
            UiAction::ApplyEqPreset(name.to_string()),
        ));
    }

    // Let layouts reuse the action-icon helper for the close affordance — but
    // any of the SetEqBand hits above double as "click to change", so we leave
    // the close to the same ToggleEqPanel button in the sidebar.
    let _ = ActionIcon::Sliders; // suppress unused-import lint if any.

    zones
}
