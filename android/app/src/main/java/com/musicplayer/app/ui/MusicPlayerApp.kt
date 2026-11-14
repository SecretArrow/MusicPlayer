package com.musicplayer.app.ui

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import com.musicplayer.app.ui.navigation.MusicPlayerNav
import com.musicplayer.app.ui.theme.ThemeManager
import com.musicplayer.app.viewmodel.PlayerViewModel

/**
 * Top-level app composable.
 *
 * Wraps the navigation host in [ThemeManager.applyTheme] using the currently
 * selected theme (defaults to Midnight, restored from DataStore by
 * [PlayerViewModel]). Every screen reads `MaterialTheme.colorScheme`, so a
 * theme switch re-skins the whole player instantly — same strategy as the
 * web app's CSS variable overrides.
 */
@Composable
fun MusicPlayerApp(viewModel: PlayerViewModel = viewModel()) {
    val theme = ThemeManager.currentTheme
    ThemeManager.applyTheme(theme) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colorScheme.background,
        ) {
            MusicPlayerNav(viewModel = viewModel)
        }
    }
}
