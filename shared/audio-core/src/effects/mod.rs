//! Equalizer — 10-band biquad peaking filter chain + preamp.
//!
//! Mirrors the web app's `EqSettings` exactly: same frequencies, same dB
//! range, same presets. The DSP runs on the audio thread.

use serde::{Deserialize, Serialize};

/// EQ band center frequencies (Hz). Matches the web app's `EQ_FREQS`.
pub const EQ_FREQS: [f64; 10] = [
    32.0, 64.0, 125.0, 250.0, 500.0, 1000.0, 2000.0, 4000.0, 8000.0, 16000.0,
];

/// One band of the equalizer.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct EqBand {
    /// Center frequency (Hz).
    pub freq: f64,
    /// Gain in dB.
    pub gain_db: f32,
    /// Q factor (1.0 = ~1 octave bandwidth).
    pub q: f64,
}

/// EQ settings — serializable, mirrors the web app's `EqSettings`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EqSettings {
    pub enabled: bool,
    pub preset: String,
    /// Preamp in dB, applied after the EQ chain.
    pub preamp_db: f32,
    /// 10 bands, gain dB each.
    pub bands: [f32; 10],
}

impl Default for EqSettings {
    fn default() -> Self {
        Self {
            enabled: false,
            preset: "flat".into(),
            preamp_db: 0.0,
            bands: preset_gains("flat"),
        }
    }
}

/// Built-in EQ presets — same 23 presets as the web app.
mod __presets {
    use std::sync::OnceLock;

    static PRESETS: OnceLock<Vec<(&'static str, [f32; 10])>> = OnceLock::new();

    pub fn get() -> &'static [(&'static str, [f32; 10])] {
        PRESETS.get_or_init(|| {
            vec![
                ("flat", [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]),
                (
                    "bass boost",
                    [8.0, 6.0, 4.0, 2.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
                ),
                (
                    "bass reducer",
                    [-8.0, -6.0, -4.0, -2.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
                ),
                (
                    "treble boost",
                    [0.0, 0.0, 0.0, 0.0, 0.0, 2.0, 4.0, 6.0, 8.0, 8.0],
                ),
                (
                    "treble reducer",
                    [0.0, 0.0, 0.0, 0.0, 0.0, -2.0, -4.0, -6.0, -8.0, -8.0],
                ),
                (
                    "vocal",
                    [-3.0, -2.0, 0.0, 3.0, 5.0, 5.0, 3.0, 1.0, 0.0, -1.0],
                ),
                ("rock", [5.0, 4.0, 2.0, -1.0, -2.0, 0.0, 3.0, 5.0, 5.0, 4.0]),
                (
                    "pop",
                    [-2.0, -1.0, 2.0, 4.0, 5.0, 3.0, 0.0, -1.0, -1.0, -2.0],
                ),
                ("jazz", [4.0, 3.0, 1.0, 2.0, -1.0, -1.0, 0.0, 1.0, 3.0, 4.0]),
                (
                    "classical",
                    [4.0, 3.0, 2.0, 0.0, -1.0, -1.0, 0.0, 2.0, 3.0, 4.0],
                ),
                (
                    "electronic",
                    [6.0, 5.0, 1.0, 0.0, -2.0, 2.0, 1.0, 3.0, 5.0, 6.0],
                ),
                ("dance", [8.0, 6.0, 2.0, 0.0, -2.0, 1.0, 3.0, 5.0, 6.0, 7.0]),
                (
                    "hip-hop",
                    [8.0, 6.0, 3.0, 1.0, -1.0, -1.0, 1.0, 3.0, 4.0, 4.0],
                ),
                (
                    "acoustic",
                    [4.0, 3.0, 2.0, 1.0, 1.0, 2.0, 2.0, 3.0, 4.0, 3.0],
                ),
                ("r&b", [6.0, 4.0, 2.0, 0.0, -2.0, 1.0, 3.0, 4.0, 5.0, 4.0]),
                ("latin", [3.0, 3.0, 1.0, 0.0, 1.0, 2.0, 3.0, 3.0, 4.0, 4.0]),
                ("reggae", [2.0, 1.0, 0.0, 2.0, 3.0, 3.0, 1.0, 0.0, 1.0, 2.0]),
                ("metal", [5.0, 4.0, 3.0, 0.0, -1.0, 0.0, 3.0, 4.0, 5.0, 5.0]),
                (
                    "country",
                    [3.0, 1.0, 0.0, 1.0, 2.0, 2.0, 2.0, 1.0, 1.0, 2.0],
                ),
                (
                    "speech",
                    [-6.0, -4.0, -1.0, 2.0, 4.0, 4.0, 3.0, 1.0, 0.0, -2.0],
                ),
                (
                    "loudness",
                    [7.0, 5.0, 0.0, -2.0, -3.0, -2.0, 0.0, 3.0, 6.0, 7.0],
                ),
                (
                    "small speakers",
                    [6.0, 5.0, 3.0, 1.0, 0.0, 0.0, 1.0, 2.0, 2.0, 2.0],
                ),
                ("soft", [0.0, 1.0, 2.0, 3.0, 3.0, 2.0, 1.0, 0.0, -1.0, -2.0]),
            ]
        })
    }
}

/// Resolve a preset name to its 10-band gains. Returns `flat` if unknown.
pub fn preset_gains(name: &str) -> [f32; 10] {
    __presets::get()
        .iter()
        .find(|(k, _)| *k == name)
        .map(|(_, v)| *v)
        .unwrap_or([0.0; 10])
}

/// All preset names (sorted by insertion order).
pub fn preset_names() -> Vec<&'static str> {
    __presets::get().iter().map(|(k, _)| *k).collect()
}

