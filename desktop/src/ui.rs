//! UI rendering — dispatches to per-layout renderers.
//!
//! Each layout mirrors a layout in the web app's
//! `src/components/music-player/layouts/*`.

use vello::kurbo::{Affine, Rect, RoundedRect};
use vello::peniko::{Brush, Color, Fill};
use vello::vello_renderer::Scene;

use crate::app::AppState;
use crate::theme::{Layout, Theme};

/// Render the entire UI into the Vello `Scene`.
pub fn render(scene: &mut Scene, theme: &Theme, state: &AppState, size: (f64, f64)) {
    // Clear background.
    let bg = Color::rgb(theme.background[0], theme.background[1], theme.background[2]);
    scene.fill(
        Fill::NonZero,
        Affine::IDENTITY,
        &Brush::Solid(bg),
        None,
        &Rect::new(0.0, 0.0, size.0, size.1),
    );

    match theme.layout {
        Layout::Classic => render_classic(scene, theme, state, size),
        Layout::Glass => render_glass(scene, theme, state, size),
        Layout::Vinyl => render_vinyl(scene, theme, state, size),
        Layout::Cassette => render_cassette(scene, theme, state, size),
        Layout::Cyber => render_cyber(scene, theme, state, size),
        Layout::Focus => render_focus(scene, theme, state, size),
        Layout::Mosaic => render_mosaic(scene, theme, state, size),
        Layout::Broadcast => render_broadcast(scene, theme, state, size),
    }
}

fn accent(theme: &Theme) -> Color {
    Color::rgb(theme.accent[0], theme.accent[1], theme.accent[2])
}

fn surface(theme: &Theme) -> Color {
    Color::rgb(theme.surface[0], theme.surface[1], theme.surface[2])
}

fn text(theme: &Theme) -> Color {
    Color::rgb(theme.text[0], theme.text[1], theme.text[2])
}

fn text_muted(theme: &Theme) -> Color {
    Color::rgb(theme.text_muted[0], theme.text_muted[1], theme.text_muted[2])
}

/// Classic layout: sidebar left + bottom player bar.
fn render_classic(scene: &mut Scene, theme: &Theme, _state: &AppState, size: (f64, f64)) {
    let sidebar_w = 240.0;
    let bottom_h = 96.0;
    let surf = surface(theme);
    let accent_c = accent(theme);
    let text_c = text(theme);
    let text_m = text_muted(theme);

    // Sidebar
    scene.fill(
        Fill::NonZero,
        Affine::IDENTITY,
        &Brush::Solid(surf),
        None,
        &Rect::new(0.0, 0.0, sidebar_w, size.1),
    );

    // Sidebar items
    let nav_items = ["Home", "Search", "Library", "Playlists", "Lyrics", "Settings"];
    for (i, item) in nav_items.iter().enumerate() {
        let y = 64.0 + (i as f64) * 44.0;
        // Accent dot for "active" (Home)
        if i == 0 {
            scene.fill(
                Fill::NonZero,
                Affine::IDENTITY,
                &Brush::Solid(accent_c),
                None,
                &RoundedRect::from_rect(Rect::new(16.0, y - 8.0, 20.0, y + 24.0), 2.0),
            );
        }
        scene.fill(
            Fill::NonZero,
            Affine::translate((40.0, y - 8.0)),
            &Brush::Solid(text_c),
            None,
            &vello::vello_renderer::Text {
                font_size: 16.0,
                text: item.to_string(),
            },
        );
    }

    // Bottom player bar
    scene.fill(
        Fill::NonZero,
        Affine::IDENTITY,
        &Brush::Solid(surf),
        None,
        &Rect::new(0.0, size.1 - bottom_h, size.0, size.1),
    );

    // Track title placeholder
    let track_title = _state
        .controller
        .current_track_id()
        .unwrap_or_else(|| "No track".into());
    scene.fill(
        Fill::NonZero,
        Affine::translate((sidebar_w + 24.0, size.1 - bottom_h + 32.0)),
        &Brush::Solid(text_c),
        None,
        &vello::vello_renderer::Text {
            font_size: 18.0,
            text: track_title,
        },
    );

    // Progress bar
    let progress_y = size.1 - bottom_h + 60.0;
    let progress_w = size.0 - sidebar_w - 48.0;
    scene.fill(
        Fill::NonZero,
        Affine::IDENTITY,
        &Brush::Solid(text_m),
        None,
        &RoundedRect::from_rect(
            Rect::new(sidebar_w + 24.0, progress_y, sidebar_w + 24.0 + progress_w, progress_y + 4.0),
            2.0,
        ),
    );
    // Progress fill (0% for now)
    let position = _state.controller.position();
    let duration = _state.controller.duration();
    let pct = if duration > 0.0 { (position / duration).clamp(0.0, 1.0) } else { 0.0 };
    scene.fill(
        Fill::NonZero,
        Affine::IDENTITY,
        &Brush::Solid(accent_c),
        None,
        &RoundedRect::from_rect(
            Rect::new(
                sidebar_w + 24.0,
                progress_y,
                sidebar_w + 24.0 + progress_w * pct,
                progress_y + 4.0,
            ),
            2.0,
        ),
    );
}

