//! Painter — a thin convenience layer over `vello::Scene` with the drawing
//! primitives + vector icons used by the layouts.

#![allow(dead_code)] // icon library consumed by layouts incrementally

use vello::kurbo::{Affine, BezPath, Circle, Rect, RoundedRect, Stroke};
use vello::peniko::{Brush, Color, Fill, Gradient};
use vello::Scene;

use super::text::{shape, FontBook, FontFamily};

/// Everything a layout renderer needs to draw.
pub struct Painter<'s, 'f> {
    pub scene: &'s mut Scene,
    pub fonts: &'f FontBook,
    /// Global transform applied to every primitive (DPI scaling).
    pub transform: Affine,
}

impl<'s, 'f> Painter<'s, 'f> {
    pub fn new(scene: &'s mut Scene, fonts: &'f FontBook, transform: Affine) -> Self {
        Self {
            scene,
            fonts,
            transform,
        }
    }

    // ---------- shapes ----------

    pub fn fill(&mut self, shape: &impl vello::kurbo::Shape, color: Color) {
        self.scene.fill(
            Fill::NonZero,
            self.transform,
            &Brush::Solid(color),
            None,
            shape,
        );
    }

    pub fn fill_rect(&mut self, rect: Rect, color: Color) {
        self.fill(&rect, color);
    }

    pub fn fill_rrect(&mut self, rect: Rect, radius: f64, color: Color) {
        self.fill(&RoundedRect::from_rect(rect, radius), color);
    }

    pub fn fill_circle(&mut self, cx: f64, cy: f64, r: f64, color: Color) {
        self.fill(&Circle::new((cx, cy), r), color);
    }

    pub fn stroke(&mut self, shape: &impl vello::kurbo::Shape, width: f64, color: Color) {
        self.scene.stroke(
            &Stroke::new(width),
            self.transform,
            &Brush::Solid(color),
            None,
            shape,
        );
    }

    /// Vertical linear gradient fill (common panel/background wash).
    pub fn fill_gradient_v(&mut self, rect: Rect, top: Color, bottom: Color, radius: f64) {
        let gradient = Gradient::new_linear((0.0, rect.y0), (0.0, rect.y1))
            .with_stops([(0.0f32, top), (1.0f32, bottom)]);
        self.scene.fill(
            Fill::NonZero,
            self.transform,
            &gradient,
            None,
            &RoundedRect::from_rect(rect, radius),
        );
    }

    /// Radial "glow blob" — approximation of the web app's blurred accent divs.
    pub fn glow_blob(&mut self, cx: f64, cy: f64, r: f64, color: Color, alpha: f64) {
        let center = with_alpha(color, alpha);
        let edge = with_alpha(color, 0.0);
        let gradient =
            Gradient::new_radial((cx, cy), r as f32).with_stops([(0.0f32, center), (1.0f32, edge)]);
        self.scene.fill(
            Fill::NonZero,
            self.transform,
            &gradient,
            None,
            &Circle::new((cx, cy), r),
        );
    }

    // ---------- text ----------

    /// Draw text with the baseline at (`x`, `y`). Returns the advance width.
    /// Skips silently when the family is unavailable.
    #[allow(clippy::too_many_arguments)]
    pub fn text(
        &mut self,
        family: FontFamily,
        x: f64,
        y: f64,
        text: &str,
        size: f32,
        color: Color,
    ) -> f64 {
        let Some(handle) = self.fonts.handle(family) else {
            return 0.0;
        };
        let glyphs = shape(handle, text, size);
        if glyphs.is_empty() {
            return 0.0;
        }
        let width = super::text::measure(handle, text, size) as f64;
        self.scene
            .draw_glyphs(&handle.font)
            .transform(self.transform * Affine::translate((x, y)))
            .font_size(size)
            .brush(&Brush::Solid(color))
            .draw(Fill::NonZero, glyphs.into_iter());
        width
    }