impl EqSettings {
    /// Apply a preset by name. Returns the new band gains.
    pub fn apply_preset(&mut self, name: &str) -> [f32; 10] {
        let gains = preset_gains(name);
        self.preset = name.to_string();
        self.bands = gains;
        gains
    }

    /// Set a single band's gain (0-indexed, 0..10).
    pub fn set_band(&mut self, idx: usize, gain_db: f32) {
        if idx < 10 {
            self.bands[idx] = gain_db;
            self.preset = "custom".into();
        }
    }
}

/// A second-order biquad peaking/notch filter (RBJ cookbook).
#[derive(Debug, Clone, Copy)]
pub struct Biquad {
    pub b0: f64,
    pub b1: f64,
    pub b2: f64,
    pub a1: f64,
    pub a2: f64,
    pub x1: f64,
    pub x2: f64,
    pub y1: f64,
    pub y2: f64,
}

impl Biquad {
    /// Peaking EQ filter (RBJ cookbook).
    pub fn peaking(sample_rate: f64, freq: f64, gain_db: f32, q: f64) -> Self {
        let a = 10.0_f64.powf(gain_db as f64 / 40.0);
        let w0 = 2.0 * std::f64::consts::PI * freq / sample_rate;
        let cos_w0 = w0.cos();
        let sin_w0 = w0.sin();
        let alpha = sin_w0 / (2.0 * q);
        let b0 = 1.0 + alpha * a;
        let b1 = -2.0 * cos_w0;
        let b2 = 1.0 - alpha * a;
        let a0 = 1.0 + alpha / a;
        let a1 = -2.0 * cos_w0;
        let a2 = 1.0 - alpha / a;
        Self {
            b0: b0 / a0,
            b1: b1 / a0,
            b2: b2 / a0,
            a1: a1 / a0,
            a2: a2 / a0,
            x1: 0.0,
            x2: 0.0,
            y1: 0.0,
            y2: 0.0,
        }
    }

    /// Low-shelf (for band 0).
    pub fn low_shelf(sample_rate: f64, freq: f64, gain_db: f32, q: f64) -> Self {
        let a = 10.0_f64.powf(gain_db as f64 / 40.0);
        let w0 = 2.0 * std::f64::consts::PI * freq / sample_rate;
        let cos_w0 = w0.cos();
        let sin_w0 = w0.sin();
        let alpha = sin_w0 / (2.0 * q);
        let b0 = (a + 1.0) - (a - 1.0) * cos_w0 + 2.0 * alpha * a.sqrt();
        let b1 = 2.0 * ((a - 1.0) - (a + 1.0) * cos_w0);
        let b2 = (a + 1.0) - (a - 1.0) * cos_w0 - 2.0 * alpha * a.sqrt();
        let a0 = (a + 1.0) + (a - 1.0) * cos_w0 + 2.0 * alpha * a.sqrt();
        let a1 = -2.0 * ((a - 1.0) + (a + 1.0) * cos_w0);
        let a2 = (a + 1.0) + (a - 1.0) * cos_w0 - 2.0 * alpha * a.sqrt();
        Self {
            b0: b0 / a0,
            b1: b1 / a0,
            b2: b2 / a0,
            a1: a1 / a0,
            a2: a2 / a0,
            x1: 0.0,
            x2: 0.0,
            y1: 0.0,
            y2: 0.0,
        }
    }

