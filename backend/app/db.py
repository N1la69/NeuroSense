from pymongo import MongoClient
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
