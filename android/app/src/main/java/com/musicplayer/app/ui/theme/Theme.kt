package com.musicplayer.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

/**
 * Material 3 color schemes mirroring the web app's Midnight / Daylight themes.
 *
 * The web app's full 10-theme system is reproduced per-theme in
 * `ui/theme/Themes.kt`; this is the default appearance.
 */
private val MidnightPalette = darkColorScheme(
    primary = Color(0xFF10B981),
    onPrimary = Color.Black,
    primaryContainer = Color(0xFF0E8F65),
    onPrimaryContainer = Color.White,
    secondary = Color(0xFF06B6D4),
    onSecondary = Color.Black,
    background = Color(0xFF09090B),
    onBackground = Color(0xFFFAFAFA),
    surface = Color(0xFF18181B),
    onSurface = Color(0xFFFAFAFA),
    surfaceVariant = Color(0xFF27272A),
    onSurfaceVariant = Color(0xFFA1A1AA),
    outline = Color(0xFF3F3F46),
)

private val DaylightPalette = lightColorScheme(
    primary = Color(0xFF6366F1),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFC7C9FF),
    onPrimaryContainer = Color(0xFF1B1B2C),
    secondary = Color(0xFF22D3EE),
    onSecondary = Color.Black,
    background = Color(0xFFFFFFFF),
    onBackground = Color(0xFF17171C),
    surface = Color(0xFFE7E7EB),
    onSurface = Color(0xFF17171C),
    surfaceVariant = Color(0xFFD6D6DC),
    onSurfaceVariant = Color(0xFF83838D),
    outline = Color(0xFFB9B9C1),
)

@Composable
fun MusicPlayerTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colors = if (darkTheme) MidnightPalette else DaylightPalette
    MaterialTheme(
        colorScheme = colors,
        content = content,
    )
}