    /// Draw text clipped to `max_width` (truncates with an ellipsis).
    /// Returns the drawn width.
    #[allow(clippy::too_many_arguments)]
    pub fn text_trunc(
        &mut self,
        family: FontFamily,
        x: f64,
        y: f64,
        text: &str,
        size: f32,
        color: Color,
        max_width: f64,
    ) -> f64 {
        let Some(handle) = self.fonts.handle(family) else {
            return 0.0;
        };
        let fitted = super::text::truncate_to_width(handle, text, size, max_width as f32);
        self.text(family, x, y, &fitted, size, color)
    }

    pub fn text_width(&self, family: FontFamily, text: &str, size: f32) -> f64 {
        self.fonts
            .handle(family)
            .map(|h| super::text::measure(h, text, size) as f64)
            .unwrap_or(0.0)
    }

    /// Horizontally centered text; `cx` is the center line.
    #[allow(clippy::too_many_arguments)]
    pub fn text_centered(
        &mut self,
        family: FontFamily,
        cx: f64,
        y: f64,
        text: &str,
        size: f32,
        color: Color,
        max_width: f64,
    ) {
        let w = self.text_width(family, text, size);
        let x = cx - (w.min(max_width)) / 2.0;
        self.text_trunc(family, x, y, text, size, color, max_width);
    }

    // ---------- derived colors ----------

    pub fn overlay(&self, alpha: f64) -> Color {
        Color::rgba8(255, 255, 255, alpha_channel(alpha))
    }

    pub fn darken(&self, base: Color, alpha: f64) -> Color {
        with_alpha(base, alpha)
    }
}

/// alpha component (0..255) from a 0..1 factor
pub fn alpha_channel(alpha: f64) -> u8 {
    (alpha.clamp(0.0, 1.0) * 255.0).round() as u8
}

/// Recolor an opaque color with a new alpha channel.
pub fn with_alpha(color: Color, alpha: f64) -> Color {
    Color::rgba8(color.r, color.g, color.b, alpha_channel(alpha))
}

// ---------- icons ----------
//
// All icons are drawn inside a square of side `s` centered at (cx, cy).
// They are pure functions of (painter, center, size, color) so tests can
// inspect the generated paths via `icon_path_*` helpers below.

/// Play — filled triangle pointing right.
pub fn icon_play_path(cx: f64, cy: f64, s: f64) -> BezPath {
    let mut p = BezPath::new();
    p.move_to((cx - 0.36 * s, cy - 0.46 * s));
    p.line_to((cx - 0.36 * s, cy + 0.46 * s));
    p.line_to((cx + 0.46 * s, cy));
    p.close_path();
    p
}

/// Pause — two vertical bars.
pub fn icon_pause_path(cx: f64, cy: f64, s: f64) -> BezPath {
    let mut p = BezPath::new();
    p.move_to((cx - 0.34 * s, cy - 0.45 * s));
    p.line_to((cx - 0.12 * s, cy - 0.45 * s));
    p.line_to((cx - 0.12 * s, cy + 0.45 * s));
    p.line_to((cx - 0.34 * s, cy + 0.45 * s));
    p.close_path();
    p.move_to((cx + 0.12 * s, cy - 0.45 * s));
    p.line_to((cx + 0.34 * s, cy - 0.45 * s));
    p.line_to((cx + 0.34 * s, cy + 0.45 * s));
    p.line_to((cx + 0.12 * s, cy + 0.45 * s));
    p.close_path();
    p
}

/// Skip-forward — two right-pointing triangles.
pub fn icon_next_path(cx: f64, cy: f64, s: f64) -> BezPath {
    let mut p = BezPath::new();
    for dx in [-0.42f64, 0.02] {
        p.move_to((cx + dx * s, cy - 0.38 * s));
        p.line_to((cx + (dx + 0.38) * s, cy));
        p.line_to((cx + dx * s, cy + 0.38 * s));
        p.close_path();
    }
    p
}

/// Skip-back — two left-pointing triangles.
pub fn icon_prev_path(cx: f64, cy: f64, s: f64) -> BezPath {
    let mut p = BezPath::new();
    for dx in [0.42f64, -0.02] {
        p.move_to((cx + dx * s, cy - 0.38 * s));
        p.line_to((cx + (dx - 0.38) * s, cy));
        p.line_to((cx + dx * s, cy + 0.38 * s));
        p.close_path();
    }
    p
}

