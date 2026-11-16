package com.musicplayer.app.ui.theme

import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance

/**
 * Holds the currently selected [PlayerTheme] and applies it to the whole app.
 *
 * Parity with the web app: `src/data/themes.ts` overrides CSS variables at the
 * root; here we rebuild the Material 3 [ColorScheme] from the theme's
 * accent / background / surface / text / border colors, choosing the dark or
 * light base scheme depending on [PlayerTheme.dark].
 */
object ThemeManager {

    /** Backing Compose state so reads inside composables subscribe to updates. */
    private var themeState = mutableStateOf(themeByKey("midnight"))

    /** Currently applied theme. Defaults to Midnight (matches the web app default). */
    val currentTheme: PlayerTheme
        get() = themeState.value

    val allThemes: List<PlayerTheme>
        get() = BuiltInThemes

    /** Switches the active theme by key (falls back to Midnight for unknown keys). */
    fun setTheme(key: String) {
        themeState.value = themeByKey(key)
    }

    /**
     * Wraps [content] in a [MaterialTheme] derived from the given [theme].
     * All screens should rely on `MaterialTheme.colorScheme` so a theme switch
     * instantly re-skins the entire player — same strategy as the web app.
     */
    @Composable
    fun applyTheme(theme: PlayerTheme, content: @Composable () -> Unit) {
        MaterialTheme(
            colorScheme = theme.toColorScheme(),
            content = content,
        )
    }
}

/**
 * Builds a full Material 3 [ColorScheme] from a [PlayerTheme].
 */
fun PlayerTheme.toColorScheme(): ColorScheme {
    val base = if (dark) darkColorScheme() else lightColorScheme()

    // Readable text on top of the accent (dark accents get white text).
    val onAccent = if (accent.luminance() > 0.5f) Color(0xFF0B0B0C) else Color.White
    val accentContainer = accent.copy(alpha = 0.18f)

    return base.copy(
        primary = accent,
        onPrimary = onAccent,
        primaryContainer = accentContainer,
        onPrimaryContainer = text,
        secondary = accent,
        onSecondary = onAccent,
        secondaryContainer = accentContainer,
        onSecondaryContainer = text,
        background = background,
        onBackground = text,
        surface = surface,
        onSurface = text,
        surfaceVariant = border,
        onSurfaceVariant = textMuted,
        surfaceContainerLowest = background,
        surfaceContainerLow = surface,
        surfaceContainer = surface,
        surfaceContainerHigh = surface,
        surfaceContainerHighest = border,
        outline = border,
        inverseSurface = text,
        inverseOnSurface = background,
    )
}
