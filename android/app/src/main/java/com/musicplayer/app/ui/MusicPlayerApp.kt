package com.musicplayer.app.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.musicplayer.app.ui.screens.HomeScreen

/**
 * Top-level app composable.
 *
 * Hosts the navigation graph + the persistent bottom player bar.
 */
@Composable
fun MusicPlayerApp() {
    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background,
    ) {
        Scaffold(
            bottomBar = { PlayerBottomBar() },
        ) { innerPadding ->
            Box(modifier = Modifier.padding(innerPadding)) {
                HomeScreen()
            }
        }
    }
}

@Composable
private fun PlayerBottomBar() {
    Surface(color = MaterialTheme.colorScheme.surface) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(androidx.compose.foundation.layout.PaddingValues(16.dp)),
            contentAlignment = Alignment.Center,
        ) {
            Text("Player bar", color = MaterialTheme.colorScheme.onSurface)
        }
    }
}
