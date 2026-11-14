//! Vinyl layout — spinning turntable deck panel + library list + player bar.
//!
//! Mirrors the web app's `layouts/vinyl.tsx`: a left deck panel with a
//! rotating record whose angle tracks the elapsed playback time, and the
//! browsing experience on the right.

use vello::kurbo::{Circle, Rect};
use vello::peniko::Color;

use crate::app::AppState;
use crate::theme::Theme;
use crate::ui::painter::{icon_note, with_alpha, Painter};
use crate::ui::text::{fmt_time, FontFamily};
use crate::ui::{
    draw_progress, draw_transport, metrics, now_playing, HitRegion, TransportGeometry, UiAction,
};
use audio_core::{LibraryEntry, PlaybackState};

const RECORD_R: f64 = 110.0;
const LABEL_R: f64 = 32.0;

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

pub fn render(p: &mut Painter, t: &Theme, s: &AppState, w: f64, h: f64) -> Vec<HitRegion> {
    let mut zones = Vec::new();
    let np = now_playing(s);
    let (text, muted) = (t.text_color(), t.text_muted_color());
    let (accent, surface, border) = (t.accent_color(), t.surface_color(), t.border_color());
    let deck_w = metrics::TURNTABLE_W;
    let top = h - metrics::BOTTOM_BAR_H;
    let playing = matches!(s.controller.state(), PlaybackState::Playing);

    // ---------- turntable deck panel ----------
    p.fill_rect(Rect::new(0.0, 0.0, deck_w, h), surface);
    p.fill_rect(Rect::new(deck_w - 1.0, 0.0, deck_w, h), border);
    p.text(FontFamily::SansBold, 24.0, 40.0, "Now Playing", 16.0, text);
    p.text_trunc(
        FontFamily::Sans,
        24.0,
        62.0,
        &np.title,
        13.0,
        muted,
        deck_w - 48.0,
    );

    let cx = deck_w / 2.0;
    let cy = h / 2.0 - 20.0;
    // Rotation: 0.8 rad/s while playing, frozen when stopped.
    let angle = *s.elapsed.read() * 0.8 * if playing { 1.0 } else { 0.0 };

    p.fill_circle(cx, cy, RECORD_R, Color::rgb8(0x0D, 0x0D, 0x10));
    for r in [62.0, 82.0, 100.0] {
        // groove rings
        p.stroke(&Circle::new((cx, cy), r), 1.0, with_alpha(muted, 0.30));
    }
    p.fill_circle(cx, cy, LABEL_R, accent);
    // Marker dot on the label makes the rotation visible frame to frame.
    let mx = cx + 22.0 * angle.cos();
    let my = cy + 22.0 * angle.sin();
    p.fill_circle(mx, my, 4.0, with_alpha(text, 0.85));
    p.fill_circle(cx, cy, 6.0, Color::rgb8(0x0D, 0x0D, 0x10));
    p.text_centered(
        FontFamily::Sans,
        cx,
        cy + 140.0,
        "33 RPM",
        11.0,
        muted,
        120.0,
    );
    let spin_state = if playing { "SPINNING" } else { "STOPPED" };
    p.text_centered(
        FontFamily::Sans,
        cx,
        cy + 160.0,
        spin_state,
        10.0,
        muted,
        120.0,
    );

    // ---------- right content: library ----------
    let list_x = deck_w + 32.0;
    let list_r = w - 32.0;
    let entries = library_entries(s, 12);
    p.text(FontFamily::SansBold, list_x, 44.0, "Collection", 22.0, text);
    let sub = format!("{} records", entries.len());
    p.text(FontFamily::Sans, list_x, 66.0, &sub, 12.0, muted);

    let row_h = 40.0;
    let list_top = 92.0;
    let max_rows = (((top - 12.0 - list_top) / row_h) as usize).min(12).max(1);
    let list_w = list_r - list_x;
    for (i, e) in entries.iter().take(max_rows).enumerate() {
        let y = list_top + i as f64 * row_h;
        let row = Rect::new(list_x - 8.0, y, list_r, y + row_h);
        if i % 2 == 1 {
            p.fill_rrect(row, 6.0, p.overlay(0.04));
        }
        let cy_r = y + row_h / 2.0 + 4.0;
        p.text(
            FontFamily::Sans,
            list_x,
            cy_r,
            &format!("{:02}", i + 1),
            11.0,
            muted,
        );
        p.text_trunc(
            FontFamily::Sans,
            list_x + 36.0,
            cy_r,
            &e.title,
            14.0,
            text,
            list_w * 0.42,
        );
        p.text_trunc(
            FontFamily::Sans,
            list_x + list_w * 0.5,
            cy_r,
            &e.artist,
            12.0,
            muted,
            list_w * 0.32,
        );
        let dur = fmt_time(e.duration_secs);
        let dw = p.text_width(FontFamily::Sans, &dur, 12.0);
        p.text(FontFamily::Sans, list_r - dw, cy_r, &dur, 12.0, muted);
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

    // ---------- player bar over the right content ----------
    p.fill_rect(Rect::new(deck_w, top, w, h), surface);
    p.fill_rect(Rect::new(deck_w, top, w, top + 1.0), border);
    zones.extend(draw_progress(
        p,
        t,
        Rect::new(deck_w + 12.0, top, w - 8.0, top + 22.0),
        &np,
        true,
    ));

    let cover = Rect::new(deck_w + 16.0, top + 28.0, deck_w + 72.0, top + 84.0);
    p.fill_gradient_v(cover, accent, with_alpha(surface, 0.4), 8.0);
    icon_note(p, deck_w + 44.0, top + 56.0, 22.0, with_alpha(text, 0.85));
    let title_x = deck_w + 84.0;
    let geo = TransportGeometry::centered((deck_w + w) / 2.0 + 60.0, top + 58.0);
    let transport_left = geo.shuffle.x - 24.0;
    let title_w = (transport_left - 12.0 - title_x).max(80.0);
    p.text_trunc(
        FontFamily::SansBold,
        title_x,
        top + 46.0,
        &np.title,
        14.0,
        text,
        title_w,
    );
    p.text_trunc(
        FontFamily::Sans,
        title_x,
        top + 70.0,
        &np.artist,
        12.0,
        muted,
        title_w,
    );
    let (shuffle, repeat) = {
        let q = s.queue.read();
        (q.shuffle, q.repeat)
    };
    zones.extend(draw_transport(p, t, &geo, &np, shuffle, repeat));

    zones
}
