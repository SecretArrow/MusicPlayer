//! Vello render loop + Winit 0.30 event handling.
//!
//! Owns the render thread, processes input events (mouse + keyboard), and
//! dispatches UI actions to the playback controller via hit regions built
//! by `ui::Ui::render` each frame.
//!
//! Uses the actual Vello 0.3 API:
//! - `vello::util::RenderContext` → `create_surface(window, w, h, mode)` (async, pollster-blocked)
//! - `vello::Renderer::new(&device, RendererOptions { surface_format, use_cpu, antialiasing_support })`
//! - `renderer.render_to_surface(&device, &queue, &scene, &surface_texture, &RenderParams)`
//! - CPU fallback: `RendererOptions { use_cpu: true }` when GPU pipeline init fails.
//!
//! Uses the Winit 0.30 API:
//! - `ApplicationHandler` trait (`resumed`, `window_event`, `about_to_wait`)
//! - `event_loop.create_window(WindowAttributes::default())` — no WindowBuilder.
//! - `EventLoop::builder().build()`

use std::sync::Arc;
use std::time::Instant;

use vello::util::{RenderContext, RenderSurface};
use vello::{AaConfig, Renderer, RendererOptions, Scene};
use winit::application::ApplicationHandler;
use winit::dpi::PhysicalSize;
use winit::event::{ElementState, KeyEvent, MouseButton, WindowEvent};
use winit::event_loop::ActiveEventLoop;
use winit::keyboard::{KeyCode, PhysicalKey};
use winit::window::{Window, WindowAttributes};

use crate::app::{AppState, View};
use crate::ui::{hit_test, Ui, UiAction};

/// One (surface, renderer) pair per window, keyed to a RenderContext device.
struct Surface {
    surface: RenderSurface<'static>,
    renderer: Renderer,
    device_id: usize,
}

/// Top-level app — implements `ApplicationHandler` for Winit 0.30.
pub struct VelloApp {
    state: Arc<AppState>,
    ctx: RenderContext,
    surfaces: Vec<Surface>,
    window: Option<Arc<Window>>,
    ui: Ui,
    last_frame: Instant,
}

impl VelloApp {
    pub fn new(state: Arc<AppState>) -> Self {
        Self {
            state,
            ctx: RenderContext::new(),
            surfaces: Vec::new(),
            window: None,
            ui: Ui::new(),
            last_frame: Instant::now(),
        }
    }

    /// Create (or re-create) the wgpu surface + Vello renderer.
    /// Falls back to CPU rendering if the GPU pipeline cannot initialize.
    fn ensure_surface(&mut self) {
        if self.surfaces.is_empty() {
            let Some(window) = self.window.clone() else {
                return;
            };
            let size = window.inner_size();
            let width = size.width.max(64);
            let height = size.height.max(64);

            let fut = self.ctx.create_surface(
                window.clone(),
                width,
                height,
                vello::wgpu::PresentMode::AutoVsync,
            );
            let surface = match pollster::block_on(fut) {
                Ok(s) => s,
                Err(e) => {
                    log::error!("surface creation failed: {e:?}");
                    return;
                }
            };

            let device_handle = &self.ctx.devices[surface.dev_id];
            let renderer = match Renderer::new(
                &device_handle.device,
                RendererOptions {
                    surface_format: Some(surface.format),
                    use_cpu: false,
                    antialiasing_support: vello::AaSupport::all(),
                    num_init_threads: None,
                },
            ) {
                Ok(r) => r,
                Err(e) => {
                    log::warn!("GPU renderer init failed ({e}); falling back to CPU");
                    match Renderer::new(
                        &device_handle.device,
                        RendererOptions {
                            surface_format: Some(surface.format),
                            use_cpu: true,
                            antialiasing_support: vello::AaSupport::area_only(),
                            num_init_threads: Some(std::num::NonZeroUsize::new(1).unwrap()),
                        },
                    ) {
                        Ok(r) => r,
                        Err(e2) => {
                            log::error!("CPU fallback renderer also failed: {e2}");
                            return;
                        }
                    }
                }
            };
            let device_id = surface.dev_id;
            self.surfaces.push(Surface {
                surface,
                renderer,
                device_id,
            });
            window.request_redraw();
        }
    }
}

