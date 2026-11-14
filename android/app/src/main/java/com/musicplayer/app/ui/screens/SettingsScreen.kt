package com.musicplayer.app.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.GraphicEq
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.layout
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.dp
import com.musicplayer.app.BuildConfig
import com.musicplayer.app.data.EqPresets
import com.musicplayer.app.data.findTrackById
import com.musicplayer.app.ui.theme.BuiltInThemes
import com.musicplayer.app.ui.theme.PlayerTheme
import com.musicplayer.app.ui.theme.ThemeManager
import com.musicplayer.app.viewmodel.PlayerViewModel
import kotlin.math.abs
import kotlin.math.roundToInt

private val PLAYBACK_RATES = listOf(0.5f, 0.75f, 1f, 1.25f, 1.5f, 2f)

private val QUALITY_LABELS = mapOf(
    PlayerViewModel.QUALITY_LOW to "Low (96 kbps)",
    PlayerViewModel.QUALITY_HIGH to "High (320 kbps)",
    PlayerViewModel.QUALITY_LOSSLESS to "Lossless (FLAC 24-bit)",
)

private fun snapRate(value: Float): Float =
    PLAYBACK_RATES.minByOrNull { abs(it - value) } ?: 1f

private fun formatDb(v: Int): String = if (v > 0) "+$v" else "$v"

/**
 * Settings — theme picker (10 built-in themes), equalizer with 10 vertical
 * faders + preset dropdown, playback speed, crossfade, audio quality and an
 * about section. Mirrors the web app's settings dialog + equalizer panel.
 */
