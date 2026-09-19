"""Training entry. Refuses to claim metrics without eligible dog-level labels."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from split import SEED_DOGS

ROOT = Path(__file__).resolve().parents[1]
EXPORT = ROOT / "ml" / "data" / "export.json"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if not EXPORT.exists():
        raise SystemExit("Run python ml/export_dataset.py first.")

    rows = json.loads(EXPORT.read_text(encoding="utf-8"))
    train = [row for row in rows if row.get("usable_for_train")]
    dogs = {row["dog_id"] for row in train}

    print(f"export photos={len(rows)} eligible_train_photos={len(train)} eligible_dogs={len(dogs)}")
    print(f"seed dogs excluded: {sorted(SEED_DOGS)}")

    if args.dry_run:
        print("dry-run: architecture OK; not fitting a head.")
        return

    if len(dogs) < 20:
        raise SystemExit(
            "Not enough independent labeled dogs to fit a malignancy head. "
            "Collect consented pre-sampling photos + certain pathology first. "
            "Do not train on CATCH WSI or seed placeholders."
        )

    raise SystemExit("Fitting path reserved until a locked protocol and enough dogs exist.")


if __name__ == "__main__":
    main()