/// Run the Winit event loop with Vello rendering.
///
/// The window is created inside `ApplicationHandler::resumed` via
/// `ActiveEventLoop::create_window` (Winit 0.30 has no WindowBuilder).
impl ApplicationHandler for VelloApp {
    fn resumed(&mut self, event_loop: &ActiveEventLoop) {
        // Create the window if we don't have one yet.
        if self.window.is_none() {
            let attrs = WindowAttributes::default()
                .with_title("MusicPlayer")
                .with_inner_size(PhysicalSize::new(1280.0, 800.0))
                .with_min_inner_size(PhysicalSize::new(800.0, 600.0));
            match event_loop.create_window(attrs) {
                Ok(w) => self.window = Some(Arc::new(w)),
                Err(e) => {
                    log::error!("window creation failed: {e}");
                    event_loop.exit();
                    return;
                }
            }
        }

        // (Re)create the Vello surface + renderer.
        self.ensure_surface();
    }

    fn suspended(&mut self, _event_loop: &ActiveEventLoop) {
        // Drop surfaces when suspended (minimize / reconfigure).
        self.surfaces.clear();
    }

    fn window_event(
        &mut self,
        event_loop: &ActiveEventLoop,
        _window_id: winit::window::WindowId,
        event: WindowEvent,
    ) {
        match event {
            WindowEvent::CloseRequested => {
                log::info!("close requested");
                self.state.controller.shutdown();
                event_loop.exit();
            }
            WindowEvent::Resized(size) => {
                let (w, h) = (size.width as f32, size.height as f32);
                *self.state.window_size.write() = (w, h);
                if let Some(s) = self.surfaces.first_mut() {
                    self.ctx.resize_surface(
                        &mut s.surface,
                        size.width.max(64),
                        size.height.max(64),
                    );
                }
                if let Some(window) = &self.window {
                    window.request_redraw();
                }
            }
            WindowEvent::ScaleFactorChanged { scale_factor, .. } => {
                *self.state.scale.write() = scale_factor as f32;
            }
            WindowEvent::CursorMoved { position, .. } => {
                *self.state.mouse_pos.write() = (position.x, position.y);
            }
            WindowEvent::MouseInput {
                state: btn,
                button: MouseButton::Left,
                ..
            } => {
                let is_down = btn == ElementState::Pressed;
                *self.state.mouse_down.write() = is_down;
                if is_down {
                    let (x, y) = *self.state.mouse_pos.read();
                    let zones = self.state.hit_zones.read().clone();
                    if let Some(region) = hit_test(&zones, x, y) {
                        let x_frac = region.fraction(x);
                        let y_frac = region.fraction_y(y);
                        dispatch(&region.action, x_frac, y_frac, &self.state, event_loop);
                    }
                }
            }
            WindowEvent::KeyboardInput {
                event:
                    KeyEvent {
                        state: ElementState::Pressed,
                        physical_key: PhysicalKey::Code(code),
                        ..
                    },
                ..
            } => {
                handle_shortcut(code, &self.state, event_loop);
            }
            WindowEvent::RedrawRequested => {
                self.render();
                self.last_frame = Instant::now();
            }
            _ => {}
        }
    }

    fn about_to_wait(&mut self, _event_loop: &ActiveEventLoop) {
        // Continuous redraw while playing; idle otherwise (no CPU burn when stopped).
        if self.state.controller.state() == audio_core::PlaybackState::Playing {
            if let Some(window) = &self.window {
                window.request_redraw();
            }
        }
    }
}

