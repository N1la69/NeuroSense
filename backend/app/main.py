# backend/app/main.py

import json
import math
from pathlib import Path
from typing import Optional
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Query
from fastapi import Body
from datetime import datetime
from sklearn.metrics import roc_auc_score
from app.models_serving import get_subject_model, get_generalized_model, predict_with_model
from app.recommendation import recommend_next_game
from app.db import (
    check_db,
    db_list_subjects,
    db_get_last_game,
    db_log_game,
    get_sessions,
    insert_or_update_session,
    get_cached_nsi, set_cached_nsi
)

ROOT = Path(__file__).resolve().parents[2]  # repo root
STATIC_DIR = ROOT / "backend" / "static_data"

app = FastAPI(title="NeuroSense Backend (dev)")

# Allow CORS from any origin for dev (you can lock this down later)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# --- Utility functions ---
def load_manifest():
    subjects = db_list_subjects()

    if not subjects:
        raise HTTPException(
            status_code=500,
            detail="No subjects found in database"
        )

    return {
        "subjects": [
            {
                "id": s["subject_id"],
                "sessions": get_sessions(s["subject_id"])
            }
            for s in subjects
        ]
    }

def load_npz_as_json(npz_path: Path):
    if not npz_path.exists():
        raise HTTPException(status_code=404, detail=f"{npz_path.name} not found")
    # load compressed npz
    with np.load(npz_path, allow_pickle=True) as d:
        out = {}
        for k, v in d.items():
            # Attempt to convert arrays to lists; keep small metadata as-is
            if isinstance(v, np.ndarray):
                # convert to Python lists but keep shapes small
                out[k] = v.tolist()
            else:
                # other types (int, str) -> convert
                try:
                    out[k] = json.loads(v) if isinstance(v, (str, np.str_)) else v
                except Exception:
                    out[k] = v.item() if hasattr(v, "item") else str(v)
    return out

def get_session_probs(subject_id: str, session_id: str, prefer_subject_model: bool):
    train_path = STATIC_DIR / subject_id / session_id / "train_features.npz"
    if not train_path.exists():
        raise FileNotFoundError

    with np.load(train_path, allow_pickle=True) as d:
        X = d.get("X")

    try:
        subj_num = int(subject_id.replace("SBJ", ""))
    except:
        subj_num = None

    model_bundle = None
    if prefer_subject_model and subj_num is not None:
        try:
            model_bundle = get_subject_model(subj_num)
        except FileNotFoundError:
            pass

    if model_bundle is None:
        model_bundle = get_generalized_model()

    return predict_with_model(model_bundle, X)

def load_session_scores(subject_id):
    sessions = get_sessions(subject_id)
    return [
        s["score"]
        for s in sessions
        if s.get("score") is not None
    ]

def load_nsi(subject_id: str):
    """
    STEP 7B
    - Uses cached NSI if available
    - Computes entropy-based confidence
    """

    cached = get_cached_nsi(subject_id)
    if cached:
        return cached["nsi"]

    sessions = get_sessions(subject_id)
    scores = [
        s["score"] for s in sessions
        if s.get("score") is not None
    ]

    if len(scores) < 3:
        return None

    confidence_scores = []

    for s in sessions:
        session_id = s["session_id"]

        use_subject = len(sessions) >= 3

        probs = get_session_probs(
            subject_id,
            session_id,
            prefer_subject_model=use_subject
        )

        confidence_scores.append(
            compute_confidence_consistency(probs)
        )

    nsi_value, components = compute_nsi(
        scores,
        confidence_scores
    )

    set_cached_nsi(subject_id, nsi_value, components)

    return nsi_value

def get_last_game(subject_id):
    try:
        return db_get_last_game(subject_id)
    except Exception:
        return None


# NSI utilities
def clamp(x, lo=0.0, hi=1.0):
    return max(lo, min(hi, x))

def compute_confidence_consistency(probs: np.ndarray) -> float:
    """
    Inverse entropy → higher = more confident / consistent
    probs: array of probabilities for one session
    """
    eps = 1e-8
    p = np.clip(probs, eps, 1 - eps)
    entropy = -np.mean(p * np.log(p) + (1 - p) * np.log(1 - p))
    max_entropy = -(
        0.5 * math.log(0.5) + 0.5 * math.log(0.5)
    )
    return 1.0 - clamp(entropy / max_entropy)

