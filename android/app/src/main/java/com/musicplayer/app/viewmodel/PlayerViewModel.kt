package com.musicplayer.app.viewmodel

import android.app.Application
import android.content.ComponentName
import android.util.Log
import androidx.core.content.ContextCompat
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import com.google.common.util.concurrent.ListenableFuture
import com.musicplayer.app.data.DemoTracks
import com.musicplayer.app.data.EqPresets
import com.musicplayer.app.data.EqSettings
import com.musicplayer.app.data.Persistence
import com.musicplayer.app.data.Track
import com.musicplayer.app.data.allTrackIds
import com.musicplayer.app.data.findTrackById
import com.musicplayer.app.media.MusicPlayerMediaService
import com.musicplayer.app.media.NativeEngine
import com.musicplayer.app.media.NativeEqMapper
import com.musicplayer.app.ui.theme.ThemeManager
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/** Repeat modes — mirrors `RepeatMode` ("off" | "all" | "one") in the web store. */
enum class RepeatMode { OFF, ALL, ONE }

/** Queue snapshot: ordered track ids + the index of the currently playing item. */
data class QueueState(
    val ids: List<String> = emptyList(),
    val currentIndex: Int = -1,
) {
    val currentId: String? get() = ids.getOrNull(currentIndex)
    val isEmpty: Boolean get() = ids.isEmpty()
}

/**
 * Single source of truth for playback state — the Android port of the web
 * app's zustand `player-store`.
 *
 * Talks to [MusicPlayerMediaService] through a Media3 [MediaController]
 * connection. Until the controller is connected (or if connection fails),
 * state is advanced locally so the UI still behaves like the web demo.
 * All state is exposed as [StateFlow]s consumed via `collectAsState()`.
 */
class PlayerViewModel(application: Application) : AndroidViewModel(application) {

    private val appContext = application.applicationContext

    // ---------------------------------------------------------------- state

    private val _queue = MutableStateFlow(QueueState(allTrackIds(), 0))
    val queue: StateFlow<QueueState> = _queue.asStateFlow()

    private val _isPlaying = MutableStateFlow(false)
    val isPlaying: StateFlow<Boolean> = _isPlaying.asStateFlow()

    private val _position = MutableStateFlow(0f) // seconds
    val position: StateFlow<Float> = _position.asStateFlow()

    private val _duration = MutableStateFlow(0f) // seconds
    val duration: StateFlow<Float> = _duration.asStateFlow()

    private val _shuffle = MutableStateFlow(false)
    val shuffle: StateFlow<Boolean> = _shuffle.asStateFlow()

    private val _repeat = MutableStateFlow(RepeatMode.OFF)
    val repeat: StateFlow<RepeatMode> = _repeat.asStateFlow()

    private val _volume = MutableStateFlow(0.8f)
    val volume: StateFlow<Float> = _volume.asStateFlow()

    private val _playbackSpeed = MutableStateFlow(1f)
    val playbackSpeed: StateFlow<Float> = _playbackSpeed.asStateFlow()

    private val _eq = MutableStateFlow(EqSettings())
    val eq: StateFlow<EqSettings> = _eq.asStateFlow()

    private val _crossfade = MutableStateFlow(false)
    val crossfade: StateFlow<Boolean> = _crossfade.asStateFlow()

    private val _audioQuality = MutableStateFlow(QUALITY_HIGH)
    val audioQuality: StateFlow<String> = _audioQuality.asStateFlow()

    private val _likedIds = MutableStateFlow<Set<String>>(emptySet())
    val likedIds: StateFlow<Set<String>> = _likedIds.asStateFlow()

    private val _playCounts = MutableStateFlow<Map<String, Int>>(emptyMap())
    val playCounts: StateFlow<Map<String, Int>> = _playCounts.asStateFlow()

    private val _recentPlayed = MutableStateFlow<List<String>>(emptyList())
    val recentPlayed: StateFlow<List<String>> = _recentPlayed.asStateFlow()