/// Shuffle — two crossing lines with arrowheads pointing out to the right.
pub fn icon_shuffle(p: &mut Painter, cx: f64, cy: f64, s: f64, color: Color) {
    let mut cross = BezPath::new();
    cross.move_to((cx - 0.45 * s, cy - 0.22 * s));
    cross.line_to((cx + 0.45 * s, cy + 0.22 * s));
    cross.move_to((cx - 0.45 * s, cy + 0.22 * s));
    cross.line_to((cx + 0.45 * s, cy - 0.22 * s));
    p.stroke(&cross, 0.08 * s, color);
    for (x, y, dir) in [
        (cx + 0.45 * s, cy + 0.22 * s, 1.0),
        (cx + 0.45 * s, cy - 0.22 * s, -1.0),
    ] {
        let mut head = BezPath::new();
        head.move_to((x - 0.14 * s, y - 0.12 * s * dir));
        head.line_to((x + 0.06 * s, y));
        head.line_to((x - 0.14 * s, y + 0.12 * s * dir));
        head.close_path();
        p.fill(&head, color);
    }
}

/// Repeat — two arcs chasing each other with arrowheads.
pub fn icon_repeat(p: &mut Painter, cx: f64, cy: f64, s: f64, color: Color) {
    let r = 0.34 * s;
    let mut arcs = BezPath::new();
    // Top arc (left → right).
    arcs.move_to((cx - r, cy));
    arcs.curve_to(
        (cx - r, cy - 1.35 * r),
        (cx + r, cy - 1.35 * r),
        (cx + r, cy),
    );
    // Bottom arc (right → left).
    arcs.move_to((cx + r, cy));
    arcs.curve_to(
        (cx + r, cy + 1.35 * r),
        (cx - r, cy + 1.35 * r),
        (cx - r, cy),
    );
    p.stroke(&arcs, 0.08 * s, color);
    let mut head_r = BezPath::new();
    head_r.move_to((cx + r - 0.16 * s, cy - 0.2 * s));
    head_r.line_to((cx + r + 0.08 * s, cy - 0.04 * s));
    head_r.line_to((cx + r - 0.2 * s, cy + 0.06 * s));
    head_r.close_path();
    p.fill(&head_r, color);
    let mut head_l = BezPath::new();
    head_l.move_to((cx - r + 0.16 * s, cy + 0.2 * s));
    head_l.line_to((cx - r - 0.08 * s, cy + 0.04 * s));
    head_l.line_to((cx - r + 0.2 * s, cy - 0.06 * s));
    head_l.close_path();
    p.fill(&head_l, color);
}

/// Heart — two cubic lobes meeting in a point (filled).
pub fn icon_heart_path(cx: f64, cy: f64, s: f64) -> BezPath {
    let mut p = BezPath::new();
    p.move_to((cx, cy + 0.4 * s));
    p.curve_to(
        (cx - 0.62 * s, cy - 0.02 * s),
        (cx - 0.55 * s, cy - 0.5 * s),
        (cx - 0.24 * s, cy - 0.5 * s),
    );
    p.curve_to(
        (cx - 0.1 * s, cy - 0.5 * s),
        (cx, cy - 0.4 * s),
        (cx, cy - 0.28 * s),
    );
    p.curve_to(
        (cx, cy - 0.4 * s),
        (cx + 0.1 * s, cy - 0.5 * s),
        (cx + 0.24 * s, cy - 0.5 * s),
    );
    p.curve_to(
        (cx + 0.55 * s, cy - 0.5 * s),
        (cx + 0.62 * s, cy - 0.02 * s),
        (cx, cy + 0.4 * s),
    );
    p.close_path();
    p
}

