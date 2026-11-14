//! Mosaic layout — 2×2 bento tile dashboard.
//!
//! Mirrors the web app's `layouts/mosaic.tsx`: four rounded tiles —
//! recently played (accent), most played, library stats, and the current
//! queue — each clickable, with per-track rows inside.

use vello::kurbo::Rect;
use vello::peniko::Color;

use crate::app::{AppState, View};
use crate::theme::Theme;
use crate::ui::painter::{with_alpha, Painter};
use crate::ui::text::{prettify_id, FontFamily};
use crate::ui::{now_playing, HitRegion, UiAction};

const MARGIN: f64 = 32.0;
const GAP: f64 = 16.0;
const LINE_H: f64 = 30.0;

/// Readable foreground for content painted on the accent color.
fn on_accent(accent: Color) -> Color {
    let (r, g, b) = (accent.r as f64, accent.g as f64, accent.b as f64);
    let lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if lum > 140.0 {
        Color::rgb8(0x0B, 0x0B, 0x0F)
    } else {
        Color::rgb8(0xFA, 0xFA, 0xFA)
    }
}

pub fn render(p: &mut Painter, t: &Theme, s: &AppState, w: f64, h: f64) -> Vec<HitRegion> {
    let mut zones = Vec::new();
    let np = now_playing(s);
    let (text, muted) = (t.text_color(), t.text_muted_color());
    let (accent, surface, border) = (t.accent_color(), t.surface_color(), t.border_color());
    let tile_w = (w - MARGIN * 2.0 - GAP) / 2.0;
    let tile_h = (h - MARGIN * 2.0 - GAP) / 2.0;
    let (rw, rh) = (MARGIN + tile_w + GAP, MARGIN + tile_h + GAP);

    let tiles = [
        Rect::new(MARGIN, MARGIN, MARGIN + tile_w, MARGIN + tile_h),
        Rect::new(rw, MARGIN, rw + tile_w, MARGIN + tile_h),
        Rect::new(MARGIN, rh, MARGIN + tile_w, rh + tile_h),
        Rect::new(rw, rh, rw + tile_w, rh + tile_h),
    ];
    let lib = s.library.read();

    // ---------- tile 1: recently played (accent) ----------
    let r = tiles[0];
    p.fill_rrect(r, 16.0, accent);
    let fg = on_accent(accent);
    p.text(
        FontFamily::SansBold,
        r.x0 + 24.0,
        r.y0 + 34.0,
        "Recently played",
        16.0,
        fg,
    );
    let recent: Vec<(String, String)> = lib
        .recently_played
        .iter()
        .take(3)
        .filter_map(|id| lib.get(id).map(|e| (id.clone(), e.title.clone())))
        .collect();
    if recent.is_empty() {
        p.text(
            FontFamily::Sans,
            r.x0 + 24.0,
            r.y0 + 64.0,
            "No plays yet — hit a track to start.",
            13.0,
            with_alpha(fg, 0.80),
        );
    }
    for (i, (id, title)) in recent.iter().enumerate() {
        let y = r.y0 + 62.0 + i as f64 * LINE_H;
        p.text_trunc(
            FontFamily::Sans,
            r.x0 + 24.0,
            y + 8.0,
            title,
            14.0,
            fg,
            tile_w - 48.0,
        );
        zones.push(HitRegion::new(
            Rect::new(r.x0 + 12.0, y, r.x1 - 12.0, y + 28.0),
            UiAction::PlayTrack(id.clone()),
        ));
    }
    zones.push(HitRegion::new(r, UiAction::SetView(View::Recent)));

    // ---------- tile 2: most played ----------
    let r = tiles[1];
    p.fill_rrect(r, 16.0, surface);
    p.stroke(&vello::kurbo::RoundedRect::from_rect(r, 16.0), 1.0, border);
    p.text(
        FontFamily::SansBold,
        r.x0 + 24.0,
        r.y0 + 34.0,
        "Most played",
        16.0,
        text,
    );
    let most = lib.most_played(3);
    if most.is_empty() {
        // Fall back to the first queue entries when no play counts exist.
        let heads: Vec<String> = s.queue.read().items.iter().take(3).cloned().collect();
        if heads.is_empty() {
            p.text(
                FontFamily::Sans,
                r.x0 + 24.0,
                r.y0 + 64.0,
                "Nothing counted yet.",
                13.0,
                muted,
            );
        }
        for (i, id) in heads.iter().enumerate() {
            let title = lib
                .get(id)
                .map(|e| e.title.clone())
                .unwrap_or_else(|| prettify_id(id));
            let y = r.y0 + 62.0 + i as f64 * LINE_H;
            p.text_trunc(
                FontFamily::Sans,
                r.x0 + 24.0,
                y + 8.0,
                &title,
                14.0,
                text,
                tile_w - 48.0,
            );
            zones.push(HitRegion::new(
                Rect::new(r.x0 + 12.0, y, r.x1 - 12.0, y + 28.0),
                UiAction::PlayTrack(id.clone()),
            ));
        }
    } else {
        for (i, (e, count)) in most.iter().enumerate() {
            let y = r.y0 + 62.0 + i as f64 * LINE_H;
            p.text_trunc(
                FontFamily::Sans,
                r.x0 + 24.0,
                y + 8.0,
                &e.title,
                14.0,
                text,
                tile_w - 100.0,
            );
            let cl = format!("x{}", count);
            let cl_w = p.text_width(FontFamily::Sans, &cl, 12.0);
            p.text(
                FontFamily::Sans,
                r.x1 - 24.0 - cl_w,
                y + 8.0,
                &cl,
                12.0,
                muted,
            );
            zones.push(HitRegion::new(
                Rect::new(r.x0 + 12.0, y, r.x1 - 12.0, y + 28.0),
                UiAction::PlayTrack(e.id.clone()),
            ));
        }
    }
    zones.push(HitRegion::new(r, UiAction::SetView(View::Stats)));

    // ---------- tile 3: library ----------
    let r = tiles[2];
    p.fill_rrect(r, 16.0, surface);
    p.stroke(&vello::kurbo::RoundedRect::from_rect(r, 16.0), 1.0, border);
    p.text(
        FontFamily::SansBold,
        r.x0 + 24.0,
        r.y0 + 34.0,
        "Library",
        16.0,
        text,
    );
    let count = lib.entries.len();
    p.text(
        FontFamily::SansBold,
        r.x0 + 24.0,
        r.y0 + 84.0,
        &count.to_string(),
        34.0,
        text,
    );
    p.text(
        FontFamily::Sans,
        r.x0 + 24.0,
        r.y0 + 106.0,
        "tracks indexed",
        12.0,
        muted,
    );
    let genres = lib.genres();
    let line = if genres.is_empty() {
        "No genres scanned yet".to_string()
    } else {
        genres.join(" · ")
    };
    p.text_trunc(
        FontFamily::Sans,
        r.x0 + 24.0,
        r.y0 + 134.0,
        &line,
        13.0,
        muted,
        tile_w - 48.0,
    );
    zones.push(HitRegion::new(r, UiAction::SetView(View::Library)));

    // ---------- tile 4: queue ----------
    let r = tiles[3];
    p.fill_rrect(r, 16.0, surface);
    p.stroke(&vello::kurbo::RoundedRect::from_rect(r, 16.0), 1.0, border);
    p.text(
        FontFamily::SansBold,
        r.x0 + 24.0,
        r.y0 + 34.0,
        "Queue",
        16.0,
        text,
    );
    let upcoming: Vec<String> = {
        let q = s.queue.read();
        q.items.iter().skip(q.current).take(3).cloned().collect()
    };
    if upcoming.is_empty() && np.id.is_none() {
        p.text(
            FontFamily::Sans,
            r.x0 + 24.0,
            r.y0 + 64.0,
            "Queue empty — tap a track to start.",
            13.0,
            muted,
        );
    }
    for (i, id) in upcoming.iter().enumerate() {
        let title = lib
            .get(id)
            .map(|e| e.title.clone())
            .unwrap_or_else(|| prettify_id(id));
        let y = r.y0 + 62.0 + i as f64 * LINE_H;
        let color = if i == 0 { accent } else { muted };
        p.text_trunc(
            FontFamily::Sans,
            r.x0 + 24.0,
            y + 8.0,
            &title,
            14.0,
            color,
            tile_w - 48.0,
        );
        zones.push(HitRegion::new(
            Rect::new(r.x0 + 12.0, y, r.x1 - 12.0, y + 28.0),
            UiAction::PlayTrack(id.clone()),
        ));
    }
    zones.push(HitRegion::new(r, UiAction::SetView(View::Queue)));

    zones
}
