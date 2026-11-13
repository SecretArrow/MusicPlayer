# Android Auto Integration

## Overview

The Android app provides **proper** Android Auto support via AndroidX Media3's
`MediaLibraryService`. This is not a simulated projection (unlike the web
app's demo overlay) — it uses the platform's real MediaBrowserService2
protocol that Auto head units connect to.

## Implementation

### Service declaration (AndroidManifest.xml)

```xml
<service
    android:name=".media.MusicPlayerMediaService"
    android:exported="true"
    android:foregroundServiceType="mediaPlayback">
    <intent-filter>
        <action android:name="androidx.media3.session.MediaLibraryService" />
        <action android:name="android.media.browse.MediaBrowserService" />
    </intent-filter>
</service>
```

### Automotive descriptor (res/xml/automotive_app_desc.xml)

```xml
<automotiveApp>
    <uses name="media" />
</automotiveApp>
```

This declares to Android Auto that the app provides media content.

### Service implementation

`MusicPlayerMediaService` extends `MediaLibrarySession.Callback`:

1. **`onGetLibraryRoot`** — returns the root MediaItem (the app itself, browsable, not playable).
2. **`onGetChildren`** — for `root`, returns the 4 top-level categories:
   - `albums` — Album folder
   - `artists` — Artist folder
   - `playlists` — User playlists folder
   - `tracks` — Flat track list
3. For each category folder, returns the appropriate items (album covers, artist names, etc.).

### MediaSession

Built via `MediaLibrarySession.Builder(this, player, callback)`:

- Audio attributes: `USAGE_MEDIA` + `AUDIO_CONTENT_TYPE_MUSIC`
- Audio focus handling: enabled (pauses on calls, ducking on notifications)
- Becoming-noisy handling: enabled (pauses on headphone disconnect)
- Session activity: `MainActivity` (so tapping the notification opens the app)

### Foreground playback

The service runs as a foreground service with type `mediaPlayback`, which
allows it to continue playing when the screen is off and the app is
backgrounded.

Required permissions:
```xml
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
```

### Android Auto features supported

| Feature | Status |
| --- | --- |
| Media browsing (root → albums/artists/playlists/tracks) | ✅ |
| Play / Pause | ✅ |
| Next / Previous | ✅ |
| Seek forward / backward | ✅ |
| Track title, artist, album display | ✅ |
| Artwork display | ✅ |
| Queue management | ✅ |
| Shuffle | ✅ |
| Repeat (off/all/one) | ✅ |
| Voice-assisted media selection | ✅ (via Media3's built-in voice support) |
| Bluetooth media controls | ✅ (via MediaSession) |
| Lock-screen controls | ✅ (via MediaSession notification) |
| Connection/disconnection handling | ✅ (MediaSession lifecycle) |
| Playback state preservation (phone ↔ car) | ✅ (MediaController reconnects) |

## Testing

### Emulator

```bash
# Install Android Auto emulator (Head Unit Server, DHU)
# https://developer.android.com/training/cars/testing

# Start the Desktop Head Unit
adb forward tcp:5277 tcp:5277
desktop-head-unit
```

### Automated tests

`android/app/src/androidTest/java/com/musicplayer/app/MediaServiceTest.kt`:
- Service starts and exposes a MediaLibrarySession
- Root item is browsable
- Browsing root returns 4 categories
- Play/pause/seek work via MediaController

## Limitations

- The Rust audio engine is wired to ExoPlayer's pipeline for now (ExoPlayer
  handles platform integration; Rust handles decoding + queue + EQ). A
  future refactor can replace ExoPlayer's `MediaSource` with a custom one
  that pulls samples from the Rust ring buffer.
- Android Auto voice commands work via Media3's built-in voice support;
  custom voice intents are not yet implemented.
