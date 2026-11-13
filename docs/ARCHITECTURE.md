# Architecture

## Overview

MusicPlayer is a cross-platform music player ecosystem with **3 native targets**
sharing one Rust audio engine.

```
              ┌─────────────────────────────────────┐
              │  shared/audio-core  (Rust library)   │
              │                                     │
              │  decoder → queue → playback → EQ →   │
              │  audio_output (CPAL)                 │
              │  library · metadata · playlist       │
              └──────────┬───────────────┬───────────┘
                         │               │
              ┌──────────┴────┐  ┌──────┴────────────────┐
              │ desktop (Rust)│  │ android (Kotlin+Rust) │
              │ Vello + Winit │  │ Compose + Media3      │
              │ + CPAL        │  │ + UniFFI bridge        │
              └───────────────┘  └───────────────────────┘
```

## Module: shared/audio-core

| Submodule | Purpose |
| --- | --- |
| `decoder` | Symphonia-backed audio decoder. Supports MP3, FLAC, WAV, OGG Vorbis, Opus, AAC, M4A. |
| `queue` | Play queue with shuffle/repeat/play-next/move/remove. |
| `playlist` | User playlists CRUD with dedup. |
| `metadata` | lofty-backed ID3/Vorbis/MP4 tag reading + embedded artwork. |
| `effects` | 10-band biquad EQ (RBJ cookbook) + preamp + soft-clip. 23 presets. |
| `library` | Local filesystem scanner with progress events. |
| `playback` | High-level controller owning the decoder thread + ring buffer. |
| `audio_output` | CPAL output backend (feature `audio_output`). |

### Realtime audio path

```
Decoder thread → Bounded ring buffer (crossbeam) → CPAL callback
                       ↑
                  EQ chain (10-band biquad)
```

The decoder thread runs blocking work (file IO, decoding) off the realtime
audio thread. Samples are pushed into a bounded ring buffer; the CPAL callback
drains samples and applies the EQ chain in the realtime path. No allocations
or blocking operations happen inside the callback.

## Module: desktop

Stack: Rust + Vello + Winit + CPAL + Symphonia.

- `main.rs` — entry point, builds window + event loop + audio backend.
- `app.rs` — shared app state (controller, theme, view).
- `theme.rs` — all 10 built-in themes with layout variants.
- `ui.rs` — per-layout renderers (classic / glass / vinyl / cassette / cyber / focus / mosaic / broadcast).
- `render.rs` — Vello render loop + Winit event handler.

Each theme maps to a layout variant, matching the web app's per-theme layout
system. The same `Theme::layout` field drives conditional rendering.

## Module: android

Stack: Kotlin + Jetpack Compose + Media3 + Rust (UniFFI).

- `MusicPlayerApp.kt` — `Application` class, creates notification channel.
- `MainActivity.kt` — `ComponentActivity` hosting the Compose UI.
- `media/MusicPlayerMediaService.kt` — `MediaLibraryService` for Android Auto.
- `ui/theme/Theme.kt` — Material 3 color scheme (mirrors web app's Midnight/Daylight).
- `ui/theme/Themes.kt` — all 10 themes (palette + layout variant).
- `ui/screens/HomeScreen.kt` — Compose home screen with track list.
- `data/Tracks.kt` — demo tracks (mirrors `src/data/music.ts`).

### Android Auto

`MusicPlayerMediaService` extends `MediaLibraryService` (AndroidX Media3):

1. **MediaSession** — exposes playback state to lock screen, notification, BT.
2. **Browsable tree** — root → {albums, artists, playlists, tracks}.
3. **Foreground service** — playback continues when screen is off.
4. **Audio focus** — `AudioAttributes` with `USAGE_MEDIA` + `handleAudioFocus=true`.
5. **Noisy handling** — pauses when headphones disconnect.
6. **Auto XML descriptor** — `res/xml/automotive_app_desc.xml` declares media support.

### UniFFI bridge

`android/rust/src/lib.rs` exposes a `Player` interface to Kotlin:

```kotlin
val player = Player()
player.playFile("/path/to/song.mp3")
player.pause()
player.setEq(EqSettings(...))
```

The bridge is a thin wrapper around `audio_core::PlaybackController`. All
realtime audio work happens in Rust; Kotlin only handles UI, lifecycle,
permissions, and Media3 integration.

## CI/CD

| Workflow | Runner | Output |
| --- | --- | --- |
| `ci-linux.yml` | ubuntu-latest | Lint, clippy, test, doc for audio-core |
| `ci-desktop.yml` | windows / ubuntu / macos | EXE + ZIP (Win), tar.gz (Linux/macOS), GitHub Release |
| `ci-android.yml` | ubuntu-latest | Signed split-per-ABI APKs + AAB, GitHub Release |

All signing happens via GitHub Actions Secrets — see `docs/SECURITY.md`.
