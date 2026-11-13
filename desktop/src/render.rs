//! Vello render loop + Winit event handling.
//!
//! Owns the render thread, processes input events, and dispatches to the
//! layout-specific UI modules.

use std::sync::Arc;
use vello::kurbo::Affine;
use vello::peniko::Color;
use vello::util::{RenderContext, RenderSurface};
use vello::vello_renderer::Scene;
use vello::AaConfig;
use winit::application::ApplicationHandler;
use winit::event::{ElementState, KeyEvent, WindowEvent};
use winit::event_loop::{ActiveEventLoop, EventLoop};
use winit::window::Window;

use crate::app::AppState;
use crate::theme::Theme;

/// Vello render state — created when a surface becomes available.
struct RenderState {
    render_ctx: RenderContext,
    surface: RenderSurface<'static>,
    state: vello::RendererState,
    renderer: vello::Renderer,
}

/// Top-level app — implements `ApplicationHandler` for Winit 0.30.
pub struct VelloApp {
    state: Arc<AppState>,
    render_state: Option<RenderState>,
    window: Option<Arc<Window>>,
}

impl VelloApp {
    pub fn new(state: Arc<AppState>) -> Self {
        Self {
            state,
            render_state: None,
            window: None,
        }
    }
}

/// Run the Winit event loop with Vello rendering.
pub async fn run(event_loop: EventLoop, window: Window, state: Arc<AppState>) {
    let window = Arc::new(window);
    let mut app = VelloApp::new(state);
    app.window = Some(window.clone());

    event_loop
        .run_app(&mut app)
        .expect("event loop failed");
}

impl ApplicationHandler for VelloApp {
    fn resumed(&mut self, event_loop: &ActiveEventLoop) {
        // If we already have a window, just (re)acquire the surface.
        if self.window.is_none() {
            let window = winit::window::WindowBuilder::new()
                .with_title("MusicPlayer")
                .with_inner_size(winit::dpi::LogicalSize::new(1280.0, 800.0))
                .build(event_loop)
                .expect("failed to create window");
            self.window = Some(Arc::new(window));
        }
        // (Re)create the Vello surface for the window.
        if let Some(window) = &self.window {
            let render_ctx = RenderContext::new();
            let surface = pollster::block_on(render_ctx.create_surface(
                window.clone(),
                window.surface_defaults(),
            ));
            let state = vello::RendererState::new();
            let renderer = vello::Renderer::new(&state);
            self.render_state = Some(RenderState {
                render_ctx,
                surface,
                state,
                renderer,
            });
        }
    }

    fn suspended(&mut self, _event_loop: &ActiveEventLoop) {
        // Drop the surface (e.g. when the window is minimized).
        self.render_state = None;
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
                if let Some(window) = &self.window {
                    let _ = window.request_redraw();
                }
            }
            WindowEvent::ScaleFactorChanged { scale_factor, .. } => {
                *self.state.scale.write() = scale_factor as f32;
            }
            WindowEvent::KeyboardInput {
                event: KeyEvent {
                    state: ElementState::Pressed,
                    ..
                },
                ..
            } => {
                // TODO: bind space → play/pause, ←/→ → prev/next, etc.
            }
            WindowEvent::RedrawRequested => {
                self.render();
            }
            _ => {}
        }
    }

    fn about_to_wait(&mut self, _event_loop: &ActiveEventLoop) {
        // Continuous redraw while playing.
        if let Some(window) = &self.window {
            let _ = window.request_redraw();
        }
    }
}

impl VelloApp {
    fn render(&mut self) {
        let Some(rs) = self.render_state.as_mut() else { return };
        let Some(window) = self.window.as_ref() else { return };

        let (w, h) = window.inner_size().into();
        let width = w;
        let height = h;

        // Build the scene based on the active theme + layout.
        let theme = self.state.theme.read().clone();
        let mut scene = Scene::new();
        crate::ui::render(&mut scene, &theme, &self.state, (width as f64, height as f64));

        // Render the scene to the surface.
        rs.render_ctx
            .render_to_surface(
                &rs.state,
                &mut rs.renderer,
                &scene,
                &rs.surface,
                vello::RenderParams {
                    base_color: Color::rgb(theme.background[0], theme.background[1], theme.background[2]),
                    width,
                    height,
                    antialiasing: AaConfig::Area,
                },
            )
            .expect("render failed");
    }
}
