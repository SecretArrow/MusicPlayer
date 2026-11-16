package com.musicplayer.app.data

import androidx.compose.ui.graphics.Color

/**
 * Demo playlists — mirrors the web app's `demoPlaylists` from
 * `src/data/music.ts`, remapped onto the 8-track Android demo library.
 */
data class Playlist(
    val id: String,
    val title: String,
    val description: String,
    val trackIds: List<String>,
    /** [startColor, endColor] hex pair used for the gradient cover. */
    val cover: Pair<String, String>,
    val curator: String = "Editorial Team",
) {
    val gradientColors: List<Color>
        get() = listOf(
            Color(android.graphics.Color.parseColor(cover.first)),
            Color(android.graphics.Color.parseColor(cover.second)),
        )

    val trackCount: Int get() = trackIds.size
}

val DemoPlaylists: List<Playlist> = listOf(
    Playlist(
        "p1", "Today's Top Hits", "The hottest tracks right now, updated daily",
        listOf("t1", "t3", "t7", "t8", "t6"), "#7C3AED" to "#DB2777",
    ),
    Playlist(
        "p2", "Chill Vibes", "Lo-fi beats and ambient grooves for focus",
        listOf("t4", "t2"), "#0EA5E9" to "#06B6D4",
    ),
    Playlist(
        "p3", "Late Night Jazz", "Smooth grooves for the after-hours",
        listOf("t5", "t3"), "#B45309" to "#1F2937",
    ),
    Playlist(
        "p4", "Discover Weekly", "Fresh picks tailored to your taste",
        listOf("t6", "t1"), "#1E40AF" to "#DB2777",
    ),
    Playlist(
        "p5", "Workout Energy", "Pump-up tracks for your training session",
        listOf("t8", "t1", "t7", "t6"), "#DC2626" to "#F59E0B",
    ),
    Playlist(
        "p6", "Acoustic Mornings", "Soft acoustic songs to start your day",
        listOf("t2", "t7"), "#10B981" to "#EAB308",
    ),
)
