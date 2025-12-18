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

def check_db():
    # Simple sanity check
    return {
        "db": DB_NAME,
        "collections": db.list_collection_names()
    }


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