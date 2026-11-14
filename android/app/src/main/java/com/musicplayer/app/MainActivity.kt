package com.musicplayer.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.musicplayer.app.ui.MusicPlayerApp

/**
 * Main Activity — hosts the Compose UI.
 *
 * Theming is applied inside [com.musicplayer.app.ui.MusicPlayerApp] via
 * [com.musicplayer.app.ui.theme.ThemeManager] (10 built-in themes, default
 * Midnight). Playback lives in
 * [com.musicplayer.app.media.MusicPlayerMediaService], connected from
 * [com.musicplayer.app.viewmodel.PlayerViewModel] through a MediaController.
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MusicPlayerApp()
        }
    }
}
