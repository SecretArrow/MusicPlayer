package com.musicplayer.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.Composable
import com.musicplayer.app.ui.MusicPlayerApp
import com.musicplayer.app.ui.theme.MusicPlayerTheme

/**
 * Main Activity — hosts the Compose UI.
 *
 * Playback logic lives in [com.musicplayer.app.media.MusicPlayerMediaService],
 * which is bound from the ViewModel. This Activity only renders UI.
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MusicPlayerTheme {
                MusicPlayerApp()
            }
        }
    }
}
