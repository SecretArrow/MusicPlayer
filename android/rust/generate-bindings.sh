#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# generate-bindings.sh — build the Rust audio engine for Android and generate
# the UniFFI Kotlin bindings for the app.
#
# What it does:
#   1. Builds `musicplayer-android-rust` (the UniFFI bridge crate) as a cdylib
#      for aarch64-linux-android (release).
#        - Prefers `cargo-ndk` when installed (it wires up the NDK linker).
#        - Falls back to plain `cargo build --target aarch64-linux-android`
#          with the NDK clang wrappers wired via CARGO_TARGET_*_LINKER.
#   2. Runs the crate's own `uniffi-bindgen` binary in **library mode** to
#      extract the proc-macro metadata from the cdylib and emit Kotlin into
#      `android/app/src/main/kotlin/` (package `uniffi.musicplayer`).
#
# Idempotent: safe to re-run any number of times. `cargo build` is
# incremental, and the generated Kotlin is overwritten in place. Set
# SKIP_BUILD=1 to only regenerate bindings from an existing cdylib.
#
# Environment:
#   ANDROID_NDK_ROOT / NDK_HOME / ANDROID_NDK  — path to the Android NDK
#       (auto-discovered under $ANDROID_HOME/ndk/* or ~/Android/Sdk/ndk/*).
#   ANDROID_API_LEVEL — Android API level for the linker wrappers
#       (default 24, matches the app's minSdk).
#   SKIP_BUILD=1 — skip the cargo build, regenerate bindings only.
#
# Exit codes: non-zero on any failure (missing NDK, failed build, etc.).
# ---------------------------------------------------------------------------
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUT_DIR="$SCRIPT_DIR/../app/src/main/kotlin"
ANDROID_API_LEVEL="${ANDROID_API_LEVEL:-24}"

# The Gradle app declares minSdk = 24; arm64 (aarch64-linux-android) is the
# primary ABI. Extra ABIs are built in CI (see .github/workflows/ci-android.yml).
RUST_TARGET="aarch64-linux-android"
LIB_NAME="musicplayer_android"

log() { printf '\n[generate-bindings] %s\n' "$*"; }
die() { printf '[generate-bindings] ERROR: %s\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------------------
# Resolve the cargo target directory. This repo is a cargo workspace rooted at
# REPO_ROOT, so artifacts land in `<repo>/target/<triple>/release/` — not in
# `android/rust/target/`. Ask cargo for the authoritative path, with a
# filesystem fallback if `cargo metadata` is unavailable.
# ---------------------------------------------------------------------------
resolve_target_dir() {
    if command -v cargo >/dev/null 2>&1; then
        (cd "$SCRIPT_DIR" && cargo metadata --format-version 1 --no-deps 2>/dev/null \
            | python3 -c 'import json,sys; print(json.load(sys.stdin)["target_directory"])' 2>/dev/null) \
            && return 0
    fi
    echo "$REPO_ROOT/target"
}
TARGET_DIR="$(resolve_target_dir)"
LIB_PATH="$TARGET_DIR/$RUST_TARGET/release/lib${LIB_NAME}.so"

# ---------------------------------------------------------------------------
# Locate the Android NDK (needed for the plain-cargo linker path; cargo-ndk
# finds it itself, but we surface a clear error early if none is present).
# ---------------------------------------------------------------------------
find_ndk() {
    local candidate
    for candidate in "${ANDROID_NDK_ROOT:-}" "${NDK_HOME:-}" "${ANDROID_NDK:-}"; do
        if [ -n "$candidate" ] && [ -d "$candidate" ]; then
            echo "$candidate"; return 0
        fi
    done
    # setup-android / Android Studio default locations — pick the newest.
    local base
    for base in "${ANDROID_HOME:-}/ndk" "$HOME/Android/Sdk/ndk" "/opt/android-sdk/ndk"; do
        if [ -d "$base" ]; then
            ls -1d "$base"/* 2>/dev/null | sort -V | tail -1
            return 0
        fi
    done
    return 1
}

# ---------------------------------------------------------------------------
# Step 1 — build the cdylib for aarch64-linux-android
# ---------------------------------------------------------------------------
if [ "${SKIP_BUILD:-0}" != "1" ]; then
    if command -v cargo-ndk >/dev/null 2>&1; then
        log "Building cdylib with cargo-ndk ($RUST_TARGET, API $ANDROID_API_LEVEL, release)"
        (cd "$SCRIPT_DIR" && cargo ndk \
            --platform "$ANDROID_API_LEVEL" \
            --target arm64-v8a \
            build --release)
    else
        log "cargo-ndk not found — using plain cargo with NDK linker setup"
        NDK_ROOT="$(find_ndk)" || die "No Android NDK found. Install it or set ANDROID_NDK_ROOT."
        NDK_TOOLCHAIN_BIN="$NDK_ROOT/toolchains/llvm/prebuilt/linux-x86_64/bin"
        [ -d "$NDK_TOOLCHAIN_BIN" ] || die "NDK toolchain dir missing: $NDK_TOOLCHAIN_BIN"
        log "Using NDK at $NDK_ROOT"
        export CARGO_TARGET_AARCH64_LINUX_ANDROID_LINKER="$NDK_TOOLCHAIN_BIN/aarch64-linux-android${ANDROID_API_LEVEL}-clang"
        (cd "$SCRIPT_DIR" && cargo build --release --target "$RUST_TARGET")
    fi
else
    log "SKIP_BUILD=1 — reusing existing cdylib"
fi

[ -f "$LIB_PATH" ] || die "cdylib not found after build: $LIB_PATH"
log "Found cdylib: $LIB_PATH"

# ---------------------------------------------------------------------------
# Step 2 — generate Kotlin bindings in library mode.
#
# Library mode extracts the proc-macro metadata (UNIFFI_META_* symbols) that
# `uniffi::setup_scaffolding!` embedded in the cdylib, so no .udl file is
# needed. Output: $OUT_DIR/uniffi/musicplayer/musicplayer.kt — the Gradle app
# picks up `src/main/kotlin` automatically.
#
# `cargo run --bin uniffi-bindgen` builds the crate's own generator binary
# (declared in Cargo.toml via `uniffi = { features = ["cli"] }`), which is the
# officially recommended way to get `uniffi-bindgen` for UniFFI 0.28.
# ---------------------------------------------------------------------------
log "Generating Kotlin bindings into $OUT_DIR"
mkdir -p "$OUT_DIR"
# Remove only the package we generate — nothing else in the app's Kotlin tree.
rm -rf "$OUT_DIR/uniffi"
(cd "$SCRIPT_DIR" && cargo run --bin uniffi-bindgen -- \
    generate \
    --library "$LIB_PATH" \
    --language kotlin \
    --out-dir "$OUT_DIR")

GENERATED="$OUT_DIR/uniffi/musicplayer/musicplayer.kt"
[ -f "$GENERATED" ] || die "Bindings were not generated: $GENERATED"
log "Done. Generated $GENERATED"
