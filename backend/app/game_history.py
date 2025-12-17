import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HISTORY_PATH = ROOT / "backend" / "static_data" / "game_history.json"


def load_game_history():
    if not HISTORY_PATH.exists():
        return {}
    return json.loads(HISTORY_PATH.read_text())


def save_game_history(history):
    HISTORY_PATH.parent.mkdir(parents=True, exist_ok=True)
    HISTORY_PATH.write_text(json.dumps(history, indent=2))


def log_game(subject_id: str, session_id: str, game_id: str):
    history = load_game_history()
    history.setdefault(subject_id, {})
    history[subject_id][session_id] = game_id
    save_game_history(history)


def get_last_game(subject_id: str):
    history = load_game_history()
    sessions = history.get(subject_id, {})
    if not sessions:
        return None
    # Return last session’s game
    last_session = sorted(sessions.keys())[-1]
    return sessions[last_session]
