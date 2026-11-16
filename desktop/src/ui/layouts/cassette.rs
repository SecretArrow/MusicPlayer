//! Cassette layout — retro tape deck with rotating reels and chunky keys.
//!
//! Mirrors the web app's `layouts/cassette.tsx`: a centered cassette body
//! with a darker tape window, two reels spinning with elapsed time, tape
//! lines between them, and a row of mechanical transport keys below.

use vello::kurbo::{BezPath, Rect, RoundedRect};
use vello::peniko::Color;

use crate::app::AppState;
use crate::theme::Theme;
use crate::ui::painter::{
    icon_next_path, icon_pause_path, icon_play_path, icon_prev_path, with_alpha, Painter,
};
use crate::ui::text::{fmt_time, FontFamily};
use crate::ui::{draw_progress, now_playing, HitRegion, UiAction};

const REEL_DX: f64 = 140.0;
const REEL_R: f64 = 36.0;

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

#[allow(dead_code)] // per-layout backdrop hook; called by future dispatch variants
pub fn paint_background(p: &mut Painter, t: &Theme, w: f64, h: f64) {
    // Subtle top-lit gradient wash.
    p.fill_gradient_v(
        Rect::new(0.0, 0.0, w, h),
        with_alpha(t.surface_color(), 0.55),
        t.background_color(),
        0.0,
    );
}

pub fn render(p: &mut Painter, t: &Theme, s: &AppState, w: f64, h: f64) -> Vec<HitRegion> {
    let mut zones = Vec::new();
    let np = now_playing(s);
    let (text, muted) = (t.text_color(), t.text_muted_color());
    let (accent, surface, border) = (t.accent_color(), t.surface_color(), t.border_color());
    let elapsed = *s.elapsed.read();

    let cx = w / 2.0;
    let cy = h * 0.40; // cassette body center
    let (bw, bh) = (640.0, 220.0);
    let body = Rect::new(cx - bw / 2.0, cy - bh / 2.0, cx + bw / 2.0, cy + bh / 2.0);

    // Title block above the deck.
    p.text_centered(
        FontFamily::SansBold,
        cx,
        body.y0 - 44.0,
        &np.title,
        20.0,
        text,
        w - 80.0,
    );
    p.text_centered(
        FontFamily::Sans,
        cx,
        body.y0 - 20.0,
        &np.artist,
        13.0,
        muted,
        w - 80.0,
    );

    // ---------- cassette body ----------
    p.fill_rrect(body, 12.0, surface);
    p.stroke(&RoundedRect::from_rect(body, 12.0), 1.0, border);
    p.text(
        FontFamily::Sans,
        body.x0 + 24.0,
        body.y0 + 30.0,
        "STEREO CASSETTE",
        11.0,
        muted,
    );
    let counter = format!("TC {}", fmt_time(np.position));
    p.text(
        FontFamily::Mono,
        body.x1 - 90.0,
        body.y0 + 30.0,
        &counter,
        11.0,
        muted,
    );

    // Tape window — darker inset.
    let win = Rect::new(cx - 230.0, cy - 64.0, cx + 230.0, cy + 64.0);
    p.fill_rrect(win, 10.0, with_alpha(t.background_color(), 0.85));

    // Tape lines reel-to-reel, top and bottom.
    let mut tape = BezPath::new();
    tape.move_to((cx - REEL_DX, cy - 42.0));
    tape.line_to((cx + REEL_DX, cy - 42.0));
    tape.move_to((cx - REEL_DX, cy + 42.0));
    tape.line_to((cx + REEL_DX, cy + 42.0));
    p.stroke(&tape, 2.0, with_alpha(text, 0.25));

    // Reels with rotating spokes (3 per reel).
    let spin = elapsed * 2.4;
    for side in [-1.0f64, 1.0] {
        let rcx = cx + side * REEL_DX;
        p.fill_circle(rcx, cy, REEL_R, accent);
        for i in 0..3 {
            let a = spin + i as f64 * 2.0944;
            let mut spoke = BezPath::new();
            spoke.move_to((rcx + 7.0 * a.cos(), cy + 7.0 * a.sin()));
            spoke.line_to((rcx + 30.0 * a.cos(), cy + 30.0 * a.sin()));
            p.stroke(&spoke, 3.5, with_alpha(t.background_color(), 0.9));
        }
        p.fill_circle(rcx, cy, 6.0, with_alpha(t.background_color(), 0.9));
    }

    // ---------- chunky transport keys ----------
    let keys: [(&str, UiAction); 4] = [
        ("REW", UiAction::Prev),
        ("PLAY", UiAction::TogglePlay),
        ("FF", UiAction::Next),
        ("STOP", UiAction::Stop),
    ];
    let (kw, kh, gap) = (64.0, 32.0, 14.0);
    let kx0 = cx - (4.0 * kw + 3.0 * gap) / 2.0;
    let ky = body.y1 + 26.0;
    for (i, (label, action)) in keys.iter().enumerate() {
        let kx = kx0 + i as f64 * (kw + gap);
        let key = Rect::new(kx, ky, kx + kw, ky + kh);
        let pressed = *action == UiAction::TogglePlay && np.is_playing;
        if pressed {
            p.fill_rrect(key, 6.0, accent);
        } else {
            p.fill_rrect(key, 6.0, surface);
            p.stroke(&RoundedRect::from_rect(key, 6.0), 1.0, border);
        }
        let kcx = kx + kw / 2.0;
        let kcy = ky + kh / 2.0;
        let ic = if pressed { on_accent(accent) } else { text };
        match i {
            0 => p.fill(&icon_prev_path(kcx, kcy, 14.0), ic),
            1 => {
                if np.is_playing {
                    p.fill(&icon_pause_path(kcx, kcy, 14.0), ic);
                } else {
                    p.fill(&icon_play_path(kcx, kcy, 14.0), ic);
                }
            }
            2 => p.fill(&icon_next_path(kcx, kcy, 14.0), ic),
            _ => p.fill_rect(Rect::new(kcx - 6.0, kcy - 6.0, kcx + 6.0, kcy + 6.0), ic),
        }
        p.text_centered(
            FontFamily::Sans,
            kcx,
            ky + kh + 16.0,
            label,
            10.0,
            muted,
            kw,
        );
        zones.push(HitRegion::new(key, action.clone()));
    }

    // Progress + times under the key row.
    let prog = Rect::new(cx - 260.0, ky + kh + 34.0, cx + 260.0, ky + kh + 56.0);
    zones.extend(draw_progress(p, t, prog, &np, true));

    zones
}
