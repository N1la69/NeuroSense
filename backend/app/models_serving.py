# backend/app/models_serving.py
import os
from pathlib import Path
import joblib
import numpy as np

ROOT = Path(__file__).resolve().parents[2]  # repo root
MODELS_DIR = ROOT / "models"
SUBJECT_MODELS_DIR = MODELS_DIR / "subject_models"
GENERALIZED_MODEL_PATH = MODELS_DIR / "generalized" / "generalized_model.pkl"

_loaded_cache = {}

def _load_joblib(path: Path):
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(str(path))
    # simple cache by path
    key = str(path.resolve())
    if key in _loaded_cache:
        return _loaded_cache[key]
    obj = joblib.load(str(path))
    _loaded_cache[key] = obj
    return obj

def get_subject_model(subject_id: int):
    # e.g., SBJ01_model.pkl
    fname = f"SBJ{subject_id:02d}_model.pkl"
    p = SUBJECT_MODELS_DIR / fname
    if p.exists():
        return _load_joblib(p)
    return None

def get_generalized_model():
    p = Path(GENERALIZED_MODEL_PATH)
    if p.exists():
        return _load_joblib(p)
    return None

def predict_with_model(model_bundle, X):
    """
    model_bundle is expected to be a dict with {'model': clf, 'pca': pca, ...}
    X: numpy array shape (n_samples, n_features)
    returns probs (n_samples,)
    """
    if isinstance(X, list):
        X = np.array(X, dtype=float)
    if not hasattr(X, "shape"):
        X = np.array(X, dtype=float)
    # find pca & model keys
    pca = model_bundle.get("pca") or model_bundle.get("PCA") or None
    model = model_bundle.get("model") or model_bundle.get("clf") or model_bundle.get("estimator")
    if pca is not None:
        Xp = pca.transform(X)
    else:
        Xp = X
    probs = model.predict_proba(Xp)[:, 1]
    return probs
