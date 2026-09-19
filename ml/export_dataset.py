"""Export de-identified research photos + optional pathology labels. Never reads CATCH WSI."""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from split import assign_split

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "prisma" / "dev.db"
OUT = ROOT / "ml" / "data" / "export.json"


def main() -> None:
    if not DB.exists():
        raise SystemExit(f"Missing {DB}. Run npx prisma db push && npx tsx prisma/seed.ts")

    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        """
        SELECT
          d.publicId AS dog_id,
          l.publicId AS lesion_id,
          l.site,
          p.view,
          p.researchPath,
          pr.malignancyLabel,
          pr.certainty
        FROM Photo p
        JOIN PhotoSession s ON s.id = p.sessionId
        JOIN Lesion l ON l.id = s.lesionId
        JOIN Dog d ON d.id = l.dogId
        LEFT JOIN PathologyRecord pr ON pr.lesionId = l.id
        """
    ).fetchall()
    conn.close()

    exported = []
    for row in rows:
        certain = row["certainty"] == "certain" and row["malignancyLabel"] in ("yes", "no")
        exported.append(
            {
                "dog_id": row["dog_id"],
                "lesion_id": row["lesion_id"],
                "view": row["view"],
                "research_path": row["researchPath"],
                "site": row["site"],
                "eligible_malignancy_label": row["malignancyLabel"] if certain else None,
                "split": assign_split(row["dog_id"], certain),
                "usable_for_train": certain and assign_split(row["dog_id"], certain) == "train",
            }
        )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(exported, ensure_ascii=False, indent=2), encoding="utf-8")
    train_n = sum(1 for item in exported if item["usable_for_train"])
    print(f"Wrote {OUT} ({len(exported)} photos, {train_n} eligible train photos)")
    if train_n == 0:
        print("No pathology-eligible train photos. Do not report accuracy. Seed/demo images are excluded.")


if __name__ == "__main__":
    main()
