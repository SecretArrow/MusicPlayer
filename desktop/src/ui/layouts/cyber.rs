//! Cyber layout — neon HUD frame, scanlines, segmented transport.
//!
//! Mirrors the web app's `layouts/cyber.tsx`: an accent-stroked HUD frame
//! with clipped corners, faint scanlines, monospace uppercase labels, a
//! 20-segment progress readout, and bracketed transport controls.

use vello::kurbo::{BezPath, Rect};

use crate::app::AppState;
use crate::theme::Theme;
use crate::ui::painter::{with_alpha, Painter};
use crate::ui::text::{fmt_time, FontFamily};
use crate::ui::{now_playing, HitRegion, UiAction};
use audio_core::LibraryEntry;

const INSET: f64 = 32.0;
const SEGS: usize = 20;

pub fn paint_background(p: &mut Painter, t: &Theme, w: f64, h: f64) {
    let bg = t.background_color();
    p.fill_rect(Rect::new(0.0, 0.0, w, h), bg);

    // HUD frame with corner clips — triangles in background color cut the
    // stroke away at each corner.
    let frame = Rect::new(INSET, INSET, w - INSET, h - INSET);
    p.stroke(&frame, 1.5, with_alpha(t.accent_color(), 0.55));
    let clip = 22.0;
    for (x, y, dx, dy) in [
        (INSET, INSET, 1.0, 1.0),
        (w - INSET, INSET, -1.0, 1.0),
        (INSET, h - INSET, 1.0, -1.0),
        (w - INSET, h - INSET, -1.0, -1.0),
    ] {
        let mut tri = BezPath::new();
        tri.move_to((x, y));
        tri.line_to((x + dx * clip, y));
        tri.line_to((x, y + dy * clip));
        tri.close_path();
        p.fill(&tri, bg);
    }

    // Scanlines — 1px overlay line every 4px across the window.
    let mut y = 0.0;
    while y < h {
        p.fill_rect(Rect::new(0.0, y, w, y + 1.0), p.overlay(0.04));
        y += 4.0;
    }
}

pub fn render(p: &mut Painter, t: &Theme, s: &AppState, w: f64, h: f64) -> Vec<HitRegion> {
    let mut zones = Vec::new();
    let np = now_playing(s);
    let (text, muted) = (t.text_color(), t.text_muted_color());
    let (accent, border) = (t.accent_color(), t.border_color());
    let mono = FontFamily::Mono;
    let (x0, x1) = (INSET + 32.0, w - INSET - 32.0);

    // Header labels.
    let (cur, total) = {
        let q = s.queue.read();
        (q.current + 1, q.items.len())
    };
    p.text(mono, x0, 84.0, "NOW PLAYING", 12.0, accent);
    let track_label = format!("TRACK {:02}/{:02}", if total == 0 { 0 } else { cur }, total);
    let tl_w = p.text_width(mono, &track_label, 12.0);
    p.text(mono, x1 - tl_w, 84.0, &track_label, 12.0, muted);

    // Big uppercase title + artist.
    let title = np.title.to_uppercase();
    p.text_trunc(mono, x0, 150.0, &title, 30.0, text, x1 - x0);
    let artist = np.artist.to_uppercase();
    p.text_trunc(mono, x0, 182.0, &artist, 14.0, muted, x1 - x0);

    // Segmented progress — 20 bars, filled ones in accent.
    let gap = 6.0;
    let seg_w = ((x1 - x0) - (SEGS - 1) as f64 * gap) / SEGS as f64;
    let filled = (np.progress() * SEGS as f64).ceil() as usize;
    for i in 0..SEGS {
        let sx = x0 + i as f64 * (seg_w + gap);
        let color = if i < filled {
            accent
        } else {
            with_alpha(text, 0.12)
        };
        p.fill_rect(Rect::new(sx, 240.0, sx + seg_w, 258.0), color);
    }
    zones.push(HitRegion::new(
        Rect::new(x0, 232.0, x1, 266.0),
        UiAction::Seek,
    ));
    p.text(mono, x0, 290.0, &np.position_label(), 11.0, muted);
    let dur = np.duration_label();
    let dur_w = p.text_width(mono, &dur, 11.0);
    p.text(mono, x1 - dur_w, 290.0, &dur, 11.0, muted);

    // Status line.
    let status = format!(
        "[{}] {} / {}",
        if np.is_playing { "PLAYING" } else { "PAUSED" },
        fmt_time(np.position),
        fmt_time(np.duration)
    );
    p.text(mono, x0, 330.0, &status, 12.0, muted);

    // Bracketed transport controls with outlined hit zones.
    let controls: [(&str, UiAction, bool); 3] = [
        ("[PREV]", UiAction::Prev, false),
        ("[PLAY]", UiAction::TogglePlay, true),
        ("[NEXT]", UiAction::Next, false),
    ];
    let (cw, cgap) = (96.0, 24.0);
    let bx0 = w / 2.0 - (3.0 * cw + 2.0 * cgap) / 2.0;
    for (i, (label, action, hot)) in controls.iter().enumerate() {
        let bx = bx0 + i as f64 * (cw + cgap);
        let rect = Rect::new(bx, 362.0, bx + cw, 398.0);
        let color = if *hot { accent } else { muted };
        p.text_centered(mono, bx + cw / 2.0, 386.0, label, 14.0, color, cw - 8.0);
        p.stroke(&rect, 1.0, with_alpha(border, 0.9));
        zones.push(HitRegion::new(rect, action.clone()));
    }

    // Quick library index — first tracks as selectable rows.
    let rows_y = 430.0;
    let entries: Vec<LibraryEntry> = s
        .library
        .read()
        .sorted_by_title()
        .into_iter()
        .take(6)
        .cloned()
        .collect();
    let max_rows = (((h - 100.0 - rows_y) / 30.0) as usize).min(6);
    for (i, e) in entries.iter().take(max_rows).enumerate() {
        let y = rows_y + i as f64 * 30.0;
        p.text_trunc(
            mono,
            x0,
            y + 8.0,
            &format!("{:02}", i + 1),
            11.0,
            muted,
            40.0,
        );
        p.text_trunc(
            mono,
            x0 + 48.0,
            y + 8.0,
            &e.title.to_uppercase(),
            12.0,
            text,
            (x1 - x0) * 0.48,
        );
        p.text_trunc(
            mono,
            x0 + (x1 - x0) * 0.55,
            y + 8.0,
            &e.artist.to_uppercase(),
            11.0,
            muted,
            (x1 - x0) * 0.30,
        );
        zones.push(HitRegion::new(
            Rect::new(x0, y, x1, y + 30.0),
            UiAction::PlayTrack(e.id.clone()),
        ));
    }
    if entries.is_empty() {
        p.text(
            mono,
            x0,
            rows_y + 14.0,
            "LIBRARY EMPTY — AWAITING INPUT",
            11.0,
            muted,
        );
    }

    // Footer hints.
    p.text(
        mono,
        x0,
        h - 56.0,
        &format!("[{}]", t.key.to_uppercase()),
        11.0,
        muted,
    );
    let hint = "[T] THEME · [SPACE] PLAY";
    let hint_w = p.text_width(mono, hint, 11.0);
    p.text(mono, x1 - hint_w, h - 56.0, hint, 11.0, muted);

    zones
}
