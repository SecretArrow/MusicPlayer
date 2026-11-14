//! Integration tests for the DSP effects chain:
//! biquad EQ presets, preamp gain, and the soft clipper.

use std::f64::consts::PI;

use audio_core::effects::{soft_clip, BiquadEq, EqSettings};

const SR: f64 = 44_100.0;

/// Generate a sine wave as interleaved-ready f32 samples.
fn sine(freq: f64, amplitude: f64, samples: usize) -> Vec<f32> {
    (0..samples)
        .map(|i| (amplitude * (2.0 * PI * freq * i as f64 / SR).sin()) as f32)
        .collect()
}

/// RMS of `buf`, skipping the first `skip` samples so filter startup
/// transients don't skew the measurement.
fn rms(buf: &[f32], skip: usize) -> f64 {
    let tail = &buf[skip.min(buf.len())..];
    let energy: f64 = tail
        .iter()
        .map(|s| {
            let x = *s as f64;
            x * x
        })
        .sum();
    (energy / tail.len() as f64).sqrt()
}

/// Build an enabled EQ chain from a preset; the chain is a pure passthrough
/// while `enabled == false`, so these tests must opt in explicitly.
fn eq_with_preset(preset: &str, preamp_db: f32) -> BiquadEq {
    let mut settings = EqSettings::default();
    settings.enabled = true;
    settings.preamp_db = preamp_db;
    settings.apply_preset(preset);
    BiquadEq::from_settings(SR, &settings)
}

#[test]
fn bass_boost_raises_rms_of_50hz_sine() {
    let input = sine(50.0, 0.15, 22_050); // 0.5 s, quiet enough to stay unclipped
    let mut output = input.clone();
    eq_with_preset("bass boost", 0.0).process_buffer(&mut output);

    assert!(
        output.iter().all(|s| s.is_finite()),
        "EQ chain must never produce NaN/inf"
    );
    assert!(
        output.iter().all(|s| s.abs() <= 1.0),
        "boosted 0.15-amplitude sine must stay below the clipper's engage point"
    );

    let in_rms = rms(&input, 1_024);
    let out_rms = rms(&output, 1_024);
    // This engine's low-shelf design lifts 50 Hz by ~+1.4 dB (ratio ≈ 1.17,
    // measured & matched against the theoretical biquad response); assert a
    // strict, noise-proofed increase over the flat (identity) chain.
    assert!(
        out_rms > in_rms * 1.05,
        "bass boost should raise 50 Hz RMS above flat (in={in_rms:.5}, out={out_rms:.5})"
    );
}

#[test]
fn treble_boost_raises_rms_of_8khz_sine() {
    let input = sine(8_000.0, 0.15, 22_050);
    let mut output = input.clone();
    eq_with_preset("treble boost", 0.0).process_buffer(&mut output);

    assert!(
        output.iter().all(|s| s.is_finite() && s.abs() <= 1.0),
        "treble path must stay finite and unclipped for a quiet sine"
    );

    let in_rms = rms(&input, 1_024);
    let out_rms = rms(&output, 1_024);
    assert!(
        out_rms > in_rms * 1.5,
        "treble boost should raise 8 kHz RMS by >50% (in={in_rms:.5}, out={out_rms:.5})"
    );
}

#[test]
fn preamp_6db_roughly_doubles_amplitude() {
    let input = sine(1_000.0, 0.25, 22_050);
    let mut output = input.clone();
    // "flat" keeps all bands at 0 dB (transparent filters), so the preamp
    // is the only active stage.
    eq_with_preset("flat", 6.0).process_buffer(&mut output);

    let in_rms = rms(&input, 1_024);
    let out_rms = rms(&output, 1_024);
    let ratio = out_rms / in_rms;

    // 6 dB == ×1.9953 linear; small tolerance for float error.
    assert!(
        (ratio - 2.0).abs() < 0.15,
        "6 dB preamp should ~double RMS, got ratio={ratio} (in={in_rms:.5}, out={out_rms:.5})"
    );
    assert!(
        output.iter().all(|s| s.abs() <= 1.0),
        "0.25-amplitude input doubled must not clip"
    );
}

#[test]
fn soft_clip_bounds_output() {
    // Identity inside the linear zone (threshold = 0.8).
    assert!((soft_clip(0.5) - 0.5).abs() < 1e-9);
    assert!((soft_clip(-0.5) + 0.5).abs() < 1e-9);
    assert!((soft_clip(0.8) - 0.8).abs() < 1e-9);

    // Smooth saturation: y(±1.0) ≈ 0.95 — bounded, monotonic, NO negative spike.
    // (The old formula produced ≈ -332 at x = 1.001 — this is the regression we guard.)
    let y1 = soft_clip(1.0);
    assert!(
        y1 > 0.8 && y1 <= 1.0,
        "soft_clip(1.0) = {y1}, expected ~0.95"
    );
    let yn1 = soft_clip(-1.0);
    assert!(yn1 < -0.8 && yn1 >= -1.0, "soft_clip(-1.0) = {yn1}");
    let y1001 = soft_clip(1.001);
    assert!(
        y1001 > 0.8 && y1001 <= 1.0,
        "soft_clip(1.001) = {y1001} — old formula exploded to ≈ -332 here"
    );

    // Saturates towards ±1 without ever escaping [-1, 1].
    for x in [
        1.5, 2.0, 5.0, 10.0, 100.0, 1e6, -1.5, -2.0, -5.0, -10.0, -100.0, -1e6,
    ] {
        let y = soft_clip(x);
        assert!(
            y.abs() <= 1.0,
            "soft_clip({x}) = {y} escapes the [-1, 1] range"
        );
    }
}