    /// High-shelf (for band 9).
    pub fn high_shelf(sample_rate: f64, freq: f64, gain_db: f32, q: f64) -> Self {
        let a = 10.0_f64.powf(gain_db as f64 / 40.0);
        let w0 = 2.0 * std::f64::consts::PI * freq / sample_rate;
        let cos_w0 = w0.cos();
        let sin_w0 = w0.sin();
        let alpha = sin_w0 / (2.0 * q);
        let b0 = a * ((a + 1.0) + (a - 1.0) * cos_w0 + 2.0 * alpha * a.sqrt());
        let b1 = -2.0 * a * ((a - 1.0) + (a + 1.0) * cos_w0);
        let b2 = a * ((a + 1.0) + (a - 1.0) * cos_w0 - 2.0 * alpha * a.sqrt());
        let a0 = (a + 1.0) - (a - 1.0) * cos_w0 + 2.0 * alpha * a.sqrt();
        let a1 = 2.0 * ((a - 1.0) - (a + 1.0) * cos_w0);
        let a2 = (a + 1.0) - (a - 1.0) * cos_w0 - 2.0 * alpha * a.sqrt();
        Self {
            b0: b0 / a0,
            b1: b1 / a0,
            b2: b2 / a0,
            a1: a1 / a0,
            a2: a2 / a0,
            x1: 0.0,
            x2: 0.0,
            y1: 0.0,
            y2: 0.0,
        }
    }

    /// Process a single sample (direct form I).
    #[inline]
    pub fn process(&mut self, x: f64) -> f64 {
        let y = self.b0 * x + self.b1 * self.x1 + self.b2 * self.x2
            - self.a1 * self.y1
            - self.a2 * self.y2;
        self.x2 = self.x1;
        self.x1 = x;
        self.y2 = self.y1;
        self.y1 = y;
        y
    }
}

/// A 10-band EQ chain (low-shelf + 8 peaking + high-shelf), matching the
/// web app's exact filter topology.
#[derive(Debug, Clone)]
pub struct BiquadEq {
    filters: [Biquad; 10],
    preamp_linear: f64,
    enabled: bool,
}

impl BiquadEq {
    /// Build an EQ chain at `sample_rate` from `EqSettings`.
    pub fn from_settings(sample_rate: f64, settings: &EqSettings) -> Self {
        let mut filters = [Biquad {
            b0: 1.0,
            b1: 0.0,
            b2: 0.0,
            a1: 0.0,
            a2: 0.0,
            x1: 0.0,
            x2: 0.0,
            y1: 0.0,
            y2: 0.0,
        }; 10];
        for (i, f) in filters.iter_mut().enumerate() {
            let freq = EQ_FREQS[i];
            let gain = settings.bands[i];
            let q = 1.0;
            *f = if i == 0 {
                Biquad::low_shelf(sample_rate, freq, gain, q)
            } else if i == 9 {
                Biquad::high_shelf(sample_rate, freq, gain, q)
            } else {
                Biquad::peaking(sample_rate, freq, gain, q)
            };
        }
        let preamp_linear = 10.0_f64.powf(settings.preamp_db as f64 / 20.0);
        Self {
            filters,
            preamp_linear,
            enabled: settings.enabled,
        }
    }

    /// Process one sample (passes through all 10 filters + preamp).
    #[inline]
    pub fn process(&mut self, x: f64) -> f64 {
        if !self.enabled {
            return x;
        }
        let mut y = x;
        for f in &mut self.filters {
            y = f.process(y);
        }
        y * self.preamp_linear
    }

    /// Process a buffer in-place (stereo interleaved).
    pub fn process_buffer(&mut self, buf: &mut [f32]) {
        if !self.enabled {
            return;
        }
        for s in buf.iter_mut() {
            let y = self.process(*s as f64);
            // Soft clip to prevent clipping when preamp pushes beyond ±1.
            *s = soft_clip(y) as f32;
        }
    }
}

