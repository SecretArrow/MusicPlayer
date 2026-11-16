package com.musicplayer.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.musicplayer.app.data.DemoPlaylists
import com.musicplayer.app.data.DemoTracks
import com.musicplayer.app.data.Playlist
import com.musicplayer.app.data.Track
import com.musicplayer.app.viewmodel.PlayerViewModel

private val LIBRARY_TABS = listOf("Tracks", "Albums", "Artists", "Genres", "Playlists")

/** Simple grouping containers derived from [DemoTracks]. */
private data class AlbumGroup(
    val name: String,
    val artist: String,
    val year: Int,
    val tracks: List<Track>,
)

private data class ArtistGroup(val name: String, val tracks: List<Track>)

private data class GenreGroup(val name: String, val tracks: List<Track>)

/**
 * Library — Tracks / Albums / Artists / Genres / Playlists tabs.
 * Groupings are derived from `data/Tracks.kt` (web parity: Your Library).
 */
@Composable
fun LibraryScreen(viewModel: PlayerViewModel) {
    var selectedTab by rememberSaveable { mutableIntStateOf(0) }

    val albums = remember(DemoTracks) {
        DemoTracks.groupBy { it.album }.map { (album, tracks) ->
            AlbumGroup(album, tracks.first().artist, tracks.first().year, tracks)
        }
    }
    val artists = remember(DemoTracks) {
        DemoTracks.groupBy { it.artist }.map { (artist, tracks) -> ArtistGroup(artist, tracks) }
    }
    val genres = remember(DemoTracks) {
        DemoTracks.groupBy { it.genre }.map { (genre, tracks) -> GenreGroup(genre, tracks) }
    }

    Column(modifier = Modifier.fillMaxSize()) {
        Text(
            text = "Your Library",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground,
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp),
        )

        TabRow(
            selectedTabIndex = selectedTab,
            containerColor = androidx.compose.ui.graphics.Color.Transparent,
            contentColor = MaterialTheme.colorScheme.onBackground,
        ) {
            LIBRARY_TABS.forEachIndexed { index, title ->
                Tab(
                    selected = selectedTab == index,
                    onClick = { selectedTab = index },
                    text = { Text(title, maxLines = 1) },
                )
            }
        }

        when (selectedTab) {
            0 -> TracksTab(viewModel)
            1 -> AlbumsTab(viewModel, albums)
            2 -> ArtistsTab(viewModel, artists)
            3 -> GenresTab(viewModel, genres)
            else -> PlaylistsTab(viewModel)
        }
    }
}

// ----------------------------------------------------------------- Tracks

@Composable
private fun TracksTab(viewModel: PlayerViewModel) {
    val currentTrackId by viewModel.currentTrackId.collectAsState()
    val likedIds by viewModel.likedIds.collectAsState()
    val allIds = remember { DemoTracks.map { it.id } }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        items(DemoTracks, key = { it.id }) { track ->
            TrackRowItem(
                track = track,
                isCurrent = track.id == currentTrackId,
                isLiked = track.id in likedIds,
                onClick = { viewModel.playTrack(track.id, allIds) },
                onToggleLike = { viewModel.toggleLike(track.id) },
            )
        }
    }
}

// ----------------------------------------------------------------- Albums

@Composable
private fun AlbumsTab(viewModel: PlayerViewModel, albums: List<AlbumGroup>) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        items(albums, key = { it.name }) { album ->
            GroupRow(
                title = album.name,
                subtitle = "${album.artist} • ${album.tracks.size} tracks • ${album.year}",
                colors = album.tracks.first().gradientColors,
                isCircle = false,
                onClick = {
                    val ids = album.tracks.map { it.id }
                    viewModel.playTrack(ids.first(), ids)
                },
            )
        }
    }
}

// ---------------------------------------------------------------- Artists

@Composable
private fun ArtistsTab(viewModel: PlayerViewModel, artists: List<ArtistGroup>) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        items(artists, key = { it.name }) { artist ->
            GroupRow(
                title = artist.name,
                subtitle = "${artist.tracks.size} ${if (artist.tracks.size == 1) "track" else "tracks"}",
                colors = artist.tracks.first().gradientColors,
                isCircle = true,
                onClick = {
                    val ids = artist.tracks.map { it.id }
                    viewModel.playTrack(ids.first(), ids)
                },
            )
        }
    }
}

// ----------------------------------------------------------------- Genres

@Composable
private fun GenresTab(viewModel: PlayerViewModel, genres: List<GenreGroup>) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        items(genres, key = { it.name }) { genre ->
            GroupRow(
                title = genre.name,
                subtitle = "${genre.tracks.size} ${if (genre.tracks.size == 1) "track" else "tracks"}",
                colors = genre.tracks.first().gradientColors,
                isCircle = false,
                onClick = {
                    val ids = genre.tracks.map { it.id }
                    viewModel.playTrack(ids.first(), ids)
                },
            )
        }
    }
}

// -------------------------------------------------------------- Playlists

@Composable
private fun PlaylistsTab(viewModel: PlayerViewModel) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        items(DemoPlaylists, key = { it.id }) { playlist ->
            PlaylistRow(playlist = playlist, onClick = {
                playlist.trackIds.firstOrNull()?.let { viewModel.playTrack(it, playlist.trackIds) }
            })
        }
    }
}

@Composable
private fun PlaylistRow(playlist: Playlist, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 8.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        GradientCover(colors = playlist.gradientColors, size = 48.dp, cornerRadius = 10.dp)
        Spacer(Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = playlist.title,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onBackground,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = "${playlist.trackCount} songs • ${playlist.curator}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        IconButton(onClick = onClick) {
            Icon(
                imageVector = Icons.Filled.PlayArrow,
                contentDescription = "Play ${playlist.title}",
                tint = MaterialTheme.colorScheme.primary,
            )
        }
    }
}

/** Generic grouping row with gradient cover (album / artist / genre). */
@Composable
private fun GroupRow(
    title: String,
    subtitle: String,
    colors: List<androidx.compose.ui.graphics.Color>,
    isCircle: Boolean,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 8.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(if (isCircle) CircleShape else RoundedCornerShape(10.dp))
                .background(Brush.linearGradient(colors)),
            contentAlignment = Alignment.Center,
        ) { }
        Spacer(Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onBackground,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}
