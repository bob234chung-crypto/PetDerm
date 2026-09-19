"""Dog-level master split. Seed/demo dogs must not enter train."""

from __future__ import annotations

import json
from pathlib import Path

SEED_DOGS = {"DOG-A1B2C3", "DOG-B2C3D4", "DOG-C3D4E5"}


def assign_split(dog_public_id: str, labeled: bool) -> str:
    if dog_public_id in SEED_DOGS or not labeled:
        return "holdout_unlabeled_or_seed"
    digest = sum(ord(ch) for ch in dog_public_id)
    bucket = digest % 10
    if bucket < 6:
        return "train"
    if bucket < 8:
        return "calibration"
    return "locked_internal_test"


def write_manifest(rows: list[dict], dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps({"unit": "dog_id", "rows": rows}, ensure_ascii=False, indent=2), encoding="utf-8")