/// Glass layout: top pill nav + floating panels.
fn render_glass(scene: &mut Scene, theme: &Theme, _state: &AppState, size: (f64, f64)) {
    let top_h = 56.0;
    let accent_c = accent(theme);
    let surf = surface(theme);
    let text_c = text(theme);

    // Top pill nav
    let nav_items = ["Home", "Search", "Library", "Queue"];
    let pill_w = 96.0;
    let pill_gap = 8.0;
    let total_w = pill_w * nav_items.len() as f64 + pill_gap * (nav_items.len() - 1) as f64;
    let start_x = (size.0 - total_w) / 2.0;
    for (i, _item) in nav_items.iter().enumerate() {
        let x = start_x + i as f64 * (pill_w + pill_gap);
        let active = i == 0;
        scene.fill(
            Fill::NonZero,
            Affine::IDENTITY,
            &Brush::Solid(if active { accent_c } else { surf }),
            None,
            &RoundedRect::from_rect(Rect::new(x, 12.0, x + pill_w, 12.0 + 32.0), 16.0),
        );
    }
    // Floating panel (now playing)
    let panel_x = size.0 * 0.5 - 320.0;
    let panel_y = top_h + 32.0;
    scene.fill(
        Fill::NonZero,
        Affine::IDENTITY,
        &Brush::Solid(surf),
        None,
        &RoundedRect::from_rect(Rect::new(panel_x, panel_y, panel_x + 640.0, panel_y + 400.0), 24.0),
    );
    // Track title placeholder
    let _ = text_c;
}

/// Vinyl layout: turntable side panel.
fn render_vinyl(scene: &mut Scene, theme: &Theme, _state: &AppState, size: (f64, f64)) {
    let turntable_w = 320.0;
    let accent_c = accent(theme);
    let surf = surface(theme);
    let text_m = text_muted(theme);

    // Turntable side panel
    scene.fill(
        Fill::NonZero,
        Affine::IDENTITY,
        &Brush::Solid(surf),
        None,
        &Rect::new(0.0, 0.0, turntable_w, size.1),
    );

    // Vinyl record (circle)
    let cx = turntable_w / 2.0;
    let cy = size.1 / 2.0;
    let r = 110.0;
    scene.fill(
        Fill::NonZero,
        Affine::IDENTITY,
        &Brush::Solid(Color::BLACK),
        None,
        &vello::kurbo::Circle::new((cx, cy), r),
    );
    // Record label
    scene.fill(
        Fill::NonZero,
        Affine::IDENTITY,
        &Brush::Solid(accent_c),
        None,
        &vello::kurbo::Circle::new((cx, cy), 32.0),
    );
    let _ = text_m;
}