fn dispatch(
    action: &UiAction,
    fraction: f64,
    y_fraction: f64,
    state: &Arc<AppState>,
    _event_loop: &ActiveEventLoop,
) {
    match action {
        UiAction::SetView(v) => *state.view.write() = *v,
        UiAction::TogglePlay => match state.controller.state() {
            audio_core::PlaybackState::Playing => state.controller.pause(),
            _ => state.controller.resume(),
        },
        UiAction::Stop => state.controller.stop(),
        UiAction::Next => {
            let lib = state.library.read();
            state
                .controller
                .next(|id| lib.entries.get(id).map(|e| e.path.clone()));
        }
        UiAction::Prev => {
            let lib = state.library.read();
            state
                .controller
                .prev(|id| lib.entries.get(id).map(|e| e.path.clone()));
        }
        UiAction::Seek => {
            let duration = state.controller.duration();
            if duration > 0.0 {
                state.controller.seek(fraction.clamp(0.0, 1.0) * duration);
            }
        }
        UiAction::SetVolume => {
            *state.volume.write() = fraction.clamp(0.0, 1.0) as f32;
            *state.muted.write() = false;
            state.apply_volume();
        }
        UiAction::ToggleShuffle => {
            let mut q = state.queue.write();
            match q.shuffle {
                audio_core::ShuffleMode::Off => q.enable_shuffle(),
                _ => q.disable_shuffle(),
            }
        }
        UiAction::CycleRepeat => {
            let mut q = state.queue.write();
            q.cycle_repeat();
        }
        UiAction::ToggleMute => {
            *state.muted.write() = !*state.muted.read();
            state.apply_volume();
        }
        UiAction::NextTheme => *state.theme.write() = state.theme.read().next(),
        UiAction::PlayTrack(id) => {
            // Load this track + the visible library ordering as the queue.
            let lib = state.library.read();
            let ordered: Vec<String> = lib.entries.values().map(|e| e.id.clone()).collect();
            let path = lib.entries.get(id).map(|e| e.path.clone());
            drop(lib);
            if let Some(path) = path {
                state.queue.write().items = ordered;
                // Find this track's index so the queue's `current` is in sync.
                if let Some(idx) = state.queue.read().items.iter().position(|t| t == id) {
                    state.queue.write().current = idx;
                }
                if state.controller.current_track_id().as_deref() != Some(id.as_str()) {
                    state.controller.play_file(path, 0.0);
                } else {
                    state.controller.resume();
                }
            }
        }
        // --- Equalizer ---
        UiAction::ToggleEqPanel => {
            let mut open = state.show_eq.write();
            *open = !*open;
        }
        UiAction::ToggleEq => {
            let mut eq = state.eq.write();
            eq.enabled = !eq.enabled;
            let snapshot = eq.clone();
            drop(eq);
            state.apply_eq(&snapshot);
        }
        UiAction::ApplyEqPreset(name) => {
            let mut eq = state.eq.write();
            eq.apply_preset(name);
            let snapshot = eq.clone();
            drop(eq);
            state.apply_eq(&snapshot);
        }
        UiAction::SetEqBand(idx, _placeholder) => {
            // `y_fraction` represents the click position along the slider's
            // vertical axis (0 = top, 1 = bottom). The UI lays the slider with
            // +12 dB at the top and -12 dB at the bottom, so gain = 12 - frac*24.
            let gain_db = (12.0 - y_fraction.clamp(0.0, 1.0) * 24.0) as f32;
            let mut eq = state.eq.write();
            eq.set_band(*idx, gain_db);
            eq.preset = "custom".to_string();
            let snapshot = eq.clone();
            drop(eq);
            state.apply_eq(&snapshot);
        }
        // --- Import folder ---
        UiAction::ImportFolder => {
            // Spawn the native folder picker on a background thread so the
            // UI thread is never blocked. We use rfd's *async* API driven
            // by pollster::block_on instead of the synchronous
            // FileDialog::pick_folder(): the sync API requires a Win32
            // message pump on the calling thread, and a plain
            // std::thread::spawn has none, so on Windows the sync dialog
            // never appears (the click silently does nothing — the
            // "import folder button doesn't work" bug). AsyncFileDialog
            // pumps its own dialog loop, so it works from any thread on
            // Windows, macOS, and Linux without a runtime.
            let lib = state.library.clone();
            std::thread::spawn(move || {
                let folder = pollster::block_on(
                    rfd::AsyncFileDialog::new()
                        .set_title("Import audio folder")
                        .pick_folder(),
                );
                if let Some(handle) = folder {
                    let path = handle.path().to_path_buf();
                    std::thread::spawn(move || {
                        let (tx, _rx) = crossbeam_channel::bounded::<audio_core::ScanProgress>(64);
                        let mut guard = lib.write();
                        match audio_core::library::scan_dir_into(path, &mut guard, &tx) {
                            Ok(n) => log::info!("imported {n} tracks into library"),
                            Err(e) => log::error!("library import failed: {e}"),
                        }
                        // Persist the updated library index so the imported
                        // tracks survive a restart. Snapshot under the write
                        // lock, then drop it before saving (save_library
                        // takes its own time and we don't want to hold the
                        // RwLock across disk I/O).
                        let snapshot = guard.clone();
                        drop(guard);
                        crate::persist::save_library(&snapshot);
                    });
                }
            });
        }
        // --- Library CRUD ---
        UiAction::RemoveFromLibrary(id) => {
            state.library.write().remove(id);
            // Drop the track from any playlist that references it, so
            // playlists never point at a track the user removed.
            {
                let mut pl = state.playlists.write();
                for p in pl.playlists.iter_mut() {
                    p.remove(id);
                }
            }
            // And from the queue, if present.
            state.queue.write().remove_track(id);
            state.persist_library();
            state.persist_playlists();
        }
        UiAction::EditTrack {
            id,
            title,
            artist,
            album,
            genre,
            year,
        } => {
            state.library.write().edit_metadata(
                id,
                title.clone(),
                artist.clone(),
                album.clone(),
                genre.clone(),
                *year,
            );
            state.persist_library();
        }
        // --- Queue CRUD ---
        UiAction::Enqueue(id) => {
            state.queue.write().enqueue(id.clone());
        }
        UiAction::PlayNext(id) => {
            state.queue.write().play_next(id.clone());
        }
        UiAction::RemoveFromQueue(idx) => {
            state.queue.write().remove(*idx);
        }
        UiAction::JumpToQueue(track_id) => {
            let mut q = state.queue.write();
            if q.jump_to(track_id) {
                let id = q.current_id().map(|s| s.to_string());
                drop(q);
                if let Some(id) = id {
                    let lib = state.library.read();
                    let path = lib.entries.get(&id).map(|e| e.path.clone());
                    drop(lib);
                    if let Some(path) = path {
                        state.controller.play_file(path, 0.0);
                    }
                }
            }
        }
        UiAction::MoveQueueItem(from, to) => {
            state.queue.write().move_item(*from, *to);
        }
        // --- Playlists ---
        UiAction::CreatePlaylist(title) => {
            state.playlists.write().create(title.clone(), "#A855F7");
            state.persist_playlists();
        }
        UiAction::AddToPlaylist {
            playlist_id,
            track_id,
        } => {
            state
                .playlists
                .write()
                .add_track(playlist_id, track_id);
            state.persist_playlists();
        }
        UiAction::RemoveFromPlaylist {
            playlist_id,
            track_id,
        } => {
            state
                .playlists
                .write()
                .remove_track(playlist_id, track_id);
            state.persist_playlists();
        }
        UiAction::RenamePlaylist {
            playlist_id,
            new_title,
        } => {
            state
                .playlists
                .write()
                .rename(playlist_id, new_title);
            state.persist_playlists();
        }
        UiAction::ReorderPlaylist {
            playlist_id,
            from,
            to,
        } => {
            if let Some(p) = state.playlists.write().get_mut(playlist_id) {
                p.move_track(*from, *to);
            }
            state.persist_playlists();
        }
        UiAction::DeletePlaylist(id) => {
            state.playlists.write().delete(id);
            state.persist_playlists();
        }
    }
}