/// Volume — speaker body + sound waves (or an X when muted).
pub fn icon_volume(p: &mut Painter, cx: f64, cy: f64, s: f64, color: Color, muted: bool) {
    let mut body = BezPath::new();
    body.move_to((cx - 0.44 * s, cy - 0.14 * s));
    body.line_to((cx - 0.2 * s, cy - 0.14 * s));
    body.line_to((cx + 0.02 * s, cy - 0.4 * s));
    body.line_to((cx + 0.02 * s, cy + 0.4 * s));
    body.line_to((cx - 0.2 * s, cy + 0.14 * s));
    body.line_to((cx - 0.44 * s, cy + 0.14 * s));
    body.close_path();
    p.fill(&body, color);
    if muted {
        let mut xmark = BezPath::new();
        xmark.move_to((cx + 0.18 * s, cy - 0.18 * s));
        xmark.line_to((cx + 0.46 * s, cy + 0.18 * s));
        xmark.move_to((cx + 0.46 * s, cy - 0.18 * s));
        xmark.line_to((cx + 0.18 * s, cy + 0.18 * s));
        p.stroke(&xmark, 0.07 * s, color);
    } else {
        let wave_r = 0.2 * s;
        let mut waves = BezPath::new();
        waves.move_to((cx + 0.14 * s, cy - 0.22 * s));
        waves.curve_to(
            (cx + 0.14 * s + wave_r, cy - 0.1 * s),
            (cx + 0.14 * s + wave_r, cy + 0.1 * s),
            (cx + 0.14 * s, cy + 0.22 * s),
        );
        p.stroke(&waves, 0.06 * s, color);
        let wave_r2 = 0.34 * s;
        let mut waves2 = BezPath::new();
        waves2.move_to((cx + 0.14 * s, cy - 0.32 * s));
        waves2.curve_to(
            (cx + 0.14 * s + wave_r2, cy - 0.14 * s),
            (cx + 0.14 * s + wave_r2, cy + 0.14 * s),
            (cx + 0.14 * s, cy + 0.32 * s),
        );
        p.stroke(&waves2, 0.06 * s, color);
    }
}

/// Home — roof triangle + body outline + door.
pub fn icon_home(p: &mut Painter, cx: f64, cy: f64, s: f64, color: Color) {
    let mut roof = BezPath::new();
    roof.move_to((cx - 0.42 * s, cy - 0.02 * s));
    roof.line_to((cx, cy - 0.42 * s));
    roof.line_to((cx + 0.42 * s, cy - 0.02 * s));
    p.stroke(&roof, 0.08 * s, color);
    let mut body = BezPath::new();
    body.move_to((cx - 0.3 * s, cy - 0.12 * s));
    body.line_to((cx - 0.3 * s, cy + 0.42 * s));
    body.line_to((cx + 0.3 * s, cy + 0.42 * s));
    body.line_to((cx + 0.3 * s, cy - 0.12 * s));
    p.stroke(&body, 0.08 * s, color);
    p.fill_rect(
        Rect::new(cx - 0.08 * s, cy + 0.14 * s, cx + 0.08 * s, cy + 0.42 * s),
        color,
    );
}

/// Search — magnifier.
pub fn icon_search(p: &mut Painter, cx: f64, cy: f64, s: f64, color: Color) {
    p.stroke(
        &Circle::new((cx - 0.1 * s, cy - 0.1 * s), 0.3 * s),
        0.08 * s,
        color,
    );
    let mut handle = BezPath::new();
    handle.move_to((cx + 0.12 * s, cy + 0.12 * s));
    handle.line_to((cx + 0.4 * s, cy + 0.4 * s));
    p.stroke(&handle, 0.08 * s, color);
}

/// Library — three books on a shelf.
pub fn icon_library(p: &mut Painter, cx: f64, cy: f64, s: f64, color: Color) {
    for (dx, h) in [(-0.3f64, 0.66), (0.0, 0.78), (0.3, 0.56)] {
        p.fill_rect(
            Rect::new(
                cx + dx * s - 0.08 * s,
                cy - (h / 2.0) * s,
                cx + dx * s + 0.08 * s,
                cy + (h / 2.0) * s,
            ),
            color,
        );
    }
}

