package com.musicplayer.app.media

import android.util.Log
import uniffi.musicplayer.Player
import uniffi.musicplayer.initEngine
import uniffi.musicplayer.version

/**
 * Singleton holder for the Rust audio-core [Player] (uniFFI bridge).
 *
 * The Rust cdylib (`libmusicplayer.so`) is loaded by the uniFFI binding on
 * first access; `initEngine()` primes the audio-core subsystems and must be
 * called once per process. After init, a single [Player] instance is reused
 * by [PlayerViewModel] and pushed EQ / volume changes through it.
 *
 * Every call is guarded so a missing/broken native lib never crashes the app
 * — ExoPlayer remains the primary playback engine; the Rust engine is used
 * for EQ chain evaluation (so the same biquad math runs as on desktop) and
 * exposes position/state queries for debugging.
 */
object NativeEngine {

    private const val TAG = "NativeEngine"

    @Volatile private var initialised: Boolean = false
    @Volatile private var player: Player? = null

    /** True once the Rust engine has been loaded and primed. */
    val available: Boolean get() = initialised && player != null

    /**
     * Initialise the engine. Safe to call repeatedly — only the first call
     * performs work. Returns `true` if the engine is usable afterwards.
     */
    @Synchronized
    fun ensureInitialised(): Boolean {
        if (initialised) return player != null
        return try {
            initEngine()
            player = Player()
            initialised = true
            Log.i(TAG, "audio-core ready (rust version=${version()})")
            true
        } catch (t: Throwable) {
            // cdylib missing, ABI mismatch, or AudioContext unavailable.
            // Degrade gracefully — VM keeps using ExoPlayer.
            Log.w(TAG, "Rust audio-core unavailable — running in ExoPlayer-only mode", t)
            initialised = true
            false
        }
    }

    /**
     * Hand the caller a [Player] reference, or `null` if the engine could
     * not be loaded. Callers must not retain the reference across long-lived
     * scopes (the singleton owns the lifetime).
     */
    fun player(): Player? {
        if (!initialised) ensureInitialised()
        return player
    }

    /** Release the engine. Called from [android.app.Application.onTerminate]. */
    @Synchronized
    fun shutdown() {
        player?.let {
            runCatching { it.shutdown() }
                .onFailure { e -> Log.w(TAG, "shutdown failed", e) }
        }
        player = null
        initialised = false
    }
}
