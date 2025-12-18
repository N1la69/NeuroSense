from app.db import db_list_subjects, get_sessions
import requests
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT))

BASE_URL = "http://localhost:8000"

def backfill_subject(subject_id):
    sessions = get_sessions(subject_id)

    if not sessions:
        print(f"⚠️  No sessions for {subject_id}")
        return

    print(f"\n🔄 Backfilling {subject_id} ({len(sessions)} sessions)")

    for s in sessions:
        session_id = s["session_id"]

        resp = requests.get(
            f"{BASE_URL}/predict/session/{subject_id}/{session_id}",
            params={"prefer_subject_model": False},
            timeout=30,
        )

        if resp.ok:
            data = resp.json()
            print(
                f"   ✓ {session_id}: "
                f"score={round(data['score'], 4)} "
                f"(model={data['model_used']})"
            )
        else:
            print(f"   ✗ {session_id} failed")

def main():
    subjects = db_list_subjects()

    if not subjects:
        print("❌ No subjects found")
        return

    for s in subjects:
        backfill_subject(s["subject_id"])

    print("\n🏁 All subjects backfilled")

if __name__ == "__main__":
    main()
