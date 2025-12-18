# backend/app/db.py

from pymongo import MongoClient
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB", "neurosense_dev")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

# ---- Collections ----
subjects_col = db["subjects"]
sessions_col = db["sessions"]
game_history_col = db["game_history"]
nsi_col = db["nsi_cache"]
parents_col = db["parents"]

# ---- DB Functions ----
def check_db():
    # Simple sanity check
    return {
        "db": DB_NAME,
        "collections": db.list_collection_names()
    }


def get_subject(subject_id: str):
    return subjects_col.find_one({"subject_id": subject_id})

def db_list_subjects():
    return list(subjects_col.find({}, {"_id": 0}))

def get_sessions(subject_id: str):
    return list(
        sessions_col.find(
            {"subject_id": subject_id},
            {"_id": 0}
        ).sort("session_index", 1)
    )

def insert_or_update_session(
    subject_id: str,
    session_id: str,
    score: float,
    model_used: str,
):
    try:
        session_index = int(session_id.replace("S", ""))
    except Exception:
        session_index = None

    sessions_col.update_one(
        {"subject_id": subject_id, "session_id": session_id},
        {
            "$set": {
                "subject_id": subject_id,
                "session_id": session_id,
                "session_index": session_index,
                "score": score,
                "model_used": model_used,
                "created_at": datetime.utcnow(),
            }
        },
        upsert=True
    )

    # 🔥 Invalidate NSI cache
    nsi_col.delete_one({"subject_id": subject_id})



def db_get_manifest():
    subjects = list(subjects_col.find({}, {"_id": 0}))
    sessions = list(sessions_col.find({}, {"_id": 0}))

    # reconstruct original manifest format
    out = []
    for s in subjects:
        sid = s["subject_id"]
        sess = [x for x in sessions if x["subject_id"] == sid]
        out.append({
            "id": sid,
            "sessions": sess
        })

    return {"subjects": out}

def db_get_session_scores(subject_id):
    sess = list(
        sessions_col.find(
            {"subject_id": subject_id},
            {"_id": 0, "score": 1}
        ).sort("session_index", 1)
    )
    return [s["score"] for s in sess]

def db_get_last_game(subject_id):
    last = game_history_col.find_one(
        {"subject_id": subject_id},
        sort=[("timestamp", -1)]
    )
    return last["game_id"] if last else None

def db_log_game(entry: dict):
    game_history_col.insert_one({
        **entry,
        "timestamp": datetime.utcnow()
    })


# NSI CACHE
def get_cached_nsi(subject_id: str):
    doc = nsi_col.find_one(
        {"subject_id": subject_id},
        {"_id": 0}
    )
    return doc

def set_cached_nsi(subject_id: str, nsi: int, components: dict):
    nsi_col.update_one(
        {"subject_id": subject_id},
        {
            "$set": {
                "subject_id": subject_id,
                "nsi": nsi,
                "components": components,
                "updated_at": datetime.utcnow(),
            }
        },
        upsert=True
    )

def invalidate_nsi(subject_id: str):
    nsi_col.delete_one({"subject_id": subject_id})
