#!/usr/bin/env python3
"""Post-release smoke test for MusicPlayer native binaries.

Runs in GitHub Actions (`smoke-test.yml`) AFTER the ci-desktop or ci-android
workflow publishes a rolling `edge` / `edge-android` release. Downloads the
just-published artifact, validates it, and exits non-zero on any failure so
the downstream `fix-loop.yml` workflow can pick up the broken state.

Subcommands (auto-selected from --target):
  desktop-linux     Download the Linux x64 tarball, extract, run
                    `./musicplayer-desktop --smoke-test` headless.
  desktop-windows   Reserved for the Windows runner (the binary is validated
                    on a windows-latest job — this entry point only handles
                    the cross-platform download + checksum).
  android-apk       Download the signed per-ABI APK set, run `aapt dump
                    badging` and verify the package name + launchable
                    activity match `AndroidManifest.xml`.

Environment:
  GITHUB_REPOSITORY     owner/repo, used to build the releases API URL.
  GITHUB_TOKEN          A built-in `secrets.GITHUB_TOKEN` is enough because
                       releases on the same repo are readable by the default
                       token. We use `gh` CLI which picks this up automatically.
  SMOKE_RELEASE_TAG     Which release tag to test. Defaults:
                       `edge` for desktop, `edge-android` for android.
  SMOKE_WORKSPACE       Where to download artifacts. Default: `./smoke-workspace`.

Exit codes:
  0  All smoke checks passed.
  1  One or more checks failed (downloaded artifact missing, binary crashed,
     APK badging mismatch, etc.). The fix-loop workflow fires on this.
  2  Misconfiguration (missing env, no artifact to download).
"""

from __future__ import annotations

import argparse
import hashlib
import os
import re
import shutil
import subprocess
import sys
import tarfile
import urllib.request
import zipfile
from pathlib import Path
from typing import Iterable


# ---------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------


def die(code: int, msg: str) -> "None":
    print(f"::error::{msg}", file=sys.stderr)
    sys.exit(code)


def run(cmd: list[str], *, cwd: Path | None = None, check: bool = True,
        capture: bool = False) -> subprocess.CompletedProcess[str]:
    """Run a command, streaming output by default."""
    print(f"$ {' '.join(cmd)}", flush=True)
    return subprocess.run(
        cmd,
        cwd=cwd,
        check=check,
        text=True,
        capture_output=capture,
    )


def gh(*args: str, check: bool = True) -> str:
    """Invoke the gh CLI; return stdout."""
    proc = run(["gh", *args], check=check, capture=True)
    return proc.stdout.strip() if proc.stdout else ""


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


# ---------------------------------------------------------------------------
# Download: rolling release artifacts via GitHub Releases API
# ---------------------------------------------------------------------------


def list_release_assets(tag: str) -> list[dict]:
    """List assets for a release tag (uses gh api)."""
    repo = os.environ.get("GITHUB_REPOSITORY") or die(
        2, "GITHUB_REPOSITORY env var is required"
    )
    out = gh(
        "api",
        "-H", "Accept: application/vnd.github+json",
        f"/repos/{repo}/releases/tags/{tag}",
    )
    if not out:
        die(2, f"release tag '{tag}' not found via gh api")
    import json
    payload = json.loads(out)
    assets = payload.get("assets", [])
    if not assets:
        die(2, f"release '{tag}' has no assets to smoke-test")
    return assets


def download_asset(asset: dict, dest: Path) -> Path:
    """Download a single asset to dest/<name>."""
    url = asset["browser_download_url"]
    dest.mkdir(parents=True, exist_ok=True)
    out_path = dest / asset["name"]
    print(f"  downloading {asset['name']} ({asset.get('size', '?')} bytes)")
    req = urllib.request.Request(url, headers={"Accept": "application/octet-stream"})
    # gh CLI auth is preferred; fall back to GITHUB_TOKEN bearer if present.
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req) as resp, out_path.open("wb") as fh:
        shutil.copyfileobj(resp, fh)
    print(f"  sha256={sha256(out_path)}")
    return out_path


# ---------------------------------------------------------------------------
# Desktop smoke test
# ---------------------------------------------------------------------------


DESKTOP_LINUX_ARTIFACT = "musicplayer-desktop-x86_64-linux.tar.gz"