@Composable
fun SettingsScreen(viewModel: PlayerViewModel) {
    val eq by viewModel.eq.collectAsState()
    val playbackSpeed by viewModel.playbackSpeed.collectAsState()
    val crossfade by viewModel.crossfade.collectAsState()
    val audioQuality by viewModel.audioQuality.collectAsState()
    val recentPlayed by viewModel.recentPlayed.collectAsState()
    val selectedTheme = ThemeManager.currentTheme

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Text(
            text = "Settings",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground,
        )

        // ------------------------------------------------ Appearance
        SettingsSection("Appearance") {
            Text(
                text = "10 built-in themes restyle the whole player instantly.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(10.dp))
            BuiltInThemes.chunked(2).forEach { rowThemes ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    rowThemes.forEach { theme ->
                        Box(modifier = Modifier.weight(1f)) {
                            ThemeCard(
                                theme = theme,
                                selected = theme.key == selectedTheme.key,
                                onSelect = { viewModel.selectTheme(theme.key) },
                            )
                        }
                    }
                }
                Spacer(Modifier.height(10.dp))
            }
        }

        // ------------------------------------------------ Equalizer
        SettingsSection("Equalizer") {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Filled.GraphicEq,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(18.dp),
                )
                Spacer(Modifier.width(8.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Enable equalizer",
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onBackground,
                    )
                    Text(
                        text = "10 bands, -12…+12 dB",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Switch(
                    checked = eq.enabled,
                    onCheckedChange = { viewModel.setEqEnabled(it) },
                )
            }

            Spacer(Modifier.height(8.dp))
            SettingDropdown(
                options = EqPresets.PRESETS.keys.toList(),
                selected = eq.preset,
                label = { it.replaceFirstChar { c -> c.uppercase() } },
                onSelect = { viewModel.applyEqPresetAndEnable(it) },
                modifier = Modifier.width(220.dp),
            )

            Spacer(Modifier.height(12.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(180.dp)
                    .alpha(if (eq.enabled) 1f else 0.5f),
            ) {
                eq.bands.forEachIndexed { index, band ->
                    Column(
                        modifier = Modifier.weight(1f),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        VerticalSlider(
                            value = band.toFloat(),
                            onValueChange = { viewModel.setEqBand(index, it.roundToInt()) },
                            modifier = Modifier.weight(1f),
                        )
                        Spacer(Modifier.height(4.dp))
                        Text(
                            text = formatDb(band),
                            style = MaterialTheme.typography.labelSmall,
                            color = if (band != 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Text(
                            text = EqPresets.BAND_LABELS.getOrElse(index) { "" },
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }

        // ------------------------------------------------ Playback
        SettingsSection("Playback") {
            Column(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                Text(
                    text = "Playback speed",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onBackground,
                )
                Text(
                    text = "%.2fx".format(playbackSpeed),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.primary,
                )
                Slider(
                    value = snapRate(playbackSpeed),
                    onValueChange = { viewModel.setPlaybackSpeed(snapRate(it)) },
                    valueRange = 0.5f..2f,
                    colors = SliderDefaults.colors(
                        activeTrackColor = MaterialTheme.colorScheme.primary,
                        thumbColor = MaterialTheme.colorScheme.primary,
                    ),
                )
            }

            ToggleRow(
                label = "Fade transitions",
                description = "Smooth fade in/out on play, pause and track change",
                checked = crossfade,
                onCheckedChange = { viewModel.setCrossfade(it) },
            )

            Row(
                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Audio quality",
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onBackground,
                    )
                    Text(
                        text = "Streaming bitrate used for playback",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                SettingDropdown(
                    options = QUALITY_LABELS.keys.toList(),
                    selected = audioQuality,
                    label = { QUALITY_LABELS[it] ?: it },
                    onSelect = { viewModel.setAudioQuality(it) },
                    modifier = Modifier.width(190.dp),
                )
            }
        }

        // ------------------------------------------------ About
        SettingsSection("About") {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(MaterialTheme.colorScheme.surface)
                    .border(
                        BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                        RoundedCornerShape(14.dp),
                    )
                    .padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = Icons.Filled.MusicNote,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(24.dp),
                    )
                }
                Spacer(Modifier.height(10.dp))
                Text(
                    text = "Aurora Player",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Text(
                    text = "Version ${BuildConfig.VERSION_NAME} (demo build)",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    text = "Demo audio streams royalty-free samples from SoundHelix " +
                        "(soundhelix.com). Cover art is generated with gradients. " +
                        "Built with Jetpack Compose and Material 3.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    text = "Recently played: " +
                        recentPlayed.take(3)
                            .mapNotNull { findTrackById(it)?.title }
                            .joinToString(", ")
                            .ifEmpty { "—" },
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

// ------------------------------------------------------------- helpers

@Composable
private fun SettingsSection(title: String, content: @Composable ColumnScope.() -> Unit) {
    Column(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground,
        )
        Spacer(Modifier.height(8.dp))
        content()
    }
}

@Composable
private fun ToggleRow(
    label: String,
    description: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = label,
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onBackground,
            )
            Text(
                text = description,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Switch(checked = checked, onCheckedChange = onCheckedChange)
    }
}

/** Theme swatch card — gradient of the theme palette + accent dot (web: ThemePicker). */
@Composable
private fun ThemeCard(theme: PlayerTheme, selected: Boolean, onSelect: () -> Unit) {
    val borderColor =
        if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(
                BorderStroke(if (selected) 2.dp else 1.dp, borderColor),
                RoundedCornerShape(14.dp),
            )
            .clickable(onClick = onSelect)
            .padding(10.dp),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(Brush.linearGradient(listOf(theme.background, theme.surface))),
        ) {
            Box(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(8.dp)
                    .width(40.dp)
                    .height(4.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(theme.accent),
            )
            if (selected) {
                Icon(
                    imageVector = Icons.Filled.Check,
                    contentDescription = "Selected theme",
                    tint = theme.accent,
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(6.dp)
                        .size(16.dp),
                )
            }
        }
        Spacer(Modifier.height(6.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(10.dp)
                    .clip(CircleShape)
                    .background(theme.accent),
            )
            Spacer(Modifier.width(6.dp))
            Text(
                text = theme.label,
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onBackground,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        Text(
            text = theme.description,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

/** Read-only dropdown built from stable M3 APIs (DropdownMenu + custom trigger). */
@Composable
private fun <T> SettingDropdown(
    options: List<T>,
    selected: T,
    label: (T) -> String,
    onSelect: (T) -> Unit,
    modifier: Modifier = Modifier,
) {
    var expanded by remember { mutableStateOf(false) }
    Box(modifier = modifier) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(10.dp))
                .background(MaterialTheme.colorScheme.surface)
                .border(
                    BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                    RoundedCornerShape(10.dp),
                )
                .clickable { expanded = true }
                .padding(horizontal = 14.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = label(selected),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f),
            )
            Icon(
                imageVector = Icons.Filled.ExpandMore,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(18.dp),
            )
        }
        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
        ) {
            options.forEach { option ->
                DropdownMenuItem(
                    text = {
                        Text(
                            text = label(option),
                            color = if (option == selected) {
                                MaterialTheme.colorScheme.primary
                            } else {
                                MaterialTheme.colorScheme.onSurface
                            },
                        )
                    },
                    onClick = {
                        onSelect(option)
                        expanded = false
                    },
                )
            }
        }
    }
}

/**
 * Vertical fader for the EQ — a horizontal [Slider] rotated 270° so the max
 * value (+12 dB) points up. The layout modifier swaps the measured size so
 * the rotated control fits its box exactly.
 */
@Composable
private fun VerticalSlider(
    value: Float,
    onValueChange: (Float) -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(modifier = modifier, contentAlignment = Alignment.Center) {
        Slider(
            value = value,
            onValueChange = onValueChange,
            valueRange = EqPresets.MIN_DB.toFloat()..EqPresets.MAX_DB.toFloat(),
            steps = 23, // 25 discrete stops: -12 … +12 dB in 1 dB steps
            modifier = Modifier
                .graphicsLayer {
                    rotationZ = 270f
                    transformOrigin = TransformOrigin.Center
                }
                .layout { measurable, constraints ->
                    val placeable = measurable.measure(
                        Constraints.fixed(
                            width = constraints.maxHeight,
                            height = constraints.maxWidth,
                        ),
                    )
                    layout(placeable.width, placeable.height) {
                        placeable.place(
                            x = -(placeable.height - constraints.maxWidth) / 2,
                            y = -(placeable.width - constraints.maxHeight) / 2,
                        )
                    }
                },
        )
    }
}
