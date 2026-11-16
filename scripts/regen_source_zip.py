#!/usr/bin/env python3
"""Regenerate the MusicPlayer native source zip from the current working tree.

Excludes build artifacts, node_modules, .git, target/, and other large/derived
directories so the zip stays small and contains only source.
"""
from __future__ import annotations

import os
import zipfile
from pathlib import Path

ROOT = Path("/home/z/my-project")
OUT = ROOT / "download" / "musicplayer-native-source.zip"

# Directories (relative to ROOT) to skip entirely.
SKIP_DIRS = {
    ".git",
    "node_modules",
    "target",
    ".next",
    "dist",
    "build",
    ".turbo",
    "coverage",
    "skills",            # bundled skill files, not part of the music player
    "upload",             # user-uploaded inputs
    "scripts",            # helper scripts not part of the deliverable source
    ".zscripts",
    "agent-ctx",
    "db",
    ".vscode",
    ".idea",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
}

# File patterns to skip (by suffix or exact name).
SKIP_SUFFIXES = {
    ".pyc",
    ".pyo",
    ".log",
    ".pid",
    ".lock",
    ".db",
    ".sqlite",
    ".sqlite3",
}
SKIP_EXACT = {
    "bun.lock",
    "package-lock.json",
    "yarn.lock",
    ".DS_Store",
    ".env",
    ".env.local",
    ".env.production",
    "gradle-wrapper.jar",  # binary, regenerable via gradle
}


def should_skip_dir(rel: Path) -> bool:
    parts = rel.parts
    return any(p in SKIP_DIRS for p in parts)


def should_skip_file(name: str) -> bool:
    if name in SKIP_EXACT:
        return True
    return any(name.endswith(suf) for suf in SKIP_SUFFIXES)


def main() -> int:
    if not OUT.parent.exists():
        OUT.parent.mkdir(parents=True)

    count = 0
    total_bytes = 0
    # Use ZIP_DEFLATED for smaller size.
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for dirpath, dirnames, filenames in os.walk(ROOT):
            rel_dir = Path(dirpath).relative_to(ROOT)
            # Prune skipped dirs in-place so os.walk doesn't descend into them.
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
            # Also skip if any path component is in SKIP_DIRS (defensive).
            if should_skip_dir(rel_dir):
                dirnames[:] = []
                continue
            for name in sorted(filenames):
                if should_skip_file(name):
                    continue
                full = Path(dirpath) / name
                # Skip the output zip itself.
                if full.resolve() == OUT.resolve():
                    continue
                # Skip files larger than 25 MB (sanity bound; no source file
                # should be that large).
                try:
                    size = full.stat().st_size
                except OSError:
                    continue
                if size > 25 * 1024 * 1024:
                    continue
                arcname = str(rel_dir / name) if str(rel_dir) != "." else name
                # Normalize path separators for cross-platform zip.
                arcname = arcname.replace(os.sep, "/")
                zf.write(full, arcname)
                count += 1
                total_bytes += size

    out_size = OUT.stat().st_size
    print(f"Wrote {OUT}")
    print(f"  files:     {count}")
    print(f"  raw bytes: {total_bytes:,}")
    print(f"  zip bytes: {out_size:,}")
    print(f"  ratio:     {out_size / total_bytes:.2%}" if total_bytes else "  (empty)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
