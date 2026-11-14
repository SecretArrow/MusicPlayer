package com.musicplayer.app.data

import android.content.Context
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.stringSetPreferencesKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import org.json.JSONArray
import org.json.JSONObject

/** Default theme key — Midnight, matching the web app. */
const val DEFAULT_THEME_KEY = "midnight"

private val Context.dataStore by preferencesDataStore(name = "musicplayer_prefs")

/**
 * Equalizer state — mirrors `EqSettings` in the web app's player store.
 * 10 bands, -12…+12 dB each.
 */
data class EqSettings(
    val enabled: Boolean = false,
    val preset: String = "flat",
    val preamp: Int = 0,
    val bands: List<Int> = List(10) { 0 },
)

/** 10-band EQ presets + frequency labels (mirrors `EQ_PRESETS` in player-store.ts). */
object EqPresets {
    val BAND_LABELS: List<String> =
        listOf("32", "64", "125", "250", "500", "1K", "2K", "4K", "8K", "16K")

    const val MIN_DB = -12
    const val MAX_DB = 12

    val PRESETS: Map<String, List<Int>> = mapOf(
        "flat" to listOf(0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
        "bass boost" to listOf(8, 6, 4, 2, 0, 0, 0, 0, 0, 0),
        "bass reducer" to listOf(-8, -6, -4, -2, 0, 0, 0, 0, 0, 0),
        "treble boost" to listOf(0, 0, 0, 0, 0, 2, 4, 6, 8, 8),
        "treble reducer" to listOf(0, 0, 0, 0, 0, -2, -4, -6, -8, -8),
        "vocal" to listOf(-3, -2, 0, 3, 5, 5, 3, 1, 0, -1),
        "rock" to listOf(5, 4, 2, -1, -2, 0, 3, 5, 5, 4),
        "pop" to listOf(-2, -1, 2, 4, 5, 3, 0, -1, -1, -2),
        "jazz" to listOf(4, 3, 1, 2, -1, -1, 0, 1, 3, 4),
        "classical" to listOf(4, 3, 2, 0, -1, -1, 0, 2, 3, 4),
        "electronic" to listOf(6, 5, 1, 0, -2, 2, 1, 3, 5, 6),
        "dance" to listOf(8, 6, 2, 0, -2, 1, 3, 5, 6, 7),
        "hip-hop" to listOf(8, 6, 3, 1, -1, -1, 1, 3, 4, 4),
        "acoustic" to listOf(4, 3, 2, 1, 1, 2, 2, 3, 4, 3),
        "r&b" to listOf(6, 4, 2, 0, -2, 1, 3, 4, 5, 4),
        "latin" to listOf(3, 3, 1, 0, 1, 2, 3, 3, 4, 4),
        "reggae" to listOf(2, 1, 0, 2, 3, 3, 1, 0, 1, 2),
        "metal" to listOf(5, 4, 3, 0, -1, 0, 3, 4, 5, 5),
        "country" to listOf(3, 1, 0, 1, 2, 2, 2, 1, 1, 2),
        "speech" to listOf(-6, -4, -1, 2, 4, 4, 3, 1, 0, -2),
        "loudness" to listOf(7, 5, 0, -2, -3, -2, 0, 3, 6, 7),
        "small speakers" to listOf(6, 5, 3, 1, 0, 0, 1, 2, 2, 2),
        "soft" to listOf(0, 1, 2, 3, 3, 2, 1, 0, -1, -2),
    )
}

/**
 * DataStore-backed persistence — mirrors the web app's persisted zustand keys.
 *
 * Stores: theme key, accent key, EQ settings (JSON), last played track,
 * last position, liked track ids, play counts and recently played ids.
 */
object Persistence {

