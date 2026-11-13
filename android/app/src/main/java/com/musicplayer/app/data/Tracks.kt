package com.musicplayer.app.data

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

data class Track(
    val id: String,
    val title: String,
    val artist: String,
    val album: String,
    val genre: String,
    val year: Int,
    val durationSecs: Int,
    val cover: List<Pair<String, String>>,
) {
    val durationLabel: String
        get() = "${durationSecs / 60}:${(durationSecs % 60).toString().padStart(2, '0')}"

    val gradientColors: List<Color>
        get() = cover.map { Color(android.graphics.Color.parseColor(it)) }
}

/**
 * Demo tracks — mirrors the web app's `src/data/music.ts` (8 SoundHelix tracks).
 *
 * Real audio URLs are royalty-free samples from soundhelix.com.
 */
val DemoTracks: List<Track> = listOf(
    Track("t1", "Midnight Pulse", "Aurora Bay", "Neon Horizons", "Synthwave", 2024, 372,
        listOf("#7C3AED" to "#DB2777")),
    Track("t2", "Coastline Drift", "The Pine Hearts", "Salt & Sun", "Indie Folk", 2023, 426,
        listOf("#0EA5E9" to "#10B981")),
    Track("t3", "Velvet Static", "Nora Cassette", "Analog Dreams", "R&B / Soul", 2025, 297,
        listOf("#F59E0B" to "#EF4444")),
    Track("t4", "Crystal Caverns", "Lumen Tide", "Deep Waters", "Ambient", 2024, 348,
        listOf("#06B6D4" to "#3B82F6")),
    Track("t5", "Brass & Embers", "The Hollow Quartet", "Smoke Signals", "Jazz", 2022, 391,
        listOf("#B45309" to "#7C2D12")),
    Track("t6", "Gravity Falls", "Echo Field", "Orbit", "Alt Rock", 2025, 412,
        listOf("#1E40AF" to "#5B21B6")),
    Track("t7", "Saffron Skies", "Mira Sol", "Citrine", "World", 2024, 356,
        listOf("#F97316" to "#EAB308")),
    Track("t8", "Northern Lullaby", "Glacial Drift", "Polar EP", "Ambient", 2023, 408,
        listOf("#3B82F6" to "#06B6D4")),
)
