//! Glass layout — aurora backdrop, pill navigation, frosted now-playing panel.
//!
//! Mirrors the web app's `layouts/glass.tsx`: blurred accent glow blobs over
//! a deep background, a centered pill navigation, translucent floating
//! panels, and a compact control pill docked at the bottom.

use vello::kurbo::{Point, Rect, RoundedRect};
use vello::peniko::Color;

use crate::app::{AppState, View};
use crate::theme::Theme;
use crate::ui::painter::{icon_note, with_alpha, Painter};
use crate::ui::text::FontFamily;
use crate::ui::{
    draw_progress, draw_theme_button, draw_transport, draw_volume, now_playing, HitRegion,
    TransportGeometry, UiAction,
};

/// Top pill navigation — 96px wide pills with an 8px gap.
const PILLS: [(&str, View); 4] = [
    ("Home", View::Home),
    ("Search", View::Search),
    ("Library", View::Library),
    ("Queue", View::Queue),
];

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

pub fn paint_background(p: &mut Painter, t: &Theme, w: f64, h: f64) {
    p.fill_rect(Rect::new(0.0, 0.0, w, h), t.background_color());
    // Aurora glow blobs — accent-tinted, top-left and bottom-right.
    p.glow_blob(w * 0.22, h * 0.16, (w + h) * 0.26, t.accent_color(), 0.30);
    p.glow_blob(w * 0.82, h * 0.88, (w + h) * 0.30, t.accent_color(), 0.20);
}

pub fn render(p: &mut Painter, t: &Theme, s: &AppState, w: f64, h: f64) -> Vec<HitRegion> {
    let mut zones = Vec::new();
    let np = now_playing(s);
    let (text, muted) = (t.text_color(), t.text_muted_color());
    let (accent, surface, border) = (t.accent_color(), t.surface_color(), t.border_color());
    let active = *s.view.read();

    // ---------- centered pill navigation ----------
    let (pill_w, pill_h, gap) = (96.0, 30.0, 8.0);
    let total = PILLS.len() as f64 * pill_w + (PILLS.len() - 1) as f64 * gap;
    let x0 = (w - total) / 2.0;
    for (i, (label, view)) in PILLS.iter().enumerate() {
        let px = x0 + i as f64 * (pill_w + gap);
        let pill = Rect::new(px, 22.0, px + pill_w, 22.0 + pill_h);
        let is_active = active == *view;
        if is_active {
            p.fill_rrect(pill, pill_h / 2.0, accent);
        } else {
            p.fill_rrect(pill, pill_h / 2.0, p.overlay(0.07));
        }
        let fg = if is_active { on_accent(accent) } else { muted };
        p.text_centered(
            FontFamily::Sans,
            px + pill_w / 2.0,
            42.0,
            label,
            13.0,
            fg,
            pill_w - 12.0,
        );
        zones.push(HitRegion::new(pill, UiAction::SetView(*view)));
    }

    // ---------- frosted now-playing panel ----------
    let pw = (w - 140.0).clamp(320.0, 720.0);
    let ph = 400.0;
    let panel = Rect::new(
        (w - pw) / 2.0,
        (h - ph) / 2.0 + 6.0,
        (w + pw) / 2.0,
        (h + ph) / 2.0 + 6.0,
    );
    p.fill_rrect(panel, 24.0, with_alpha(surface, 0.72));
    p.stroke(
        &RoundedRect::from_rect(panel, 24.0),
        1.0,
        with_alpha(border, 0.9),
    );

    let cx = w / 2.0;
    // Big cover square — gradient from accent to surface.
    let cover = Rect::new(cx - 80.0, panel.y0 + 34.0, cx + 80.0, panel.y0 + 194.0);
    p.fill_gradient_v(cover, accent, surface, 16.0);
    icon_note(p, cx, panel.y0 + 114.0, 56.0, on_accent(accent));
    p.text_centered(
        FontFamily::SansBold,
        cx,
        panel.y0 + 232.0,
        &np.title,
        22.0,
        text,
        pw - 64.0,
    );
    p.text_centered(
        FontFamily::Sans,
        cx,
        panel.y0 + 258.0,
        &np.artist,
        14.0,
        muted,
        pw - 64.0,
    );
    let prog = Rect::new(
        cx - pw * 0.36,
        panel.y0 + 276.0,
        cx + pw * 0.36,
        panel.y0 + 298.0,
    );
    zones.extend(draw_progress(p, t, prog, &np, true));
    let geo = TransportGeometry::centered(cx, panel.y0 + 344.0);
    let (shuffle, repeat) = {
        let q = s.queue.read();
        (q.shuffle, q.repeat)
    };
    zones.extend(draw_transport(p, t, &geo, &np, shuffle, repeat));

    // ---------- floating bottom control pill ----------
    let pill = Rect::new(cx - 170.0, h - 66.0, cx + 170.0, h - 22.0);
    p.fill_rrect(pill, 22.0, with_alpha(surface, 0.70));
    p.stroke(
        &RoundedRect::from_rect(pill, 22.0),
        1.0,
        with_alpha(border, 0.9),
    );
    let cy_pill = (pill.y0 + pill.y1) / 2.0;
    zones.extend(draw_volume(
        p,
        t,
        Point::new(cx - 130.0, cy_pill),
        Rect::new(cx - 106.0, cy_pill - 2.5, cx - 18.0, cy_pill + 2.5),
        *s.volume.read() as f64,
        *s.muted.read(),
    ));
    let stamp = format!("{} / {}", np.position_label(), np.duration_label());
    p.text_centered(
        FontFamily::Sans,
        cx + 40.0,
        cy_pill + 4.0,
        &stamp,
        11.0,
        muted,
        96.0,
    );
    zones.push(draw_theme_button(p, t, Point::new(cx + 132.0, cy_pill)));

    zones
}