/// Recent — clock face with hands.
pub fn icon_recent(p: &mut Painter, cx: f64, cy: f64, s: f64, color: Color) {
    p.stroke(&Circle::new((cx, cy), 0.42 * s), 0.08 * s, color);
    let mut hands = BezPath::new();
    hands.move_to((cx, cy));
    hands.line_to((cx, cy - 0.26 * s));
    hands.move_to((cx, cy));
    hands.line_to((cx + 0.2 * s, cy + 0.06 * s));
    p.stroke(&hands, 0.07 * s, color);
}

/// Genres — audio level bars.
pub fn icon_genres(p: &mut Painter, cx: f64, cy: f64, s: f64, color: Color) {
    for (i, h) in [0.5f64, 0.9, 0.7, 1.0].into_iter().enumerate() {
        let x = cx + (i as f64 - 1.5) * 0.24 * s;
        p.fill_rect(
            Rect::new(
                x - 0.07 * s,
                cy - h * 0.22 * s,
                x + 0.07 * s,
                cy + h * 0.22 * s,
            ),
            color,
        );
    }
}

/// Stats — ascending bar chart.
pub fn icon_stats(p: &mut Painter, cx: f64, cy: f64, s: f64, color: Color) {
    for (i, h) in [0.4f64, 0.7, 1.0].into_iter().enumerate() {
        let x = cx + (i as f64 - 1.0) * 0.3 * s;
        p.fill_rect(
            Rect::new(
                x - 0.09 * s,
                cy + 0.4 * s - h * 0.8 * s,
                x + 0.09 * s,
                cy + 0.4 * s,
            ),
            color,
        );
    }
}

/// Plus.
pub fn icon_plus(p: &mut Painter, cx: f64, cy: f64, s: f64, color: Color) {
    let mut plus = BezPath::new();
    plus.move_to((cx - 0.35 * s, cy));
    plus.line_to((cx + 0.35 * s, cy));
    plus.move_to((cx, cy - 0.35 * s));
    plus.line_to((cx, cy + 0.35 * s));
    p.stroke(&plus, 0.09 * s, color);
}

/// Queue — list with indent.
pub fn icon_queue(p: &mut Painter, cx: f64, cy: f64, s: f64, color: Color) {
    let mut lines = BezPath::new();
    for (i, len) in [1.0f64, 1.0, 0.6].into_iter().enumerate() {
        let y = cy + (i as f64 - 1.0) * 0.26 * s;
        lines.move_to((cx - 0.42 * s, y));
        lines.line_to((cx - 0.42 * s + 0.84 * s * len, y));
    }
    p.stroke(&lines, 0.08 * s, color);
}

/// Music note (single quaver).
pub fn icon_note(p: &mut Painter, cx: f64, cy: f64, s: f64, color: Color) {
    p.fill_circle(cx - 0.16 * s, cy + 0.28 * s, 0.16 * s, color);
    let mut stem = BezPath::new();
    stem.move_to((cx, cy + 0.28 * s));
    stem.line_to((cx, cy - 0.42 * s));
    stem.move_to((cx, cy - 0.42 * s));
    stem.curve_to(
        (cx + 0.16 * s, cy - 0.38 * s),
        (cx + 0.26 * s, cy - 0.3 * s),
        (cx + 0.3 * s, cy - 0.18 * s),
    );
    p.stroke(&stem, 0.09 * s, color);
}

/// Palette — theme picker dot cluster.
pub fn icon_palette(p: &mut Painter, cx: f64, cy: f64, s: f64, color: Color, accent: Color) {
    p.stroke(&Circle::new((cx, cy), 0.4 * s), 0.08 * s, color);
    p.fill_circle(cx - 0.14 * s, cy - 0.1 * s, 0.09 * s, color);
    p.fill_circle(cx + 0.14 * s, cy - 0.1 * s, 0.09 * s, accent);
    p.fill_circle(cx, cy + 0.16 * s, 0.09 * s, color);
}