/// Cassette layout: retro tape deck with reels.
fn render_cassette(scene: &mut Scene, theme: &Theme, _state: &AppState, size: (f64, f64)) {
    let accent_c = accent(theme);
    let surf = surface(theme);
    // Cassette body
    let body_h = 220.0;
    let body_y = size.1 / 2.0 - body_h / 2.0;
    scene.fill(
        Fill::NonZero,
        Affine::IDENTITY,
        &Brush::Solid(surf),
        None,
        &RoundedRect::from_rect(Rect::new(80.0, body_y, size.0 - 80.0, body_y + body_h), 12.0),
    );
    // Two reels
    for &offset in &[140.0, 0.0] {
        let cx = size.0 / 2.0 + offset;
        scene.fill(
            Fill::NonZero,
            Affine::IDENTITY,
            &Brush::Solid(accent_c),
            None,
            &vello::kurbo::Circle::new((cx, body_y + body_h / 2.0), 36.0),
        );
    }
}

/// Cyber layout: neon HUD terminal.
fn render_cyber(scene: &mut Scene, theme: &Theme, _state: &AppState, size: (f64, f64)) {
    let accent_c = accent(theme);
    let surf = surface(theme);
    // HUD frame (clipped corners)
    scene.stroke(
        &vello::kurbo::Stroke::new(2.0),
        Affine::IDENTITY,
        &Brush::Solid(accent_c),
        None,
        &RoundedRect::from_rect(Rect::new(32.0, 32.0, size.0 - 32.0, size.1 - 32.0), 0.0),
    );
    let _ = surf;
}

/// Focus layout: immersive stage + bottom dock.
fn render_focus(scene: &mut Scene, theme: &Theme, _state: &AppState, size: (f64, f64)) {
    let accent_c = accent(theme);
    let surf = surface(theme);
    // Stage (center)
    let stage_r = 180.0;
    let cx = size.0 / 2.0;
    let cy = size.1 / 2.0 - 60.0;
    scene.fill(
        Fill::NonZero,
        Affine::IDENTITY,
        &Brush::Solid(surf),
        None,
        &vello::kurbo::Circle::new((cx, cy), stage_r),
    );
    let _ = accent_c;
}

/// Mosaic layout: bento tile dashboard.
fn render_mosaic(scene: &mut Scene, theme: &Theme, _state: &AppState, size: (f64, f64)) {
    let accent_c = accent(theme);
    let surf = surface(theme);
    // 4-tile bento
    let gap = 16.0;
    let margin = 32.0;
    let total_w = size.0 - margin * 2.0 - gap;
    let total_h = size.1 - margin * 2.0 - gap;
    let tile_w = total_w / 2.0;
    let tile_h = total_h / 2.0;
    let tiles = [
        (margin, margin),
        (margin + tile_w + gap, margin),
        (margin, margin + tile_h + gap),
        (margin + tile_w + gap, margin + tile_h + gap),
    ];
    for (i, (x, y)) in tiles.iter().enumerate() {
        let c = if i == 0 { accent_c } else { surf };
        scene.fill(
            Fill::NonZero,
            Affine::IDENTITY,
            &Brush::Solid(c),
            None,
            &RoundedRect::from_rect(Rect::new(*x, *y, *x + tile_w, *y + tile_h), 16.0),
        );
    }
}

/// Broadcast layout: radio console with tuner dial.
fn render_broadcast(scene: &mut Scene, theme: &Theme, _state: &AppState, size: (f64, f64)) {
    let accent_c = accent(theme);
    let surf = surface(theme);
    // Tuner dial
    let dial_y = size.1 - 200.0;
    scene.fill(
        Fill::NonZero,
        Affine::IDENTITY,
        &Brush::Solid(surf),
        None,
        &RoundedRect::from_rect(Rect::new(80.0, dial_y, size.0 - 80.0, dial_y + 80.0), 8.0),
    );
    // Tuner needle
    let needle_x = size.0 / 2.0;
    scene.fill(
        Fill::NonZero,
        Affine::IDENTITY,
        &Brush::Solid(accent_c),
        None,
        &Rect::new(needle_x - 2.0, dial_y + 8.0, needle_x + 2.0, dial_y + 72.0),
    );
}
