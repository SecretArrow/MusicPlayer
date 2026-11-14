//! Focus layout — immersive radial stage with a bottom transport dock.
//!
//! Mirrors the web app's `layouts/focus.tsx`: a large radial glow behind a
//! circular stage holding the album gradient, the track identity below it,
//! and a single rounded dock with the full transport cluster.

use vello::kurbo::{Circle, Point, Rect, RoundedRect};

use crate::app::AppState;
use crate::theme::Theme;
use crate::ui::painter::{icon_note, icon_volume, with_alpha, Painter};
use crate::ui::text::{prettify_id, FontFamily};
use crate::ui::{
    draw_progress, draw_theme_button, draw_transport, metrics, now_playing, HitRegion,
    TransportGeometry, UiAction,
};

/// Vertical center of the stage (leaves room for titles + dock).
fn stage_cy(h: f64) -> f64 {
    (h - 130.0) / 2.0
}

pub fn paint_background(p: &mut Painter, t: &Theme, w: f64, h: f64) {
    p.fill_rect(Rect::new(0.0, 0.0, w, h), t.background_color());
    // Radial glow behind the stage, plus faint corner washes.
    p.glow_blob(w / 2.0, stage_cy(h), h * 0.55, t.accent_color(), 0.30);
    p.glow_blob(w * 0.15, h * 0.92, 220.0, t.accent_color(), 0.12);
    p.glow_blob(w * 0.85, h * 0.92, 220.0, t.accent_color(), 0.12);
}

pub fn render(p: &mut Painter, t: &Theme, s: &AppState, w: f64, h: f64) -> Vec<HitRegion> {
    let mut zones = Vec::new();
    let np = now_playing(s);
    let (text, muted) = (t.text_color(), t.text_muted_color());
    let (accent, surface, border) = (t.accent_color(), t.surface_color(), t.border_color());
    let cx = w / 2.0;
    let scy = stage_cy(h);
    let stage_r = metrics::FOCUS_STAGE_R;

    // ---------- center stage ----------
    p.fill_circle(cx, scy, stage_r, surface);
    p.stroke(&Circle::new((cx, scy), stage_r), 1.0, border);
    // Cover disc — accent gradient look via a layered radial glow.
    p.fill_circle(cx, scy, 140.0, with_alpha(accent, 0.85));
    p.glow_blob(cx, scy, 140.0, accent, 0.55);
    icon_note(p, cx, scy, 64.0, with_alpha(t.background_color(), 0.85));

    // Breathing ring while playing.
    if np.is_playing {
        let pulse = ((*s.elapsed.read() * 2.0).sin() + 1.0) / 2.0;
        let rr = stage_r + 14.0 + pulse * 10.0;
        p.stroke(
            &Circle::new((cx, scy), rr),
            2.0,
            with_alpha(accent, 0.35 - 0.25 * pulse),
        );
    }

    // ---------- track identity ----------
    p.text_centered(
        FontFamily::SansBold,
        cx,
        scy + stage_r + 30.0,
        &np.title,
        22.0,
        text,
        w - 96.0,
    );
    p.text_centered(
        FontFamily::Sans,
        cx,
        scy + stage_r + 56.0,
        &np.artist,
        14.0,
        muted,
        w - 96.0,
    );

    // Up-next line — first queued track after the current one.
    let up_next: Option<String> = {
        let q = s.queue.read();
        q.items
            .get(q.current + 1)
            .or_else(|| q.items.first())
            .and_then(|id| {
                s.library
                    .read()
                    .get(id)
                    .map(|e| e.title.clone())
                    .or_else(|| Some(prettify_id(id)))
            })
    };
    if let Some(next_title) = up_next {
        let label = format!("UP NEXT · {}", next_title);
        p.text_centered(
            FontFamily::Sans,
            cx,
            scy + stage_r + 92.0,
            &label,
            12.0,
            muted,
            w - 200.0,
        );
    }

    // ---------- bottom dock ----------
    let dock = Rect::new(cx - 260.0, h - 96.0, cx + 260.0, h - 24.0);
    zones.extend(draw_progress(
        p,
        t,
        Rect::new(cx - 260.0, dock.y0 - 26.0, cx + 260.0, dock.y0 - 6.0),
        &np,
        true,
    ));
    p.fill_rrect(dock, 36.0, surface);
    p.stroke(&RoundedRect::from_rect(dock, 36.0), 1.0, border);

    let dock_cy = (dock.y0 + dock.y1) / 2.0;
    let geo = TransportGeometry::centered(cx, dock_cy);
    let (shuffle, repeat) = {
        let q = s.queue.read();
        (q.shuffle, q.repeat)
    };
    zones.extend(draw_transport(p, t, &geo, &np, shuffle, repeat));

    // Side controls inside the dock: mute + theme cycle.
    icon_volume(
        p,
        dock.x0 + 44.0,
        dock_cy,
        18.0,
        muted,
        *s.muted.read() || *s.volume.read() <= 0.0,
    );
    zones.push(HitRegion::new(
        Rect::new(
            dock.x0 + 26.0,
            dock_cy - 16.0,
            dock.x0 + 62.0,
            dock_cy + 16.0,
        ),
        UiAction::ToggleMute,
    ));
    zones.push(draw_theme_button(p, t, Point::new(dock.x1 - 44.0, dock_cy)));

    // Keyboard hint under the dock.
    let hint = "[SPACE] PLAY · [S] SHUFFLE · [T] THEME · [M] MUTE";
    p.text_centered(
        FontFamily::Sans,
        cx,
        h - 10.0,
        hint,
        10.0,
        with_alpha(muted, 0.8),
        420.0,
    );

    zones
}
