package com.musicplayer.app.media

import com.musicplayer.app.data.EqPresets
import com.musicplayer.app.data.EqSettings as AppEqSettings

/**
 * Bridge between the app's [AppEqSettings] (integer dB values, persisted via
 * DataStore) and the Rust [uniffi.musicplayer.EqSettings] (float dB values,
 * consumed by the audio-core biquad chain).
 *
 * The two structs differ on purpose: the UI works in whole-dB steps because
 * the slider snaps; the Rust engine works in float for smooth ramping.
 */
object NativeEqMapper {

    /** Convert the app's integer-dB EqSettings into the Rust float-dB record. */
    fun toRust(app: AppEqSettings): uniffi.musicplayer.EqSettings {
        val floatBands = app.bands.map { it.toFloat() }
        val preamp = app.preamp.toFloat()
        return uniffi.musicplayer.EqSettings(
            enabled = app.enabled,
            preset = app.preset,
            preampDb = preamp,
            bands = floatBands,
        )
    }

    /** Convert the Rust float-dB EqSettings back into the app's integer record. */
    fun fromRust(rust: uniffi.musicplayer.EqSettings): AppEqSettings {
        val intBands = rust.bands.map { it.toInt().coerceIn(EqPresets.MIN_DB, EqPresets.MAX_DB) }
        val preamp = rust.preampDb.toInt().coerceIn(EqPresets.MIN_DB, EqPresets.MAX_DB)
        return AppEqSettings(
            enabled = rust.enabled,
            preset = rust.preset,
            preamp = preamp,
            bands = intBands,
        )
    }
}