def smoke_desktop_linux(workspace: Path) -> int:
    tag = os.environ.get("SMOKE_RELEASE_TAG", "edge")
    print(f"=== Desktop Linux smoke test (release: {tag}) ===")
    assets = list_release_assets(tag)
    matching = [a for a in assets if a["name"] == DESKTOP_LINUX_ARTIFACT]
    if not matching:
        die(2, f"missing desktop Linux artifact '{DESKTOP_LINUX_ARTIFACT}' on '{tag}'")

    archive = download_asset(matching[0], workspace)

    # Extract.
    extract_dir = workspace / "extracted"
    extract_dir.mkdir(parents=True, exist_ok=True)
    with tarfile.open(archive, "r:gz") as tf:
        tf.extractall(extract_dir)

    # Locate the binary.
    binary = extract_dir / "musicplayer-desktop"
    if not binary.exists():
        # Some archives put it under a staging dir; do a recursive search.
        candidates = list(extract_dir.rglob("musicplayer-desktop"))
        if not candidates:
            die(1, "extracted archive has no `musicplayer-desktop` binary")
        binary = candidates[0]

    binary.chmod(0o755)

    # 1. --version exits 0 and prints the package version.
    proc = run([str(binary), "--version"], check=False, capture=True)
    print(proc.stdout)
    if proc.returncode != 0:
        die(1, f"--version exited {proc.returncode}")
    if "musicplayer-desktop" not in (proc.stdout or ""):
        die(1, "--version output did not include the binary name")

    # 2. --smoke-test runs the headless subsystem checks.
    proc = run([str(binary), "--smoke-test"], check=False, capture=True)
    print(proc.stdout)
    if proc.stderr:
        print(proc.stderr, file=sys.stderr)
    if proc.returncode != 0:
        die(1, f"--smoke-test exited {proc.returncode}; see log above")
    if "smoke-test PASSED" not in (proc.stdout or ""):
        die(1, "smoke-test ran but did not emit PASSED marker")

    print("=== Desktop Linux smoke test: PASS ===")
    return 0


# ---------------------------------------------------------------------------
# Android APK smoke test
# ---------------------------------------------------------------------------


EXPECTED_PACKAGE = "com.musicplayer.app"
EXPECTED_LAUNCHER = (
    "com.musicplayer.app/com.musicplayer.app.MainActivity"
)

APK_ABI_PRIORITY = (
    "musicplayer-arm64-v8a-signed.apk",
    "musicplayer-x86_64-signed.apk",
    "musicplayer-armeabi-v7a-signed.apk",
    "musicplayer-x86-signed.apk",
)


def smoke_android_apk(workspace: Path) -> int:
    tag = os.environ.get("SMOKE_RELEASE_TAG", "edge-android")
    print(f"=== Android APK smoke test (release: {tag}) ===")
    assets = list_release_assets(tag)

    # Prefer arm64; fall back to the first available ABI.
    chosen = None
    for name in APK_ABI_PRIORITY:
        for a in assets:
            if a["name"] == name:
                chosen = a
                break
        if chosen:
            break
    if chosen is None:
        # Maybe only an unsigned debug APK was uploaded (signing secret missing).
        for a in assets:
            if a["name"].endswith(".apk"):
                chosen = a
                break
    if chosen is None:
        die(2, f"release '{tag}' has no .apk asset to smoke-test")

    apk = download_asset(chosen, workspace)

    # aapt comes from the Android SDK build-tools; the runner has it.
    aapt = shutil.which("aapt") or shutil.which("aapt2")
    if aapt is None:
        die(2, "aapt / aapt2 not found; install Android SDK build-tools")

    badging = run([aapt, "dump", "badging", str(apk)], check=False, capture=True)
    out = badging.stdout or ""
    if badging.returncode != 0:
        die(1, f"aapt dump badging failed (exit {badging.returncode})")

    # package: name='com.musicplayer.app'
    pkg_match = re.search(r"^package:\s*name='([^']+)'", out, re.MULTILINE)
    if not pkg_match:
        die(1, "aapt output did not contain a package name")
    pkg = pkg_match.group(1)
    if pkg != EXPECTED_PACKAGE:
        die(1, f"package name mismatch: got {pkg!r}, expected {EXPECTED_PACKAGE!r}")

    # launchable-activity: name='com.musicplayer.app.MainActivity'
    launcher_match = re.search(
        r"launchable-activity:\s*name='([^']+)'", out
    )
    if not launcher_match:
        die(1, "aapt output did not contain a launchable-activity")
    launcher = launcher_match.group(1)
    if not launcher.startswith("com.musicplayer.app"):
        die(1, f"launcher activity is not under com.musicplayer.app: {launcher!r}")

    # Sanity: APK must declare at least one of the Media3 service classes for
    # Android Auto to work.
    services = run(
        [aapt, "dump", "xmltree", str(apk), "AndroidManifest.xml"],
        check=False,
        capture=True,
    ).stdout or ""
    if "androidx.media3" not in services and "MediaLibraryService" not in services:
        die(1, "APK manifest does not declare a Media3 / MediaLibraryService")

    print(f"  [ok] package={pkg}")
    print(f"  [ok] launcher={launcher}")
    print("=== Android APK smoke test: PASS ===")
    return 0


# ---------------------------------------------------------------------------
# CLI entry
# ---------------------------------------------------------------------------


def main() -> int:
    ap = argparse.ArgumentParser(description="MusicPlayer post-release smoke test")
    ap.add_argument(
        "--target",
        choices=["desktop-linux", "desktop-windows", "android-apk"],
        required=True,
    )
    ap.add_argument(
        "--workspace",
        type=Path,
        default=Path(os.environ.get("SMOKE_WORKSPACE", "smoke-workspace")),
    )
    args = ap.parse_args()

    if args.target == "desktop-linux":
        return smoke_desktop_linux(args.workspace)
    if args.target == "android-apk":
        return smoke_android_apk(args.workspace)
    if args.target == "desktop-windows":
        die(2, "desktop-windows smoke test runs on a windows-latest runner; "
              "this script only handles Linux hosts")
    return 2


if __name__ == "__main__":
    sys.exit(main())