def compute_nsi(session_scores, confidence_scores):
    """
    session_scores: list of mean probabilities per session
    confidence_scores: list of confidence consistency per session
    """
    n = len(session_scores)
    if n < 3:
        return None

    scores = np.array(session_scores)

    # A) Baseline
    B = float(np.mean(scores[:2]))
    B_norm = clamp(B)

    # B) Variability
    V = float(np.std(scores))
    V_norm = clamp(V / 0.25)  # 0.25 ≈ high instability

    # C) Improvement
    I = (scores[-1] - scores[0]) / max(1, n - 1)
    I_norm = clamp((I + 0.2) / 0.4)

    # D) Confidence consistency
    C = float(np.mean(confidence_scores))
    C_norm = clamp(C)

    nsi_raw = (
        0.30 * (1 - B_norm) +
        0.30 * (1 - V_norm) +
        0.25 * I_norm +
        0.15 * C_norm
    )

    return round(nsi_raw * 100), {
        "baseline": round(B_norm, 3),
        "variability": round(V_norm, 3),
        "improvement": round(I_norm, 3),
        "consistency": round(C_norm, 3),
    }


# --- API Endpoints ---
@app.get("/health/db")
def db_health():
    return check_db()

@app.get("/manifest")
def get_manifest():
    try:
        return load_manifest()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/subjects")
def list_subjects():
    subjects = db_list_subjects()

    if not subjects:
        raise HTTPException(
            status_code=500,
            detail="No subjects found in database"
        )

    return {
        "subjects": [s["subject_id"] for s in subjects]
    }

@app.get("/subjects/{subject_id}/sessions")
def list_sessions(subject_id: str):
    sessions = get_sessions(subject_id)

    if not sessions:
        raise HTTPException(
            status_code=404,
            detail=f"No sessions found for {subject_id}"
        )

    return {
        "subject": subject_id,
        "sessions": sessions
    }

@app.get("/data/{subject_id}/{session_id}/train")
def get_train_features(subject_id: str, session_id: str):
    rel_path = STATIC_DIR / subject_id / session_id / "train_features.npz"
    if not rel_path.exists():
        raise HTTPException(status_code=404, detail="train_features.npz not found for this session")
    payload = load_npz_as_json(rel_path)
    return JSONResponse(payload)

@app.get("/data/{subject_id}/{session_id}/test")
def get_test_features(subject_id: str, session_id: str):
    rel_path = STATIC_DIR / subject_id / session_id / "test_features.npz"
    if not rel_path.exists():
        raise HTTPException(status_code=404, detail="test_features.npz not found for this session")
    payload = load_npz_as_json(rel_path)
    return JSONResponse(payload)

@app.get("/raw/static/{path:path}")
def serve_static(path: str):
    # if you want to serve the raw .npz or manifest file directly
    file_path = STATIC_DIR / path
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="file not found")
    return FileResponse(file_path)

@app.get("/models/list")
def list_models():
    out = {"subject_models": [], "generalized_model": False}
    # look for model files
    subj_dir = Path(ROOT) / "models" / "subject_models"
    if subj_dir.exists():
        out["subject_models"] = sorted([p.name for p in subj_dir.glob("SBJ*_model.pkl")])
    gen = Path(ROOT) / "models" / "generalized" / "generalized_model.pkl"
    out["generalized_model"] = gen.exists()
    return out

@app.get("/predict/session/{subject_id}/{session_id}")
def predict_session(
    subject_id: str,
    session_id: str,
    prefer_subject_model: Optional[bool] = Query(True)
):
    """
    Predict on precomputed features for a session.
    - subject_id: like 'SBJ01'
    - session_id: like 'S01'
    - prefer_subject_model: if true, try loading subject-specific model; otherwise use generalized
    """

    # --------------------------------------------------
    # 1. Load features
    # --------------------------------------------------
    train_path = STATIC_DIR / subject_id / session_id / "train_features.npz"
    if not train_path.exists():
        sessions = get_sessions(subject_id)
        sess = next(
            (s for s in sessions if s["session_id"] == session_id),
            None
        )
        if not sess or sess.get("score") is None:
            raise HTTPException(
                status_code=404,
                detail="No features or stored score found for this session"
            )

        return JSONResponse({
            "n_trials": 0,
            "probs": [],
            "score": sess["score"],
            "model_used": sess.get("model_used", "unknown"),
            "note": "Loaded from database (no feature file)"
        })


    with np.load(train_path, allow_pickle=True) as d:
        X = d.get("X")
        targets = d.get("targets") if "targets" in d else None

    # --------------------------------------------------
    # 2. Resolve model
    # --------------------------------------------------
    try:
        subj_num = int(subject_id.replace("SBJ", ""))
    except Exception:
        subj_num = None

    sessions = get_sessions(subject_id)
    session_count = len(sessions)

    model_bundle = None
    model_used = "loso"  # ✅ DEFAULT

    # Use subject model only after enough data
    if session_count >= 3 and subj_num is not None:
        try:
            model_bundle = get_subject_model(subj_num)
            model_used = "subject"
        except FileNotFoundError:
            model_bundle = None

    if model_bundle is None:
        try:
            model_bundle = get_generalized_model()
            model_used = "loso"
        except FileNotFoundError:
            raise HTTPException(
                status_code=404,
                detail="No model found (subject or generalized)"
            )

    # --------------------------------------------------
    # 3. Predict
    # --------------------------------------------------
    probs = predict_with_model(model_bundle, X)
    probs_list = probs.tolist()
    mean_score = float(np.mean(probs))   # ✅ CANONICAL SESSION SCORE

    # --------------------------------------------------
    # 4. Persist session score (⭐ STEP 6 CORE)
    # --------------------------------------------------
    insert_or_update_session(
        subject_id=subject_id,
        session_id=session_id,
        score=mean_score,
        model_used=model_used,
    )

    # --------------------------------------------------
    # 5. Build response
    # --------------------------------------------------
    resp = {
        "n_trials": int(len(probs_list)),
        "probs": probs_list,
        "score": mean_score,        # ✅ EXPLICIT SCORE
        "model_used": model_used,   # ✅ EXPLICIT MODEL
    }

    # Optional AUC (debug / dev)
    if targets is not None and len(targets) == len(probs_list):
        try:
            resp["auc"] = float(
                roc_auc_score(targets.astype(int), probs)
            )
        except Exception as e:
            resp["auc_error"] = str(e)

    return JSONResponse(resp)

