package com.musicplayer.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
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
import com.musicplayer.app.data.allTrackIds
import com.musicplayer.app.data.findTrackById
import com.musicplayer.app.viewmodel.PlayerViewModel
import java.util.Calendar

/**
 * Home — greeting header, "Recently played" album cards, "Your playlists",
 * and the trending track list. Mirrors the web app's Android home view.
 */
@Composable
fun HomeScreen(
    viewModel: PlayerViewModel,
    onOpenPlayer: () -> Unit,
) {
    val recentPlayed by viewModel.recentPlayed.collectAsState()
    val currentTrackId by viewModel.currentTrackId.collectAsState()
    val isPlaying by viewModel.isPlaying.collectAsState()
    val likedIds by viewModel.likedIds.collectAsState()

    val allIds = remember { allTrackIds() }
    val recentTracks = remember(recentPlayed) {
        recentPlayed.mapNotNull { findTrackById(it) }.ifEmpty { DemoTracks.take(6) }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        // Greeting header
        item {
            Column {
                Text(
                    text = "Welcome back",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    text = greeting(),
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onBackground,
                )
            }
        }

        // Recently played — horizontal album cards with gradient covers
        item { SectionHeader("Recently played") }
        item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                items(recentTracks, key = { it.id }) { track ->
                    AlbumCard(track = track, onClick = {
                        viewModel.playTrack(track.id, allIds)
                        onOpenPlayer()
                    })
                }
            }
        }

        // Your playlists
        item { SectionHeader("Your playlists") }
        item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                items(DemoPlaylists, key = { it.id }) { playlist ->
                    PlaylistCard(playlist = playlist, onClick = {
                        playlist.trackIds.firstOrNull()?.let { viewModel.playTrack(it, playlist.trackIds) }
                    })
                }
            }
        }

        // Track list
        item {
            SectionHeader(
                title = "Trending now",
                actionLabel = "Play all",
                onAction = { DemoTracks.firstOrNull()?.let { viewModel.playTrack(it.id, allIds) } },
            )
        }
        items(DemoTracks, key = { it.id }) { track ->
            TrackRowItem(
                track = track,
                isCurrent = track.id == currentTrackId,
                isLiked = track.id in likedIds,
                onClick = { viewModel.playTrack(track.id, allIds) },
                onToggleLike = { viewModel.toggleLike(track.id) },
                trailingContent = {
                    if (track.id == currentTrackId && isPlaying) {
                        Text(
                            text = "Playing",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.primary,
                        )
                    }
                },
            )
        }
    }
}

private fun greeting(): String {
    val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
    return when (hour) {
        in 5..11 -> "Good morning"
        in 12..17 -> "Good afternoon"
        else -> "Good evening"
    }
}

/** Square gradient album card — web: "Made for you" card. */
@Composable
private fun AlbumCard(track: Track, onClick: () -> Unit) {
    Column(
        modifier = Modifier
            .width(132.dp)
            .clip(RoundedCornerShape(14.dp))
            .clickable(onClick = onClick)
            .padding(4.dp),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(1f)
                .clip(RoundedCornerShape(14.dp))
                .background(Brush.linearGradient(track.gradientColors)),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = track.album,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Bold,
                color = androidx.compose.ui.graphics.Color.White.copy(alpha = 0.9f),
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(10.dp),
            )
        }
        Spacer(Modifier.height(6.dp))
        Text(
            text = track.title,
            style = MaterialTheme.typography.bodySmall,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onBackground,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Text(
            text = track.artist,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

/** Square gradient playlist card — web: playlist card in "Made for you". */
@Composable
private fun PlaylistCard(playlist: Playlist, onClick: () -> Unit) {
    Column(
        modifier = Modifier
            .width(132.dp)
            .clip(RoundedCornerShape(14.dp))
            .clickable(onClick = onClick)
            .padding(4.dp),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(1f)
                .clip(RoundedCornerShape(14.dp))
                .background(Brush.linearGradient(playlist.gradientColors)),
            contentAlignment = Alignment.BottomStart,
        ) {
            Text(
                text = "${playlist.trackCount} songs",
                style = MaterialTheme.typography.labelSmall,
                color = androidx.compose.ui.graphics.Color.White.copy(alpha = 0.9f),
                modifier = Modifier.padding(8.dp),
            )
        }
        Spacer(Modifier.height(6.dp))
        Text(
            text = playlist.title,
            style = MaterialTheme.typography.bodySmall,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onBackground,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Text(
            text = playlist.description,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}
