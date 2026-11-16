//! Broadcast layout — FM studio console with a tuner dial.
//!
//! Mirrors the web app's `layouts/broadcast.tsx`: a studio header with a
//! blinking ON AIR pill, a current-track card, and a tuner console along the
//! bottom with tick marks, a needle tracking playback progress, and the
//! frequency band labels.

use vello::kurbo::{BezPath, Point, Rect};
use vello::peniko::Color;

use crate::app::AppState;
use crate::theme::Theme;
use crate::ui::painter::{icon_note, with_alpha, Painter};
use crate::ui::text::{fmt_time, FontFamily};
use crate::ui::{
    draw_progress, draw_transport, draw_volume, now_playing, HitRegion, TransportGeometry, UiAction,
};

const CONSOLE_H: f64 = 80.0;

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
    let elapsed = *s.elapsed.read();

    // ---------- studio header ----------
    p.text(
        FontFamily::SansBold,
        40.0,
        56.0,
        "MUSICPLAYER FM",
        18.0,
        text,
    );
    p.text(
        FontFamily::Sans,
        40.0,
        78.0,
        "YOUR STATION · ALL DAY · ALL NIGHT",
        11.0,
        muted,
    );
    let pill = Rect::new(w - 156.0, 34.0, w - 40.0, 62.0);
    p.fill_rrect(pill, 14.0, accent);
    // Blinking dot — alpha pulses with elapsed seconds.
    let pulse = ((elapsed * 3.0).sin() + 1.0) / 2.0;
    let dot = Color::rgb8(0x0B, 0x0B, 0x0F);
    p.fill_circle(w - 138.0, 48.0, 5.0, with_alpha(dot, 0.35 + 0.65 * pulse));
    p.text(
        FontFamily::SansBold,
        w - 124.0,
        53.0,
        "ON AIR",
        12.0,
        on_accent(accent),
    );
    zones.push(HitRegion::new(pill, UiAction::TogglePlay));

    // ---------- current track card ----------
    let card = Rect::new(40.0, 92.0, w - 40.0, 272.0);
    p.fill_rrect(card, 16.0, surface);
    p.stroke(
        &vello::kurbo::RoundedRect::from_rect(card, 16.0),
        1.0,
        border,
    );
    let cover = Rect::new(64.0, 116.0, 184.0, 236.0);
    p.fill_gradient_v(cover, accent, surface, 12.0);
    icon_note(p, 124.0, 176.0, 40.0, with_alpha(text, 0.90));
    p.text_trunc(
        FontFamily::SansBold,
        208.0,
        152.0,
        &np.title,
        20.0,
        text,
        card.x1 - 232.0,
    );
    p.text_trunc(
        FontFamily::Sans,
        208.0,
        180.0,
        &np.artist,
        14.0,
        muted,
        card.x1 - 232.0,
    );
    p.text_trunc(
        FontFamily::Sans,
        208.0,
        204.0,
        &np.album,
        12.0,
        muted,
        card.x1 - 232.0,
    );
    let side = if np.is_playing { "A" } else { "B" };
    let stamp = format!("SIDE {} · {}", side, fmt_time(np.duration));
    p.text(FontFamily::Sans, 208.0, 230.0, &stamp, 11.0, muted);
    zones.extend(draw_progress(
        p,
        t,
        Rect::new(208.0, 240.0, card.x1 - 24.0, 260.0),
        &np,
        true,
    ));

    // ---------- tuner console ----------
    let console_y = h - CONSOLE_H;
    p.fill_rect(Rect::new(0.0, console_y, w, h), surface);
    p.fill_rect(Rect::new(0.0, console_y, w, console_y + 1.0), border);
    let (x0, x1) = (48.0, (w - 470.0).max(200.0));
    let dial_y = h - 36.0;
    let mut dial = BezPath::new();
    dial.move_to((x0, dial_y));
    dial.line_to((x1, dial_y));
    p.stroke(&dial, 1.5, muted);
    // Tick marks every 40px.
    let mut tx = x0;
    while tx <= x1 {
        let mut tick = BezPath::new();
        tick.move_to((tx, dial_y - 8.0));
        tick.line_to((tx, dial_y));
        p.stroke(&tick, 1.0, with_alpha(muted, 0.8));
        tx += 40.0;
    }
    // Needle tracks playback progress — 2px wide, 40px tall.
    let nx = x0 + (x1 - x0) * np.progress();
    let mut needle = BezPath::new();
    needle.move_to((nx, dial_y - 40.0));
    needle.line_to((nx, dial_y));
    p.stroke(&needle, 2.0, accent);
    // Frequency band labels.
    for f in [88.0f64, 92.0, 96.0, 100.0, 104.0, 108.0] {
        let fx = x0 + (f - 88.0) / 20.0 * (x1 - x0);
        p.text_centered(
            FontFamily::Sans,
            fx,
            h - 16.0,
            &format!("{:.0}", f),
            10.0,
            muted,
            40.0,
        );
    }

    // Volume group between the dial and the transport cluster.
    let vol_cy = console_y + CONSOLE_H / 2.0;
    zones.extend(draw_volume(
        p,
        t,
        Point::new(w - 436.0, vol_cy),
        Rect::new(w - 418.0, vol_cy - 3.0, w - 330.0, vol_cy + 3.0),
        *s.volume.read() as f64,
        *s.muted.read(),
    ));

    // ---------- transport on the right of the console ----------
    let geo = TransportGeometry::centered(w - 190.0, console_y + CONSOLE_H / 2.0);
    let (shuffle, repeat) = {
        let q = s.queue.read();
        (q.shuffle, q.repeat)
    };
    zones.extend(draw_transport(p, t, &geo, &np, shuffle, repeat));

    zones
}
