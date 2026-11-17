package com.musicplayer.app

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import com.musicplayer.app.media.NativeEngine

/**
 * Application entry point.
 *
 * Initializes the playback notification channel used by
 * [com.musicplayer.app.media.MusicPlayerMediaService]. The Rust audio engine
 * is initialised eagerly on a background thread so the biquad EQ chain is
 * ready by the time [com.musicplayer.app.viewmodel.PlayerViewModel] needs it.
 */
class MusicPlayerApp : Application() {
    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        // Warm up the Rust cdylib in the background. Failure is non-fatal —
        // ExoPlayer remains the primary playback engine.
        Thread({ NativeEngine.ensureInitialised() }, "native-engine-init").start()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val channel = NotificationChannel(
            getString(R.string.notification_channel_id),
            getString(R.string.notification_channel_name),
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = getString(R.string.notification_channel_description)
            setShowBadge(false)
        }
        getSystemService(NotificationManager::class.java)
            .createNotificationChannel(channel)
    }
}
