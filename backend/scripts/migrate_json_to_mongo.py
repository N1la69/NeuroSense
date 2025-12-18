import json
from pathlib import Path
from datetime import datetime

from backend.app.db import (
    subjects_col,
    sessions_col,
    game_history_col,
)

ROOT = Path(__file__).resolve().parents[2]
STATIC_DIR = ROOT / "backend" / "static_data"

MANIFEST_PATH = STATIC_DIR / "manifest.json"
GAME_HISTORY_PATH = STATIC_DIR / "game_history.json"


def migrate_manifest():
    print("📦 Migrating manifest.json → MongoDB")

    manifest = json.loads(MANIFEST_PATH.read_text())

    for subject in manifest.get("subjects", []):
        subject_id = subject["id"]

        # ---------- SUBJECT ----------
        subjects_col.update_one(
            {"subject_id": subject_id},
            {
                "$set": {
                    "subject_id": subject_id,
                    "created_at": datetime.utcnow(),
                }
            },
            upsert=True,
        )

        # ---------- SESSIONS ----------
        for idx, sess in enumerate(subject.get("sessions", [])):
            sessions_col.update_one(
                {
                    "subject_id": subject_id,
                    "session_id": sess["session"],
                },
                {
                    "$set": {
                        "subject_id": subject_id,
                        "session_id": sess["session"],
                        "order": idx + 1,
                        "created_at": datetime.utcnow(),
                    }
                },
                upsert=True,
            )

    print("✅ Manifest migration complete")


def migrate_game_history():
    if not GAME_HISTORY_PATH.exists():
        print("⚠️ No game_history.json found, skipping")
        return

    print("🎮 Migrating game_history.json → MongoDB")

    history = json.loads(GAME_HISTORY_PATH.read_text())

    for entry in history:
        game_history_col.update_one(
            {
                "subject_id": entry["subject_id"],
                "timestamp": entry["timestamp"],
                "game_id": entry["game_id"],
            },
            {"$set": entry},
            upsert=True,
        )

    print("✅ Game history migration complete")


if __name__ == "__main__":
    migrate_manifest()
    migrate_game_history()
    print("🏁 Migration finished")
