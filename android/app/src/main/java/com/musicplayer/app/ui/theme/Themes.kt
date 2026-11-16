package com.musicplayer.app.ui.theme

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector

/**
 * All 10 themes — mirrors `src/data/themes.ts` from the web app.
 *
 * Each theme carries its color palette AND its layout variant, matching the
 * web app's per-theme layout system.
 */
enum class ThemeLayout {
    Classic, Glass, Vinyl, Cassette, Cyber, Focus, Mosaic, Broadcast,
}

data class PlayerTheme(
    val key: String,
    val label: String,
    val description: String,
    val dark: Boolean,
    val layout: ThemeLayout,
    val accent: Color,
    val background: Color,
    val surface: Color,
    val text: Color,
    val textMuted: Color,
    val border: Color,
)

val BuiltInThemes: List<PlayerTheme> = listOf(
    PlayerTheme("midnight", "Midnight", "Deep charcoal with emerald glow",
        dark = true, layout = ThemeLayout.Classic,
        accent = Color(0xFF10B981), background = Color(0xFF09090B),
        surface = Color(0xFF18181B), text = Color(0xFFFAFAFA),
        textMuted = Color(0xFFA1A1AA), border = Color(0xFF27272A)),
    PlayerTheme("aurora", "Aurora", "Glass deck — floating frosted panels",
        dark = true, layout = ThemeLayout.Glass,
        accent = Color(0xFF22D3EE), background = Color(0xFF070B14),
        surface = Color(0xFF101B2D), text = Color(0xFFF0F5FC),
        textMuted = Color(0xFF8CA3C7), border = Color(0xFF1B2A44)),
    PlayerTheme("sunset", "Sunset", "Vinyl lounge — spinning turntable",
        dark = true, layout = ThemeLayout.Vinyl,
        accent = Color(0xFFF59E0B), background = Color(0xFF140C07),
        surface = Color(0xFF2A1A0F), text = Color(0xFFFDF4E3),
        textMuted = Color(0xFFC49A6C), border = Color(0xFF3D2817)),
    PlayerTheme("rosewood", "Rosewood", "Cassette deck — velvet maroon hi-fi",
        dark = true, layout = ThemeLayout.Cassette,
        accent = Color(0xFFFB7185), background = Color(0xFF12070B),
        surface = Color(0xFF2A0F19), text = Color(0xFFFDF0F4),
        textMuted = Color(0xFFC08CA0), border = Color(0xFF3D1524)),
    PlayerTheme("violet", "Violet Night", "Neon terminal — monospace HUD",
        dark = true, layout = ThemeLayout.Cyber,
        accent = Color(0xFFA78BFA), background = Color(0xFF0B0714),
        surface = Color(0xFF1A1230), text = Color(0xFFF8F3FD),
        textMuted = Color(0xFFA293CB), border = Color(0xFF271C48)),
    PlayerTheme("ocean", "Ocean", "Wave focus — immersive stage + dock",
        dark = true, layout = ThemeLayout.Focus,
        accent = Color(0xFF38BDF8), background = Color(0xFF050B12),
        surface = Color(0xFF0C1E30), text = Color(0xFFF3F9FD),
        textMuted = Color(0xFF7FA9C9), border = Color(0xFF13304A)),
    PlayerTheme("forest", "Forest", "Bento garden — tile dashboard",
        dark = true, layout = ThemeLayout.Mosaic,
        accent = Color(0xFF84CC16), background = Color(0xFF070D08),
        surface = Color(0xFF112113), text = Color(0xFFF3FAF3),
        textMuted = Color(0xFF86AC8F), border = Color(0xFF1B3320)),
    PlayerTheme("mono", "Monochrome", "Pure grayscale",
        dark = true, layout = ThemeLayout.Classic,
        accent = Color(0xFFFFFFFF), background = Color(0xFF0A0A0A),
        surface = Color(0xFF1F1F1F), text = Color(0xFFF7F7F7),
        textMuted = Color(0xFF9C9C9C), border = Color(0xFF303030)),
    PlayerTheme("coffee", "Coffee", "Radio console — tuner + studio",
        dark = true, layout = ThemeLayout.Broadcast,
        accent = Color(0xFFE8A33D), background = Color(0xFF100B07),
        surface = Color(0xFF241A11), text = Color(0xFFFBF3E7),
        textMuted = Color(0xFFB99B77), border = Color(0xFF362818)),
    PlayerTheme("daylight", "Daylight", "Clean light mode with indigo accent",
        dark = false, layout = ThemeLayout.Classic,
        accent = Color(0xFF6366F1), background = Color(0xFFFFFFFF),
        surface = Color(0xFFE7E7EB), text = Color(0xFF17171C),
        textMuted = Color(0xFF83838D), border = Color(0xFFD6D6DC)),
)

/** Convenience lookup — mirrors the web app's `getTheme(key)`. */
fun themeByKey(key: String): PlayerTheme =
    BuiltInThemes.firstOrNull { it.key == key } ?: BuiltInThemes.first()
