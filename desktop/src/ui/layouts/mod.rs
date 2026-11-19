//! Per-layout renderers — one module per layout variant, mirroring the web
//! app's `src/components/music-player/layouts/*`.
//!
//! Contract for each layout module:
//! - `pub fn paint_background(p: &mut Painter, t: &Theme, w: f64, h: f64)` —
//!   optional per-layout backdrop (gradients, glow blobs).
//! - `pub fn render(p: &mut Painter, t: &Theme, s: &AppState, w: f64, h: f64)
//!   -> Vec<HitRegion>` — paints chrome + content, returns hit zones.

pub mod broadcast;
pub mod cassette;
pub mod classic;
pub mod cyber;
pub mod focus;
pub mod glass;
pub mod mosaic;
pub mod vinyl;

#[cfg(test)]
mod tests {
    use crate::app::{AppState, View};
    use crate::theme::Theme;
    use crate::ui::{hit_test, NowPlaying, Ui, UiAction};
    use std::collections::HashSet;
    use std::sync::Arc;
    use vello::kurbo::Rect;
    use vello::Scene;

    const W: f64 = 1280.0;
    const H: f64 = 800.0;

    /// AppState with a small seeded library + queue, like after a first scan.
    fn test_state() -> AppState {
        let queue = audio_core::queue::shared_queue(vec!["q1".into(), "q2".into(), "q3".into()]);
        let controller = audio_core::PlaybackController::new(queue.clone());
        let library = Arc::new(parking_lot::RwLock::new(audio_core::Library::new()));
        {
            let mut lib = library.write();
            for (i, (title, artist, genre)) in [
                ("Aurora Drive", "Nightowl", "Rock"),
                ("Cassette Sun", "Motel Radio", "Jazz"),
            ]
            .iter()
            .enumerate()
            {
                lib.upsert(audio_core::LibraryEntry {
                    id: format!("t{i}"),
                    path: format!("/music/t{i}.mp3").into(),
                    title: (*title).into(),
                    artist: (*artist).into(),
                    album: "Test Album".into(),
                    genre: (*genre).into(),
                    year: 2024,
                    track_number: 1,
                    duration_secs: 183.0,
                    sample_rate: 44100,
                    channels: 2,
                    bitrate_kbps: 320,
                    has_artwork: false,
                    added_at_secs: 100,
                });
            }
        }
        AppState::new(
            controller,
            queue,
            library,
            Arc::new(parking_lot::RwLock::new(audio_core::PlaylistStore::new())),
            #[cfg(feature = "audio")]
            None,
        )
    }

    /// Render a full frame through the real dispatcher (background + layout).
    fn render_with(theme: Theme, s: &AppState) -> Vec<crate::ui::HitRegion> {
        let mut scene = Scene::new();
        Ui::new().render(&mut scene, &theme, s, (W, H), 1.0)
    }

    fn set_view_targets(regions: &[crate::ui::HitRegion]) -> Vec<View> {
        regions
            .iter()
            .filter_map(|r| match r.action {
                UiAction::SetView(v) => Some(v),
                _ => None,
            })
            .collect()
    }

    #[test]
    fn every_layout_produces_hit_regions() {
        let s = test_state();
        for t in crate::theme::THEMES.iter() {
            let regions = render_with(*t, &s);
            assert!(
                !regions.is_empty(),
                "layout {} produced no hit regions",
                t.key
            );
            for r in &regions {
                assert!(
                    r.rect.width() > 0.0 && r.rect.height() > 0.0,
                    "layout {} has a degenerate hit region {:?}",
                    t.key,
                    r.rect
                );
            }
        }
    }

    #[test]
    fn classic_layout_offers_core_controls() {
        let s = test_state();
        let regions = render_with(Theme::by_key("midnight"), &s);
        let labels: HashSet<&'static str> = regions.iter().map(|r| r.action.label()).collect();
        for expected in [
            "toggle_play",
            "prev",
            "next",
            "toggle_shuffle",
            "cycle_repeat",
            "toggle_mute",
            "seek",
            "next_theme",
            "play_track",
        ] {
            assert!(
                labels.contains(expected),
                "classic layout missing `{expected}`"
            );
        }
        // All six sidebar destinations are reachable.
        let targets = set_view_targets(&regions);
        for v in [
            View::Home,
            View::Search,
            View::Library,
            View::Playlists,
            View::Lyrics,
            View::Settings,
        ] {
            assert!(targets.contains(&v), "classic sidebar missing {:?}", v);
        }
    }

    #[test]
    fn glass_and_mosaic_map_their_views() {
        let s = test_state();
        let glass_targets = set_view_targets(&render_with(Theme::by_key("aurora"), &s));
        assert!(
            glass_targets.contains(&View::Queue),
            "glass pill nav missing Queue"
        );
        assert!(
            glass_targets.contains(&View::Home),
            "glass pill nav missing Home"
        );

        let mosaic_targets = set_view_targets(&render_with(Theme::by_key("forest"), &s));
        for v in [View::Recent, View::Stats, View::Library, View::Queue] {
            assert!(mosaic_targets.contains(&v), "mosaic tiles missing {:?}", v);
        }
    }

    #[test]
    fn themes_produce_distinct_accents() {
        // Theme switching must change the accent color the layouts paint with.
        let accents: HashSet<[u8; 3]> = crate::theme::THEMES.iter().map(|t| t.accent).collect();
        assert!(accents.len() >= 8, "expected distinct accent palettes");
        assert_ne!(
            Theme::by_key("midnight").accent_color(),
            Theme::by_key("ocean").accent_color()
        );
    }

    #[test]
    fn fmt_time_and_progress_helpers() {
        assert_eq!(crate::ui::text::fmt_time(61.0), "1:01");
        assert_eq!(crate::ui::text::fmt_time(3661.0), "1:01:01");
        let np = NowPlaying {
            id: None,
            title: "T".into(),
            artist: "A".into(),
            album: String::new(),
            position: 30.0,
            duration: 120.0,
            is_playing: true,
        };
        assert!((np.progress() - 0.25).abs() < 1e-9);
        assert_eq!(np.position_label(), "0:30");
        assert_eq!(np.duration_label(), "2:00");
    }

    #[test]
    fn hit_test_prefers_topmost_region() {
        let regions = vec![
            crate::ui::HitRegion::new(
                Rect::new(0.0, 0.0, 100.0, 100.0),
                UiAction::SetView(View::Home),
            ),
            crate::ui::HitRegion::new(Rect::new(40.0, 40.0, 60.0, 60.0), UiAction::TogglePlay),
        ];
        let hit = hit_test(&regions, 50.0, 50.0).expect("inner point must hit");
        assert_eq!(hit.action, UiAction::TogglePlay);
        let outer = hit_test(&regions, 10.0, 10.0).expect("outer point must hit");
        assert_eq!(outer.action.label(), "set_view");
        assert!(hit_test(&regions, 200.0, 200.0).is_none());
    }
}
