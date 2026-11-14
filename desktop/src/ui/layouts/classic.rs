//! Classic layout — left sidebar, library track list, bottom player bar.
//!
//! Mirrors the web app's sidebar chrome
//! (`src/components/music-player/layouts/index.tsx`): a navigation rail on
//! the left, a scrolling track list in the middle, and a persistent transport
//! bar along the bottom.

use vello::kurbo::{Point, Rect};
use vello::peniko::Color;

use crate::app::{AppState, View};
use crate::theme::Theme;
use crate::ui::painter::{
    icon_home, icon_library, icon_note, icon_queue, icon_search, icon_sliders, with_alpha, Painter,
};
use crate::ui::text::{fmt_time, FontFamily};
use crate::ui::{
    draw_progress, draw_theme_button, draw_transport, draw_volume, metrics, now_playing, HitRegion,
    TransportGeometry, UiAction,
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

    // ---------- main content: library track list ----------
    let list_x = sidebar_w + 32.0;
    let list_r = w - 32.0;
    let entries = library_entries(s, 12);
    p.text(FontFamily::SansBold, list_x, 44.0, "Library", 22.0, text);
    let sub = format!("{} tracks · sorted by title", entries.len());
    p.text(FontFamily::Sans, list_x, 66.0, &sub, 12.0, muted);
    zones.extend(draw_track_list(p, t, s, list_x, list_r, 92.0, top - 12.0));

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

    zones
}