@app.get("/nsi/{subject_id}")
def get_nsi(subject_id: str):
    nsi = load_nsi(subject_id)

    sessions = get_sessions(subject_id)

    if nsi is None:
        return {
            "subject": subject_id,
            "n_sessions": len(sessions),
            "nsi": None,
            "message": "NSI available after at least 3 scored sessions",
        }

    cached = get_cached_nsi(subject_id)

    return {
        "subject": subject_id,
        "n_sessions": len(sessions),
        "nsi": nsi,
        "components": cached.get("components"),
        "interpretation": "Higher NSI indicates more stable and adaptive neural responses",
    }

@app.get("/recommend/next/{subject_id}")
def recommend_next(subject_id: str):
    scores = load_session_scores(subject_id)

    if len(scores) < 3:
        raise HTTPException(
            status_code=400,
            detail="Not enough sessions"
        )

    nsi = load_nsi(subject_id)

    if nsi is None:
        raise HTTPException(
            status_code=400,
            detail="NSI not available yet"
        )

    return recommend_next_game(nsi, scores, subject_id)

@app.post("/game/log")
def log_game(payload: dict = Body(...)):
    try:
        entry = {
            "subject_id": payload.get("subject_id"),
            "session_id": payload.get("session_id"),
            "game_id": payload.get("game_id"),
            "source": payload.get("source", "unknown"),
        }

        db_log_game(entry)

        return {"success": True, "logged": entry}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



# COMPARISON
@app.get("/predict/compare/{subject_id}/{session_id}")
def compare_models(subject_id: str, session_id: str):
    """
    Research-only endpoint
    Compares LOSO vs Subject-specific model on the SAME session
    No DB writes, no side effects
    """

    # --------------------------------------------------
    # 1. Load features
    # --------------------------------------------------
    train_path = STATIC_DIR / subject_id / session_id / "train_features.npz"
    if not train_path.exists():
        raise HTTPException(
            status_code=404,
            detail="train_features.npz not found for this session"
        )

    with np.load(train_path, allow_pickle=True) as d:
        X = d.get("X")

    if X is None:
        raise HTTPException(500, "Invalid feature file")

    # --------------------------------------------------
    # 2. Resolve subject number
    # --------------------------------------------------
    try:
        subj_num = int(subject_id.replace("SBJ", ""))
    except Exception:
        raise HTTPException(400, "Invalid subject ID")

    # --------------------------------------------------
    # 3. LOSO model
    # --------------------------------------------------
    loso_model = get_generalized_model()
    loso_probs = predict_with_model(loso_model, X)

    loso_score = float(np.mean(loso_probs))
    loso_conf = compute_confidence_consistency(loso_probs)

    # --------------------------------------------------
    # 4. Subject model
    # --------------------------------------------------
    subject_model = get_subject_model(subj_num)
    subject_probs = predict_with_model(subject_model, X)

    subject_score = float(np.mean(subject_probs))
    subject_conf = compute_confidence_consistency(subject_probs)

    # --------------------------------------------------
    # 5. Response
    # --------------------------------------------------
    return {
        "subject_id": subject_id,
        "session_id": session_id,
        "loso": {
            "score": round(loso_score, 4),
            "confidence": round(loso_conf, 4),
        },
        "subject": {
            "score": round(subject_score, 4),
            "confidence": round(subject_conf, 4),
        },
        "delta": round(subject_score - loso_score, 4),
    }
