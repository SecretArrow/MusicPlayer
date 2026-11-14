//! Integration tests for metadata extraction failure paths.
//!
//! `read_from_bytes` is the Android SAF / network-stream entry point; it must
//! return errors (never panic) on malformed input. When the `metadata`
//! feature is disabled the final test below is compiled out, and the other
//! tests still hold because the stub returns `MetadataError::Disabled`.

use std::sync::Arc;

use audio_core::metadata::read_from_bytes;

#[test]
fn read_from_bytes_garbage_returns_error_not_panic() {
    let garbage = Arc::new(b"this is definitely not an audio file format".to_vec());
    let result = read_from_bytes(garbage);
    assert!(
        result.is_err(),
        "garbage bytes must produce Err, got {result:?}"
    );
}

#[test]
fn read_from_bytes_empty_returns_error_not_panic() {
    let result = read_from_bytes(Arc::new(Vec::new()));
    assert!(
        result.is_err(),
        "empty bytes must produce Err, got {result:?}"
    );
}

#[test]
fn read_from_bytes_short_random_bytes_return_error_not_panic() {
    let result = read_from_bytes(Arc::new(vec![0xDE, 0xAD, 0xBE, 0xEF, 0x00, 0x01]));
    assert!(
        result.is_err(),
        "random bytes must produce Err, got {result:?}"
    );
}

// Only compiled when the `metadata` feature is on; skipped otherwise.
#[cfg(feature = "metadata")]
#[test]
fn read_from_bytes_error_is_a_parse_or_io_variant() {
    use audio_core::metadata::MetadataError;

    let err =
        read_from_bytes(Arc::new(vec![0xDE, 0xAD, 0xBE, 0xEF])).expect_err("must fail on garbage");
    assert!(
        matches!(err, MetadataError::Parse(_) | MetadataError::Io(_)),
        "expected a Parse/Io error variant, got: {err:?}"
    );
}
