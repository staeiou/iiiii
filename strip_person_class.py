#!/usr/bin/env python3
"""Patch vendored Human builds to skip COCO class 0 (person)."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent

PATCHES = [
    {
        "path": ROOT / "vendor" / "human" / "human.js",
        "needle": "if(Number.isNaN(c))continue;let d=Lu[c].label",
        "insert": "if(c===0)continue;",
    },
    {
        "path": ROOT / "vendor" / "human" / "human.esm-nobundle.js",
        "needle": "if(Number.isNaN(l))continue;let f=De[l].label",
        "insert": "if(l===0)continue;",
    },
    {
        "path": ROOT / "vendor" / "human" / "human.esm.js",
        "needle": "if (Number.isNaN(classVal)) continue;",
        "insert": "\n    if (classVal === 0) continue;",
    },
]


def apply_patch(path: Path, needle: str, insert: str) -> bool:
    text = path.read_text("utf-8", errors="ignore")

    if insert.strip() in text:
        return False

    idx = text.find(needle)
    if idx == -1:
        raise ValueError(f"Pattern not found in {path}: {needle}")

    new_text = text[: idx + len(needle)] + insert + text[idx + len(needle) :]
    path.write_text(new_text, "utf-8")
    return True


def main() -> None:
    changed = []
    skipped = []
    for patch in PATCHES:
        path = patch["path"]
        if not path.exists():
            raise FileNotFoundError(path)
        updated = apply_patch(path, patch["needle"], patch["insert"])
        if updated:
            changed.append(path)
        else:
            skipped.append(path)

    if changed:
        print("Patched:")
        for path in changed:
            print(f"- {path}")
    if skipped:
        print("Already patched:")
        for path in skipped:
            print(f"- {path}")


if __name__ == "__main__":
    main()
