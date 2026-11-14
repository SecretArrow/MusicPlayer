//! Integration tests for `TrackQueue` used as a shared queue
//! (`Arc<RwLock<TrackQueue>>`) across threads.

use std::sync::mpsc;
use std::thread;
use std::time::{Duration, Instant};

use audio_core::queue::{shared_queue, RepeatMode, ShuffleMode};

fn ids(prefix: &str, n: usize) -> Vec<String> {
    (0..n).map(|i| format!("{prefix}-{i:02}")).collect()
}

#[test]
fn shared_queue_walks_forward_and_stops_at_end() {
    let q = shared_queue(ids("t", 10));
    let mut g = q.write();

    assert_eq!(g.len(), 10);
    assert_eq!(g.current_id(), Some("t-00"));

    let mut visited = Vec::new();
    while let Some(id) = g.next() {
        visited.push(id.to_string());
    }
    let expected: Vec<String> = (1..10).map(|i| format!("t-{i:02}")).collect();
    assert_eq!(visited, expected, "next() walks the queue in order");
    assert_eq!(g.next(), None, "repeat=off stops at the end");
}

#[test]
fn enable_shuffle_preserves_current_and_disable_restores_order() {
    let original = ids("track", 10);
    let q = shared_queue(original.clone());

    {
        let mut g = q.write();
        assert!(g.jump_to("track-03"), "track-03 exists in the queue");
    }

    {
        let mut g = q.write();
        g.enable_shuffle();
        assert_eq!(g.shuffle, ShuffleMode::On);
        // The currently-playing track must survive the shuffle...
        assert_eq!(g.current_id(), Some("track-03"));
        // ...and the original ordering is stashed for the restore.
        assert_eq!(
            g.original_order.as_deref(),
            Some(original.as_slice()),
            "enable_shuffle stores the original order"
        );
        assert_eq!(g.len(), 10, "shuffling must not add or drop tracks");
    }

    // next() walks the shuffled upcoming tracks exactly once each.
    let mut visited: Vec<String> = Vec::new();
    let current_after_walk;
    {
        let mut g = q.write();
        while let Some(id) = g.next() {
            let id = id.to_string();
            assert!(!visited.contains(&id), "next() revisited {id}");
            visited.push(id);
        }
        current_after_walk = g.current_id().expect("non-empty queue").to_string();
    }
    assert_eq!(
        visited.len(),
        6,
        "walked only the tracks after the current one"
    );
    for id in &visited {
        assert!(original.contains(id), "{id} came out of nowhere");
    }

    {
        let mut g = q.write();
        g.disable_shuffle();
        assert_eq!(g.shuffle, ShuffleMode::Off);
        assert_eq!(
            g.items, original,
            "disable_shuffle restores the original order"
        );
        assert!(g.original_order.is_none(), "restore consumes the stash");
        assert_eq!(
            g.current_id().expect("non-empty queue"),
            current_after_walk.as_str(),
            "current track preserved through enable→disable"
        );
    }
}

#[test]
fn repeat_modes_are_honored_on_shared_queue() {
    let q = shared_queue(ids("t", 3));
    let mut g = q.write();

    // Off: stops at the end of the queue.
    assert_eq!(g.next(), Some("t-01"));
    assert_eq!(g.next(), Some("t-02"));
    assert_eq!(g.next(), None, "repeat=off must stop at the end");

    // All: wraps around to the first track.
    g.repeat = RepeatMode::All;
    assert_eq!(g.next(), Some("t-00"));
    assert_eq!(g.next(), Some("t-01"));

    // One: replays the current track indefinitely.
    g.repeat = RepeatMode::One;
    assert_eq!(g.next(), Some("t-01"));
    assert_eq!(g.next(), Some("t-01"));
    assert_eq!(g.next(), Some("t-01"));
}

/// Spawn a writer thread (enqueue/play_next/remove/move_item) and a reader
/// thread hammering the read side simultaneously. Completion is signalled
/// over a channel and awaited with a timeout, so a deadlock on the
/// `RwLock` surfaces as a test failure instead of a hung suite.
#[test]
fn enqueue_play_next_remove_move_across_threads_without_deadlock() {
    let q = shared_queue(ids("t", 10)); // current = "t-00"
    let (done_tx, done_rx) = mpsc::channel::<Result<(), String>>();

    // --- Writer thread: a deterministic sequence of mutations. ---
    {
        let q = q.clone();
        let done_tx = done_tx.clone();
        thread::spawn(move || {
            let res = (|| {
                let mut g = q.write();
                g.enqueue("t-10"); // len 11
                g.play_next("play-next"); // len 12, inserted at index 1
                let removed = g.remove(6); // drops "t-05" -> len 11
                let moved = g.move_item(1, 10); // "play-next" to the back
                if removed.as_deref() != Some("t-05") {
                    return Err(format!(
                        "remove(6) returned {removed:?}, expected Some(\"t-05\")"
                    ));
                }
                if !moved {
                    return Err("move_item(1, 10) returned false".into());
                }
                Ok(())
            })();
            let _ = done_tx.send(res);
        });
    }

    // --- Reader thread: invariant checks under the read lock. ---
    {
        let q = q.clone();
        let done_tx = done_tx.clone();
        thread::spawn(move || {
            let res = (|| {
                let deadline = Instant::now() + Duration::from_secs(3);
                while Instant::now() < deadline {
                    let g = q.read();
                    if g.is_empty() {
                        return Err("queue unexpectedly empty".into());
                    }
                    if g.len() > 12 {
                        return Err(format!("queue length out of range: {}", g.len()));
                    }
                    if g.current_id() != Some("t-00") {
                        return Err(format!("current track changed: {:?}", g.current_id()));
                    }
                    if g.items.first().map(String::as_str) != Some("t-00") {
                        return Err("first item changed".into());
                    }
                    drop(g);
                    thread::sleep(Duration::from_millis(1));
                }
                Ok(())
            })();
            let _ = done_tx.send(res);
        });
    }
    drop(done_tx);

    // --- Timeout pattern: any deadlock fails fast instead of hanging. ---
    for _ in 0..2 {
        match done_rx.recv_timeout(Duration::from_secs(10)) {
            Ok(Ok(())) => {}
            Ok(Err(msg)) => panic!("worker thread reported: {msg}"),
            Err(mpsc::RecvTimeoutError::Timeout) => {
                panic!("worker did not finish within 10s — deadlock suspected")
            }
            Err(mpsc::RecvTimeoutError::Disconnected) => {
                panic!("a worker thread panicked before reporting completion")
            }
        }
    }

    // Deterministic final state (only the writer mutated the queue).
    let g = q.read();
    let expected: Vec<String> = [
        "t-00",
        "t-01",
        "t-02",
        "t-03",
        "t-04",
        "t-06",
        "t-07",
        "t-08",
        "t-09",
        "t-10",
        "play-next",
    ]
    .iter()
    .map(|s| s.to_string())
    .collect();
    assert_eq!(
        g.items, expected,
        "final queue order after cross-thread ops"
    );
    assert_eq!(g.len(), 11);
    assert_eq!(g.current_id(), Some("t-00"));
    assert_eq!(g.repeat, RepeatMode::Off);
}
