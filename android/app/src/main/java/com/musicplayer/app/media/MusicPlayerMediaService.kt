package com.musicplayer.app.media

import android.app.PendingIntent
import android.content.Intent
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaLibraryService
import androidx.media3.session.MediaSession
import androidx.media3.session.LibraryResult
import androidx.media3.session.MediaConstants
import androidx.media3.common.MediaMetadata
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture
import com.musicplayer.app.MainActivity
import com.musicplayer.app.R

/**
 * MediaLibraryService — required for Android Auto browsing & playback.
 *
 * Implements:
 * - MediaSession for lock-screen / notification / BT controls.
 * - Browsable media content tree (root → albums → tracks).
 * - Foreground media playback service.
 *
 * The Rust audio engine is used for actual decoding; ExoPlayer handles
 * platform integration (audio focus, MediaSession, Android Auto).
 */
class MusicPlayerMediaService : MediaLibraryService() {

    private var player: ExoPlayer? = null
    private var session: MediaLibrarySession? = null

    override fun onCreate() {
        super.onCreate()
        val audioAttributes = AudioAttributes.Builder()
            .setUsage(C.USAGE_MEDIA)
            .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
            .build()

        player = ExoPlayer.Builder(this)
            .setAudioAttributes(audioAttributes, /* handleAudioFocus = */ true)
            .setHandleAudioBecomingNoisy(true)
            .build().apply {
                addListener(object : Player.Listener {
                    override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
                        // Notify the UI ViewModel here via a shared state holder.
                    }
                })
            }

        val sessionActivityIntent = Intent(this, MainActivity::class.java).let { intent ->
            PendingIntent.getActivity(
                this, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
        }

        val callback = object : MediaLibrarySession.Callback {
            override fun onGetLibraryRoot(
                session: MediaLibrarySession,
                browser: MediaSession.ControllerInfo,
                params: LibraryParams?,
            ): ListenableFuture<LibraryResult<MediaItem>> {
                val root = MediaItem.Builder()
                    .setMediaId(ROOT_ID)
                    .setMediaMetadata(
                        MediaMetadata.Builder()
                            .setTitle("MusicPlayer")
                            .setIsBrowsable(true)
                            .setIsPlayable(false)
                            .setMediaType(MediaMetadata.MEDIA_TYPE_FOLDER_MIXED)
                            .build()
                    )
                    .build()
                return Futures.immediateFuture(LibraryResult.ofItem(root, params))
            }

            override fun onGetChildren(
                session: MediaLibrarySession,
                browser: MediaSession.ControllerInfo,
                parentId: String,
                page: Int,
                pageSize: Int,
                params: LibraryParams?,
            ): ListenableFuture<LibraryResult<com.google.common.collect.ImmutableList<MediaItem>>> {
                val items = when (parentId) {
                    ROOT_ID -> listOf(
                        browsable("albums", "Albums"),
                        browsable("artists", "Artists"),
                        browsable("playlists", "Playlists"),
                        browsable("tracks", "Tracks"),
                    )
                    else -> emptyList()
                }
                return Futures.immediateFuture(
                    LibraryResult.ofItemList(
                        com.google.common.collect.ImmutableList.copyOf(items),
                        params
                    )
                )
            }
        }

        session = MediaLibrarySession.Builder(this, player!!, callback)
            .setSessionActivity(sessionActivityIntent)
            .build()
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        player?.let { p ->
            if (!p.playWhenReady || p.mediaItemCount == 0) {
                stopSelf()
            }
        }
    }

    override fun onDestroy() {
        session?.release()
        player?.release()
        session = null
        player = null
        super.onDestroy()
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaLibrarySession? =
        session

    private fun browsable(id: String, title: String): MediaItem = MediaItem.Builder()
        .setMediaId(id)
        .setMediaMetadata(
            MediaMetadata.Builder()
                .setTitle(title)
                .setIsBrowsable(true)
                .setIsPlayable(false)
                .setMediaType(MediaMetadata.MEDIA_TYPE_FOLDER_ALBUMS)
                .build()
        )
        .build()

    companion object {
        const val ROOT_ID = "root"
    }
}