    private val KEY_THEME = stringPreferencesKey("theme_key")
    private val KEY_ACCENT = stringPreferencesKey("accent_key")
    private val KEY_EQ = stringPreferencesKey("eq_json")
    private val KEY_LAST_TRACK = stringPreferencesKey("last_track_id")
    private val KEY_LAST_POSITION = floatPreferencesKey("last_position_sec")
    private val KEY_LIKED = stringSetPreferencesKey("liked_track_ids")
    private val KEY_PLAY_COUNTS = stringPreferencesKey("play_counts_json")
    private val KEY_RECENT = stringPreferencesKey("recent_ids")

    /** Immutable snapshot of everything persisted. */
    data class Snapshot(
        val themeKey: String,
        val accentKey: String,
        val eq: EqSettings,
        val lastTrackId: String?,
        val lastPositionSec: Float,
        val likedIds: Set<String>,
        val playCounts: Map<String, Int>,
        val recentIds: List<String>,
    )

    /** Observable stream of preferences (emits on every change). */
    fun observe(context: Context): Flow<Snapshot> =
        context.dataStore.data.map { it.toSnapshot() }

    /** Reads the current snapshot once. */
    suspend fun read(context: Context): Snapshot =
        context.dataStore.data.first().toSnapshot()

    private fun Preferences.toSnapshot(): Snapshot {
        val eqJson = runCatching { JSONObject(this[KEY_EQ] ?: "") }.getOrNull()
        val eq = if (eqJson == null) {
            EqSettings()
        } else {
            val bandsJson = eqJson.optJSONArray("bands")
            EqSettings(
                enabled = eqJson.optBoolean("enabled", false),
                preset = eqJson.optString("preset", "flat"),
                preamp = eqJson.optInt("preamp", 0).coerceIn(EqPresets.MIN_DB, EqPresets.MAX_DB),
                bands = List(10) { i -> (bandsJson?.optInt(i, 0) ?: 0) },
            )
        }

        val countsJson = runCatching { JSONObject(this[KEY_PLAY_COUNTS] ?: "{}") }.getOrNull()
        val playCounts = buildMap {
            countsJson?.keys()?.forEach { key -> put(key, countsJson.optInt(key, 0)) }
        }

        return Snapshot(
            themeKey = this[KEY_THEME] ?: DEFAULT_THEME_KEY,
            accentKey = this[KEY_ACCENT] ?: DEFAULT_THEME_KEY,
            eq = eq,
            lastTrackId = this[KEY_LAST_TRACK],
            lastPositionSec = this[KEY_LAST_POSITION] ?: 0f,
            likedIds = this[KEY_LIKED] ?: emptySet(),
            playCounts = playCounts,
            recentIds = (this[KEY_RECENT] ?: "").split(',').filter { it.isNotBlank() },
        )
    }

    suspend fun saveTheme(context: Context, themeKey: String, accentKey: String = themeKey) {
        context.dataStore.edit { prefs ->
            prefs[KEY_THEME] = themeKey
            prefs[KEY_ACCENT] = accentKey
        }
    }

    suspend fun saveEq(context: Context, eq: EqSettings) {
        val json = JSONObject().apply {
            put("enabled", eq.enabled)
            put("preset", eq.preset)
            put("preamp", eq.preamp)
            put("bands", JSONArray(eq.bands))
        }
        context.dataStore.edit { prefs -> prefs[KEY_EQ] = json.toString() }
    }

    suspend fun saveLastPlayed(context: Context, trackId: String, positionSec: Float) {
        context.dataStore.edit { prefs ->
            prefs[KEY_LAST_TRACK] = trackId
            prefs[KEY_LAST_POSITION] = positionSec
        }
    }

    suspend fun saveLiked(context: Context, ids: Set<String>) {
        context.dataStore.edit { prefs -> prefs[KEY_LIKED] = ids }
    }

    suspend fun saveHistory(context: Context, recentIds: List<String>, playCounts: Map<String, Int>) {
        val counts = JSONObject()
        playCounts.forEach { (id, count) -> counts.put(id, count) }
        context.dataStore.edit { prefs ->
            prefs[KEY_RECENT] = recentIds.joinToString(",")
            prefs[KEY_PLAY_COUNTS] = counts.toString()
        }
    }
}