/// Soft saturator — identity for |x| <= 0.8, smooth tanh-based saturation
/// asymptotically approaching ±1 beyond the threshold. Monotonic, C1-continuous,
/// and never produces the negative spikes a naive `1 - 1/(3·(x-1))` formula
/// would produce just past the threshold.
#[inline]
pub fn soft_clip(x: f64) -> f64 {
    const T: f64 = 0.8; // threshold where saturation begins
    if x.abs() <= T {
        return x;
    }
    let sign = x.signum();
    let a = x.abs() - T; // distance beyond threshold
                         // y = T + (1-T)·tanh(a/(1-T)): equals T at a=0 with slope 1, asymptotes to ±1.
    sign * (T + (1.0 - T) * (a / (1.0 - T)).tanh())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn flat_preset_is_all_zero() {
        let g = preset_gains("flat");
        assert!(g.iter().all(|&v| v == 0.0));
    }

    #[test]
    fn unknown_preset_falls_back_to_flat() {
        let g = preset_gains("nonexistent");
        assert!(g.iter().all(|&v| v == 0.0));
    }

    #[test]
    fn all_23_presets_present() {
        assert_eq!(preset_names().len(), 23);
        for name in preset_names() {
            let g = preset_gains(name);
            assert_eq!(g.len(), 10);
        }
    }

    #[test]
    fn apply_preset_sets_bands_and_name() {
        let mut s = EqSettings::default();
        s.apply_preset("rock");
        assert_eq!(s.preset, "rock");
        assert_eq!(s.bands, preset_gains("rock"));
    }

    #[test]
    fn set_band_marks_custom() {
        let mut s = EqSettings::default();
        s.apply_preset("rock");
        s.set_band(0, 9.0);
        assert_eq!(s.preset, "custom");
        assert_eq!(s.bands[0], 9.0);
    }

    #[test]
    fn eq_chain_passes_signal_through_when_disabled() {
        let mut settings = EqSettings::default();
        settings.enabled = false;
        let mut eq = BiquadEq::from_settings(44100.0, &settings);
        let mut buf = [0.5_f32; 8];
        eq.process_buffer(&mut buf);
        assert!(buf.iter().all(|&v| (v - 0.5).abs() < 1e-6));
    }

    #[test]
    fn eq_chain_modifies_signal_when_enabled() {
        let mut settings = EqSettings::default();
        settings.enabled = true;
        settings.apply_preset("bass boost");
        let mut eq = BiquadEq::from_settings(44100.0, &settings);
        let mut buf = [0.5_f32; 1024];
        eq.process_buffer(&mut buf);
        // Bass boost should amplify low frequencies — at least some samples
        // should be louder than the input.
        assert!(buf.iter().any(|&v| v > 0.5));
    }

    #[test]
    fn soft_clip_keeps_signal_in_safe_range() {
        assert!(soft_clip(2.0) < 1.0);
        assert!(soft_clip(-2.0) > -1.0);
        assert!((soft_clip(0.5) - 0.5).abs() < 1e-9);
    }

    #[test]
    fn soft_clip_is_monotonic_and_bounded_everywhere() {
        // The old formula produced ~-332 at x≈1.001. Verify that zone is sane now.
        for i in 0..2000 {
            let x = -3.0 + (i as f64) * 0.003;
            let y = soft_clip(x);
            assert!(y.abs() <= 1.0, "unbounded at x={x}: y={y}");
            assert!(!y.is_nan(), "NaN at x={x}");
        }
        // Monotonicity: y must not decrease as x increases.
        let mut prev = soft_clip(-3.0);
        for i in 1..2000 {
            let x = -3.0 + (i as f64) * 0.003;
            let y = soft_clip(x);
            assert!(y >= prev - 1e-12, "non-monotonic at x={x}: {prev} -> {y}");
            prev = y;
        }
        // Continuity at the threshold: no jump around |x|=0.8 or |x|=1.
        for probe in [0.79, 0.8, 0.81, 0.99, 1.0, 1.01, 1.2] {
            for d in [-0.001, 0.0, 0.001] {
                let y = soft_clip(probe + d);
                assert!(y.abs() <= 1.0 && !y.is_nan());
            }
        }
        // Identity inside threshold.
        assert!((soft_clip(0.8) - 0.8).abs() < 1e-12);
        // Smooth saturation beyond: y(1.0) should be ~0.95, NOT negative.
        let y1 = soft_clip(1.0);
        assert!(y1 > 0.8 && y1 <= 1.0, "y(1.0)={y1}");
        // Asymptote approaches ±1.
        assert!(soft_clip(10.0) > 0.98);
        assert!(soft_clip(-10.0) < -0.98);
    }
}