/// Disc — record/album glyph.
pub fn icon_disc(p: &mut Painter, cx: f64, cy: f64, s: f64, color: Color) {
    p.stroke(&Circle::new((cx, cy), 0.42 * s), 0.08 * s, color);
    p.stroke(&Circle::new((cx, cy), 0.24 * s), 0.06 * s, color);
    p.fill_circle(cx, cy, 0.08 * s, color);
}

/// Terminal — HUD prompt box.
pub fn icon_terminal(p: &mut Painter, cx: f64, cy: f64, s: f64, color: Color) {
    p.stroke(
        &RoundedRect::from_rect(
            Rect::new(cx - 0.42 * s, cy - 0.34 * s, cx + 0.42 * s, cy + 0.34 * s),
            0.08 * s,
        ),
        0.07 * s,
        color,
    );
    let mut prompt = BezPath::new();
    prompt.move_to((cx - 0.24 * s, cy - 0.1 * s));
    prompt.line_to((cx - 0.08 * s, cy + 0.04 * s));
    prompt.line_to((cx - 0.24 * s, cy + 0.18 * s));
    p.stroke(&prompt, 0.07 * s, color);
    let mut cursor = BezPath::new();
    cursor.move_to((cx + 0.06 * s, cy + 0.18 * s));
    cursor.line_to((cx + 0.26 * s, cy + 0.18 * s));
    p.stroke(&cursor, 0.07 * s, color);
}

/// Sliders — EQ glyph.
pub fn icon_sliders(p: &mut Painter, cx: f64, cy: f64, s: f64, color: Color) {
    const DOT_OFFSETS: [f64; 3] = [-0.2, 0.12, -0.05];
    let mut rails = BezPath::new();
    for (i, dx) in DOT_OFFSETS.into_iter().enumerate() {
        let y = cy + (i as f64 - 1.0) * 0.26 * s;
        rails.move_to((cx - 0.42 * s, y));
        rails.line_to((cx + 0.42 * s, y));
        p.fill_circle(cx + dx * s, y, 0.1 * s, color);
    }
    p.stroke(&rails, 0.07 * s, color);
}

/// Radio — broadcast masthead glyph.
pub fn icon_radio(p: &mut Painter, cx: f64, cy: f64, s: f64, color: Color) {
    p.stroke(
        &RoundedRect::from_rect(
            Rect::new(cx - 0.42 * s, cy - 0.1 * s, cx + 0.42 * s, cy + 0.42 * s),
            0.1 * s,
        ),
        0.07 * s,
        color,
    );
    p.fill_circle(cx + 0.2 * s, cy + 0.16 * s, 0.12 * s, color);
    let mut antenna = BezPath::new();
    antenna.move_to((cx - 0.3 * s, cy - 0.1 * s));
    antenna.line_to((cx + 0.34 * s, cy - 0.46 * s));
    p.stroke(&antenna, 0.07 * s, color);
}

/// Maximize — two diagonal arrows pointing out.
pub fn icon_maximize(p: &mut Painter, cx: f64, cy: f64, s: f64, color: Color) {
    let mut arrows = BezPath::new();
    arrows.move_to((cx - 0.34 * s, cy + 0.34 * s));
    arrows.line_to((cx + 0.34 * s, cy - 0.34 * s));
    arrows.move_to((cx + 0.1 * s, cy - 0.34 * s));
    arrows.line_to((cx + 0.34 * s, cy - 0.34 * s));
    arrows.line_to((cx + 0.34 * s, cy - 0.1 * s));
    arrows.move_to((cx - 0.1 * s, cy + 0.34 * s));
    arrows.line_to((cx - 0.34 * s, cy + 0.34 * s));
    arrows.line_to((cx - 0.34 * s, cy + 0.1 * s));
    p.stroke(&arrows, 0.08 * s, color);
}

/// Heart icon with filled state.
pub fn icon_heart(p: &mut Painter, cx: f64, cy: f64, s: f64, color: Color, filled: bool) {
    let path = icon_heart_path(cx, cy, s);
    if filled {
        p.fill(&path, color);
    } else {
        p.stroke(&path, 0.08 * s, color);
    }
}

