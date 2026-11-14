//! Integration tests for library scanning — failure paths must be graceful
//! (progress events, never panics).

use std::fs;

use audio_core::library::{scan_dir, scan_dir_into, Library, ScanProgress};
use crossbeam_channel::bounded;
use tempfile::tempdir;

#[test]
fn scan_reports_file_failed_and_done_for_invalid_audio_file() {
    let dir = tempdir().expect("tempdir");
    // Empty bytes — not a valid MP3. The scanner must report the failure
    // via a `FileFailed` progress event instead of panicking.
    fs::write(dir.path().join("fake.mp3"), b"").expect("write fake.mp3");
    // Non-audio files must be ignored entirely (not counted as failures).
    fs::write(dir.path().join("notes.txt"), b"not audio").expect("write notes.txt");

    let mut lib = Library::new();
    let (tx, rx) = bounded::<ScanProgress>(64);
    let indexed = scan_dir_into(dir.path(), &mut lib, &tx).expect("scan_dir_into must not error");
    drop(tx); // close the channel so the receiver can drain

    assert_eq!(indexed, 0, "nothing should be indexed");
    assert!(lib.entries.is_empty());
    assert!(lib.recent_ids.is_empty());

    let events: Vec<ScanProgress> = rx.iter().collect();
    assert!(
        matches!(&events[0], ScanProgress::Started { total_files: Some(1) }),
        "only the .mp3 should be picked up; first event: {:?}",
        events[0]
    );

    let failures: Vec<(&std::path::Path, &str)> = events
        .iter()
        .filter_map(|e| match e {
            ScanProgress::FileFailed { path, error } => Some((path.as_path(), error.as_str())),
            _ => None,
        })
        .collect();
    assert_eq!(failures.len(), 1, "expected exactly one FileFailed event");
    assert!(failures[0].0.ends_with("fake.mp3"), "failure names the file");
    assert!(!failures[0].1.is_empty(), "failure carries an error message");

    match events.last() {
        Some(ScanProgress::Done { indexed, failed }) => {
            assert_eq!(*indexed, 0);
            assert_eq!(*failed, 1);
        }
        other => panic!("expected a Done event last, got {other:?}"),
    }
}

#[test]
fn scan_dir_sync_wrapper_survives_unreadable_files() {
    let dir = tempdir().expect("tempdir");
    fs::write(dir.path().join("broken.flac"), [0u8; 64]).expect("write broken.flac");

    let lib = scan_dir(dir.path()).expect("scan_dir must return Ok even when all files fail");
    assert!(lib.entries.is_empty(), "no entries from an unreadable file");
    assert!(lib.recent_ids.is_empty());
}

#[test]
fn scan_empty_dir_emits_done_with_zeroes() {
    let dir = tempdir().expect("tempdir");
    let mut lib = Library::new();
    let (tx, rx) = bounded::<ScanProgress>(16);

    let indexed = scan_dir_into(dir.path(), &mut lib, &tx).expect("scan_dir_into must not error");
    drop(tx);

    assert_eq!(indexed, 0);
    let events: Vec<ScanProgress> = rx.iter().collect();
    assert!(matches!(&events[0], ScanProgress::Started { total_files: Some(0) }));
    assert!(matches!(
        events.last(),
        Some(ScanProgress::Done { indexed: 0, failed: 0 })
    ));
}
