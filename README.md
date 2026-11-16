# MusicPlayer

A cross-platform music player ecosystem with **3 native targets** sharing one Rust audio engine.

## Project layout

```
MusicPlayer/
├── src/                          # Existing Next.js web app (unchanged)
├── shared/audio-core/           # Shared Rust audio engine (decoder, queue, EQ, library)
├── desktop/                      # Native Rust desktop app (Vello + Winit + CPAL + Symphonia)
├── android/                      # Native Android app (Kotlin + Compose + Media3 + Rust via UniFFI)
├── .github/workflows/            # CI/CD: ci-linux.yml, ci-desktop.yml, ci-android.yml
└── docs/
    ├── ARCHITECTURE.md           # End-to-end architecture overview
    ├── UI_PARITY_SPEC.md         # Web → native UI parity specification
    ├── ANDROID_AUTO.md           # Android Auto integration notes
    └── SECURITY.md               # CI/CD signing & secrets handling
```

## Three native targets

| Target | Stack | CI Workflow |
| --- | --- | --- |
| **Linux x64** | Rust (Vello + Winit + CPAL + Symphonia) | `ci-desktop.yml` (matrix) |
| **Windows x64** | Rust (Vello + Winit + CPAL + Symphonia) | `ci-desktop.yml` (matrix) |
| **macOS arm64** | Rust (Vello + Winit + CPAL + Symphonia) | `ci-desktop.yml` (matrix) |
| **Android (all ABIs)** | Kotlin + Compose + Media3 + Rust (UniFFI) | `ci-android.yml` |

## Shared Rust audio engine

`shared/audio-core` is the heart of the ecosystem. Pure Rust, fully unit-tested (36 tests pass).

- **Decoder**: Symphonia-backed. Supports MP3, FLAC, WAV, OGG Vorbis, Opus, AAC, M4A.
- **Queue**: Play queue with shuffle/repeat/play-next/play-next/move/remove.
- **Playlist**: User playlists CRUD with deduplication.
- **Metadata**: lofty-backed ID3 / Vorbis / MP4 tag reading + embedded artwork.
- **Effects**: 10-band biquad EQ (RBJ cookbook) + preamp + soft-clip — same 23 presets as the web app.
- **Library**: Local filesystem scanner with progress events, deduplication by path hash, search, sort by title/artist/genre, most-played, recently-added.
- **Playback controller**: Background decoder thread feeding a bounded ring buffer; realtime audio callback drains samples. EQ applied in the realtime path.

## CI/CD — no local builds

All release builds happen in GitHub Actions:

- `ci-linux.yml` — Lint, clippy, format, test, doc for `audio-core`.
- `ci-desktop.yml` — Cross-platform build matrix (Windows / Linux / macOS), packaging (ZIP / tar.gz), Wine smoke-test, GitHub Release on tag.
- `ci-android.yml` — Gradle build with NDK + Rust Android targets, signed split-per-ABI APKs, AAB, GitHub Release on tag.

Signing secrets are read from GitHub Secrets only — never committed to the repo. See `docs/SECURITY.md`.

## Local development

### Shared audio engine
```bash
cd shared/audio-core
cargo test --no-default-features --features decoder,metadata,effects
```

### Desktop
```bash
cd desktop
cargo build --release
```

### Android
```bash
cd android
./gradlew assembleDebug                # debug APK
./gradlew assembleRelease --split-per-abi   # signed per-ABI APKs (needs secrets in CI)
```

## Status

- ✅ Web app: full-featured music player (10 themes, 8 layouts, EQ, Android Auto projection)
- ✅ Shared Rust audio engine: 36 unit tests pass
- ✅ Desktop scaffold: Vello + Winit + CPAL + Symphonia structure; CI builds for Win/Linux/macOS
- ✅ Android scaffold: Kotlin + Compose + Media3 + UniFFI bridge; CI builds signed APK + AAB
- ✅ CI/CD workflows for all three platforms

## License

MIT