/// Set of icons accepted by [draw_action_button] — buttons that emit
/// arbitrary UiActions rather than navigating to a View. Mirrors the small
/// subset of icons that show up in the toolbar.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ActionIcon {
    /// Equalizer panel toggle.
    Sliders,
    /// Folder import (library scan).
    Folder,
    /// Queue panel toggle.
    Queue,
    /// Generic plus (create playlist).
    Plus,
}

/// Dispatch helper: draw the requested [ActionIcon] at the given position.
pub fn draw_action_icon(
    p: &mut Painter,
    icon: ActionIcon,
    cx: f64,
    cy: f64,
    s: f64,
    color: Color,
) {
    match icon {
        ActionIcon::Sliders => icon_sliders(p, cx, cy, s, color),
        ActionIcon::Queue => icon_queue(p, cx, cy, s, color),
        ActionIcon::Plus => icon_plus(p, cx, cy, s, color),
        ActionIcon::Folder => icon_folder(p, cx, cy, s, color),
    }
}

/// Folder glyph — a tabbed folder with a horizontal crease. Used for the
/// import-folder button.
pub fn icon_folder(p: &mut Painter, cx: f64, cy: f64, s: f64, color: Color) {
    // Tab (top-left bump) + main body, drawn as a single rounded rect outline.
    let body = RoundedRect::from_rect(
        Rect::new(cx - 0.42 * s, cy - 0.22 * s, cx + 0.42 * s, cy + 0.30 * s),
        0.08 * s,
    );
    p.stroke(&body, 0.07 * s, color);
    // Tab on top-left
    let mut tab = BezPath::new();
    tab.move_to((cx - 0.42 * s, cy - 0.04 * s));
    tab.line_to((cx - 0.42 * s, cy - 0.18 * s));
    tab.line_to((cx - 0.14 * s, cy - 0.18 * s));
    tab.line_to((cx - 0.08 * s, cy - 0.06 * s));
    tab.line_to((cx - 0.42 * s, cy - 0.06 * s));
    p.stroke(&tab, 0.07 * s, color);
}

#[cfg(test)]
mod tests {
    use super::*;
    use vello::kurbo::Shape;

    #[test]
    fn play_triangle_points_right() {
        let path = icon_play_path(100.0, 100.0, 40.0);
        let bb = path.bounding_box();
        // Apex is on the right: right half is wider than the left.
        assert!(bb.x1 - 100.0 > 100.0 - bb.x0);
        assert!(bb.width() > 0.0 && bb.height() > 0.0);
    }

    #[test]
    fn pause_bars_are_symmetric_and_tall() {
        let path = icon_pause_path(0.0, 0.0, 40.0);
        let bb = path.bounding_box();
        assert!(bb.height() > bb.width());
        assert!((bb.x0 + bb.x1).abs() < 1e-6, "pause must be x-symmetric");
        assert!(bb.width() > 0.0 && bb.height() > 0.0);
    }

    #[test]
    fn prev_next_are_mirrored() {
        let next = icon_next_path(0.0, 0.0, 40.0).bounding_box();
        let prev = icon_prev_path(0.0, 0.0, 40.0).bounding_box();
        assert!((next.width() - prev.width()).abs() < 1e-6);
        // Mirroring means each edge of `next` reflects to the opposite edge
        // of `prev`: next.x0 ↔ -prev.x1 and next.x1 ↔ -prev.x0.
        assert!((next.x0 + prev.x1).abs() < 1e-6, "left edge mirror");
        assert!((next.x1 + prev.x0).abs() < 1e-6, "right edge mirror");
    }

    #[test]
    fn heart_uses_cubic_curves() {
        let path = icon_heart_path(50.0, 50.0, 30.0);
        let bb = path.bounding_box();
        assert!(bb.width() > 0.0 && bb.height() > 0.0);
        // Heart is roughly symmetric around its center x.
        assert!((bb.x0 + bb.x1 - 100.0).abs() < 1e-6);
    }
}