fn handle_shortcut(code: KeyCode, state: &Arc<AppState>, _event_loop: &ActiveEventLoop) {
    match code {
        KeyCode::Space => dispatch(&UiAction::TogglePlay, 0.0, 0.0, state, _event_loop),
        KeyCode::ArrowRight => dispatch(&UiAction::Next, 0.0, 0.0, state, _event_loop),
        KeyCode::ArrowLeft => dispatch(&UiAction::Prev, 0.0, 0.0, state, _event_loop),
        KeyCode::KeyS => dispatch(&UiAction::ToggleShuffle, 0.0, 0.0, state, _event_loop),
        KeyCode::KeyR => dispatch(&UiAction::CycleRepeat, 0.0, 0.0, state, _event_loop),
        KeyCode::KeyM => dispatch(&UiAction::ToggleMute, 0.0, 0.0, state, _event_loop),
        KeyCode::KeyT => dispatch(&UiAction::NextTheme, 0.0, 0.0, state, _event_loop),
        KeyCode::KeyE => dispatch(&UiAction::ToggleEqPanel, 0.0, 0.0, state, _event_loop),
        KeyCode::KeyI => dispatch(&UiAction::ImportFolder, 0.0, 0.0, state, _event_loop),
        KeyCode::Escape => *state.view.write() = View::Home,
        _ => {}
    }
}

impl VelloApp {
    fn render(&mut self) {
        let Some(s) = self.surfaces.first_mut() else {
            return;
        };
        let Some(window) = self.window.as_ref() else {
            return;
        };
        let Some(dev) = self.ctx.devices.get(s.device_id) else {
            return;
        };

        let size = window.inner_size();
        let width = size.width.max(64);
        let height = size.height.max(64);

        let theme = *self.state.theme.read();
        let scale = *self.state.scale.read() as f64;
        *self.state.elapsed.write() += self.last_frame.elapsed().as_secs_f64();

        // Build the scene; collect hit zones for input dispatch.
        let mut scene = Scene::new();
        let zones = self.ui.render(
            &mut scene,
            &theme,
            &self.state,
            (width as f64, height as f64),
            scale,
        );
        *self.state.hit_zones.write() = zones;

        let params = vello::RenderParams {
            base_color: theme.background_color(),
            width,
            height,
            antialiasing_method: AaConfig::Area,
        };

        let surface_texture = match s.surface.surface.get_current_texture() {
            Ok(t) => t,
            Err(e) => {
                log::warn!("get_current_texture failed: {e}; recreating surface next frame");
                self.surfaces.clear();
                return;
            }
        };

        if let Err(e) =
            s.renderer
                .render_to_surface(&dev.device, &dev.queue, &scene, &surface_texture, &params)
        {
            log::error!("render failed: {e}");
        }
        surface_texture.present();
        dev.device.poll(vello::wgpu::Maintain::Poll);
    }
}