    private val _controllerConnected = MutableStateFlow(false)
    val controllerConnected: StateFlow<Boolean> = _controllerConnected.asStateFlow()

    /** Track resolved for the current queue position (or null when queue is empty). */
    val currentTrack: StateFlow<Track?> = _queue
        .map { state -> state.currentId?.let { findTrackById(it) } }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)

    val currentTrackId: StateFlow<String?> = _queue
        .map { it.currentId }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)

    // ------------------------------------------------------------ media link

    private var mediaController: MediaController? = null
    private var controllerFuture: ListenableFuture<MediaController>? = null
    private var pendingStartPositionMs: Long = 0L

    private val controllerListener = object : Player.Listener {
        override fun onIsPlayingChanged(isPlaying: Boolean) {
            _isPlaying.value = isPlaying
        }

        override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
            val id = mediaItem?.mediaId ?: return
            val state = _queue.value
            val index = state.ids.indexOf(id)
            if (index >= 0 && index != state.currentIndex) {
                _queue.value = state.copy(currentIndex = index)
            }
            _position.value = 0f
            // Record a play for every transition except playlist reshuffles.
            // (MEDIA_ITEM_TRANSITION_REASON_SEEKED does not exist in media3 1.5.1.)
            if (reason != Player.MEDIA_ITEM_TRANSITION_REASON_PLAYLIST_CHANGED) {
                recordPlay(id)
            }
        }

        override fun onPlaybackStateChanged(playbackState: Int) {
            if (playbackState == Player.STATE_READY) {
                mediaController?.duration?.takeIf { it > 0 }?.let {
                    _duration.value = it / 1000f
                }
            }
        }

        override fun onShuffleModeEnabledChanged(enabled: Boolean) {
            _shuffle.value = enabled
        }

        override fun onRepeatModeChanged(repeatMode: Int) {
            _repeat.value = when (repeatMode) {
                Player.REPEAT_MODE_ALL -> RepeatMode.ALL
                Player.REPEAT_MODE_ONE -> RepeatMode.ONE
                else -> RepeatMode.OFF
            }
        }
    }

    init {
        // Load the Rust audio-core cdylib. The player keeps using ExoPlayer
        // for transport, but EQ/volume changes are mirrored to the Rust
        // engine so the biquad math is identical to desktop.
        NativeEngine.ensureInitialised()
        viewModelScope.launch {
            restorePersistedState()
            connectController()
        }
        viewModelScope.launch { positionPoller() }
    }

    /** Streams position/duration while playing; also simulates local playback. */
    private suspend fun positionPoller() {
        var tick = 0
        while (true) {
            val controller = mediaController
            if (controller != null) {
                _position.value = controller.currentPosition / 1000f
                val d = controller.duration
                if (d > 0) _duration.value = d / 1000f
                // Persist playback position roughly every 5 seconds.
                tick++
                if (tick % 20 == 0) {
                    currentTrack.value?.let {
                        Persistence.saveLastPlayed(appContext, it.id, _position.value)
                    }
                }
            } else if (_isPlaying.value) {
                // Simulated clock — keeps the UI fully functional like the web demo.
                val dur = _duration.value
                val next = _position.value + 0.25f
                if (dur > 0f && next >= dur) {
                    _position.value = 0f
                    if (_repeat.value == RepeatMode.ONE) {
                        _duration.value = currentTrack.value?.durationSecs?.toFloat() ?: dur
                    } else if (canAdvance()) {
                        _queue.value = advanceIndex(+1)
                        currentTrack.value?.let { recordPlay(it.id) }
                    } else {
                        _isPlaying.value = false
                    }
                } else {
                    _position.value = next
                }
            }
            delay(250)
        }
    }

    private fun canAdvance(): Boolean {
        val state = _queue.value
        if (state.ids.isEmpty()) return false
        return state.currentIndex + 1 < state.ids.size || _repeat.value == RepeatMode.ALL
    }

    private fun advanceIndex(step: Int): QueueState {
        val state = _queue.value
        if (state.ids.isEmpty()) return state
        var index = state.currentIndex + step
        if (index >= state.ids.size) index = 0
        if (index < 0) index = state.ids.size - 1
        return state.copy(currentIndex = index)
    }

    private fun connectController() {
        try {
            val token = SessionToken(
                appContext,
                ComponentName(appContext, MusicPlayerMediaService::class.java),
            )
            val future = MediaController.Builder(appContext, token).buildAsync()
            controllerFuture = future
            future.addListener({
                try {
                    val controller = future.get()
                    controller.addListener(controllerListener)
                    mediaController = controller
                    _controllerConnected.value = true
                    // Mirror the restored queue + resume position into the session.
                    syncQueueToController(pendingStartPositionMs)
                } catch (t: Throwable) {
                    Log.w(TAG, "MediaController connection failed — falling back to simulated playback", t)
                }
            }, ContextCompat.getMainExecutor(appContext))
        } catch (t: Throwable) {
            Log.w(TAG, "Unable to create session token", t)
        }
    }

    private fun syncQueueToController(startPositionMs: Long = 0L) {
        val controller = mediaController ?: return
        val state = _queue.value
        if (state.ids.isEmpty()) return
        controller.setMediaItems(
            state.ids.map(::mediaItemFor),
            state.currentIndex.coerceIn(0, state.ids.size - 1),
            startPositionMs,
        )
    }

    private fun mediaItemFor(trackId: String): MediaItem {
        val track = findTrackById(trackId)
        val songIndex = DemoTracks.indexOfFirst { it.id == trackId }.coerceAtLeast(0)
        val metadata = MediaMetadata.Builder()
            .setTitle(track?.title ?: trackId)
            .setArtist(track?.artist)
            .setAlbumTitle(track?.album)
            .setGenre(track?.genre)
            .build()
        return MediaItem.Builder()
            .setMediaId(trackId)
            .setUri("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${songIndex + 1}.mp3")
            .setMediaMetadata(metadata)
            .build()
    }

    // ------------------------------------------------------------- actions

    /**
     * Starts a track. [queueIds] defines the queue; when omitted the full
     * demo library is used (web: `playTrack(trackId, queueIds)`).
     */
    fun playTrack(trackId: String, queueIds: List<String>? = null) {
        val ids = queueIds ?: allTrackIds()
        if (ids.isEmpty()) return
        val index = ids.indexOf(trackId).let { if (it >= 0) it else 0 }
        _queue.value = QueueState(ids, index)
        _position.value = 0f
        findTrackById(trackId)?.let { _duration.value = it.durationSecs.toFloat() }

        val controller = mediaController
        if (controller != null) {
            controller.setMediaItems(ids.map(::mediaItemFor), index, 0L)
            controller.prepare()
            controller.play()
        } else {
            _isPlaying.value = true
        }
        recordPlay(trackId)
    }

    fun togglePlayPause() {
        val controller = mediaController
        if (controller != null) {
            if (controller.isPlaying) controller.pause() else controller.play()
        } else {
            _isPlaying.value = !_isPlaying.value
        }
    }

    fun next() {
        val state = _queue.value
        if (state.ids.isEmpty()) return
        if (_repeat.value == RepeatMode.ONE) {
            seekToIndex(state.currentIndex, restart = true)
            return
        }
        var index = state.currentIndex + 1
        if (index >= state.ids.size) {
            if (_repeat.value == RepeatMode.ALL) {
                index = 0
            } else {
                stopAtEnd()
                return
            }
        }
        seekToIndex(index)
    }

    fun prev() {
        val state = _queue.value
        if (state.ids.isEmpty()) return
        if (_position.value > RESTART_THRESHOLD_SEC) {
            seek(0f)
            return
        }
        var index = state.currentIndex - 1
        if (index < 0) index = state.ids.size - 1
        seekToIndex(index)
    }

    private fun stopAtEnd() {
        val controller = mediaController
        _position.value = 0f
        if (controller != null) {
            controller.pause()
            controller.seekTo(0L)
        } else {
            _isPlaying.value = false
        }
    }

    private fun seekToIndex(index: Int, restart: Boolean = false) {
        val state = _queue.value
        if (state.ids.isEmpty()) return
        val clamped = index.coerceIn(0, state.ids.size - 1)
        _queue.value = state.copy(currentIndex = clamped)
        _position.value = 0f
        _duration.value = findTrackById(state.ids[clamped])?.durationSecs?.toFloat() ?: 0f

        val controller = mediaController
        if (controller != null) {
            controller.seekTo(clamped, 0L)
            if (restart || !controller.isPlaying) controller.play()
        } else {
            _isPlaying.value = true
            if (restart) {
                state.ids.getOrNull(clamped)?.let(::recordPlay)
            }
        }
    }

    fun seek(seconds: Float) {
        val clamped = seconds.coerceAtLeast(0f)
        _position.value = clamped
        mediaController?.seekTo((clamped * 1000).toLong())
    }

    fun setShuffle(enabled: Boolean) {
        _shuffle.value = enabled
        mediaController?.shuffleModeEnabled = enabled
    }

    fun toggleShuffle() = setShuffle(!_shuffle.value)

    fun setRepeat(mode: RepeatMode) {
        _repeat.value = mode
        mediaController?.repeatMode = when (mode) {
            RepeatMode.OFF -> Player.REPEAT_MODE_OFF
            RepeatMode.ALL -> Player.REPEAT_MODE_ALL
            RepeatMode.ONE -> Player.REPEAT_MODE_ONE
        }
    }

    /** off → all → one → off (mirrors `cycleRepeat` in the web store). */
    fun cycleRepeat() {
        setRepeat(
            when (_repeat.value) {
                RepeatMode.OFF -> RepeatMode.ALL
                RepeatMode.ALL -> RepeatMode.ONE
                RepeatMode.ONE -> RepeatMode.OFF
            },
        )
    }

    fun setVolume(value: Float) {
        val clamped = value.coerceIn(0f, 1f)
        _volume.value = clamped
        mediaController?.volume = clamped
        // Mirror to the Rust engine so the EQ chain's pre-amp scales accordingly.
        NativeEngine.player()?.setVolume(clamped)
    }

    fun setPlaybackSpeed(rate: Float) {
        val clamped = rate.coerceIn(0.5f, 2f)
        _playbackSpeed.value = clamped
        mediaController?.setPlaybackSpeed(clamped)
    }

    fun setCrossfade(enabled: Boolean) {
        _crossfade.value = enabled
        // ExoPlayer has no built-in crossfade between MediaItems; this is a
        // user preference persisted for future renderer integration.
    }

    fun setAudioQuality(quality: String) {
        _audioQuality.value = quality
        // Quality is recorded as a preference. ExoPlayer adapts the
        // selected MediaItem URL; the Rust engine's lowpass is applied
        // when it is the active renderer (see MusicPlayerMediaService).
    }

    // ---------------------------------------------------------- equalizer

    fun setEqEnabled(enabled: Boolean) {
        _eq.value = _eq.value.copy(enabled = enabled)
        pushEqToNative()
        persistEq()
    }

    fun toggleEq() = setEqEnabled(!_eq.value.enabled)

    fun setEqBand(index: Int, value: Int) {
        val current = _eq.value
        if (index !in current.bands.indices) return
        val bands = current.bands.toMutableList().also {
            it[index] = value.coerceIn(EqPresets.MIN_DB, EqPresets.MAX_DB)
        }
        _eq.value = current.copy(bands = bands, preset = "custom")
        pushEqToNative()
        persistEq()
    }

    fun applyEqPreset(preset: String) {
        val bands = EqPresets.PRESETS[preset] ?: return
        _eq.value = _eq.value.copy(preset = preset, bands = bands)
        pushEqToNative()
        persistEq()
    }

    /** Convenience used by the settings UI: picking a preset implies EQ on. */
    fun applyEqPresetAndEnable(preset: String) {
        applyEqPreset(preset)
        if (!_eq.value.enabled) setEqEnabled(true)
    }

    /**
     * Push the current EQ snapshot into the Rust audio-core engine. The
     * ExoPlayer audio path is unaffected — ExoPlayer has no per-band EQ
     * API — so EQ changes only take audible effect when the Rust engine
     * is the active renderer (desktop parity path). ExoPlayer remains the
     * source of truth for playback transport.
     */
    private fun pushEqToNative() {
        val player = NativeEngine.player() ?: return
        val rustEq = NativeEqMapper.toRust(_eq.value)
        runCatching { player.setEq(rustEq) }
            .onFailure { Log.w(TAG, "Rust setEq failed", it) }
    }

    private fun persistEq() {
        val snapshot = _eq.value
        viewModelScope.launch { Persistence.saveEq(appContext, snapshot) }
    }

    // ------------------------------------------------------------- library

    fun toggleLike(trackId: String) {
        val updated = _likedIds.value.toMutableSet()
        if (trackId in updated) updated.remove(trackId) else updated.add(trackId)
        _likedIds.value = updated
        viewModelScope.launch { Persistence.saveLiked(appContext, updated) }
    }

    /** Reorder queue entries (up/down buttons). Moving the current item is a no-op. */
    fun moveQueueItem(from: Int, to: Int) {
        val state = _queue.value
        if (from !in state.ids.indices || to !in state.ids.indices) return
        if (from == to) return
        if (from == state.currentIndex || to == state.currentIndex) return
        val newIds = state.ids.toMutableList().also {
            val moved = it.removeAt(from)
            it.add(to, moved)
        }
        _queue.value = state.copy(ids = newIds)
        mediaController?.moveMediaItem(from, to)
    }

    // --------------------------------------------------------------- theme

    /** Switches the global theme and persists the choice. */
    fun selectTheme(key: String) {
        ThemeManager.setTheme(key)
        viewModelScope.launch { Persistence.saveTheme(appContext, key) }
    }

    // ---------------------------------------------------- playback history

    private fun recordPlay(trackId: String) {
        val recent = (listOf(trackId) + _recentPlayed.value.filterNot { it == trackId }).take(20)
        _recentPlayed.value = recent

        val counts = _playCounts.value.toMutableMap()
        counts[trackId] = (counts[trackId] ?: 0) + 1
        _playCounts.value = counts

        viewModelScope.launch {
            Persistence.saveHistory(appContext, recent, counts)
            Persistence.saveLastPlayed(appContext, trackId, 0f)
        }
    }

    // ------------------------------------------------------------- restore

    private suspend fun restorePersistedState() {
        val snapshot = Persistence.read(appContext)

        ThemeManager.setTheme(snapshot.themeKey)
        _eq.value = snapshot.eq
        _likedIds.value = snapshot.likedIds
        _playCounts.value = snapshot.playCounts
        _recentPlayed.value = snapshot.recentIds

        // Push the restored EQ + volume to the Rust engine so the biquad
        // chain matches what the user last saved.
        pushEqToNative()
        NativeEngine.player()?.setVolume(_volume.value)

        val state = _queue.value
        val restoredIndex = snapshot.lastTrackId
            ?.let { state.ids.indexOf(it) }
            ?.takeIf { it >= 0 }
            ?: state.currentIndex
        _queue.value = state.copy(currentIndex = restoredIndex)
        _position.value = snapshot.lastPositionSec
        _duration.value = state.ids.getOrNull(restoredIndex)
            ?.let { findTrackById(it)?.durationSecs?.toFloat() }
            ?: 0f
        pendingStartPositionMs = (snapshot.lastPositionSec * 1000).toLong()
    }

    override fun onCleared() {
        mediaController?.removeListener(controllerListener)
        controllerFuture?.let { MediaController.releaseFuture(it) }
        mediaController = null
        controllerFuture = null
        super.onCleared()
    }

    companion object {
        private const val TAG = "PlayerViewModel"
        private const val RESTART_THRESHOLD_SEC = 3f
        const val QUALITY_LOW = "low"
        const val QUALITY_HIGH = "high"
        const val QUALITY_LOSSLESS = "lossless"
    }
}
