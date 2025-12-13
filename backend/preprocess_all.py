import os
import json
import numpy as np
from pathlib import Path
from tqdm import tqdm

# ensure this import matches your package structure
from app.preprocess import process_mat_file

ROOT = Path(__file__).resolve().parents[1]  # repo root
DATA_DIR = ROOT / "data"
OUT_DIR = ROOT / "backend" / "static_data"
OUT_DIR.mkdir(parents=True, exist_ok=True)

def safe_load_txt(path):
    if not path.exists():
        return None
    try:
        return np.loadtxt(path, dtype=int)
    except Exception:
        with open(path, "r") as f:
            lines = [l.strip() for l in f if l.strip()]
        return np.array([int(x) for x in lines], dtype=int)

def process_session(subject_folder: Path, session_folder: Path):
    # session_folder is like data/SBJ01/S01
    out_session = OUT_DIR / subject_folder.name / session_folder.name
    out_session.mkdir(parents=True, exist_ok=True)

    # Train
    train_folder = session_folder / "Train"
    test_folder = session_folder / "Test"

    result = {"subject": subject_folder.name, "session": session_folder.name, "files": {}}

    if train_folder.exists():
        train_mat = train_folder / "trainData.mat"
        train_targets = train_folder / "trainTargets.txt"
        train_events = train_folder / "trainEvents.txt"
        train_labels = train_folder / "trainLabels.txt"

        if train_mat.exists():
            feats, info = process_mat_file(str(train_mat))
            train_targets_arr = safe_load_txt(train_targets) if train_targets.exists() else None
            train_events_arr = safe_load_txt(train_events) if train_events.exists() else None
            train_labels_arr = safe_load_txt(train_labels) if train_labels.exists() else None

            npz_path = out_session / "train_features.npz"
            np.savez_compressed(
                npz_path,
                X=feats.astype(np.float32),
                targets=train_targets_arr if train_targets_arr is not None else np.array([]),
                events=train_events_arr if train_events_arr is not None else np.array([]),
                labels=train_labels_arr if train_labels_arr is not None else np.array([]),
                info=json.dumps(info)
            )
            result["files"]["train"] = str(npz_path.relative_to(ROOT))
    # Test
    if test_folder.exists():
        test_mat = test_folder / "testData.mat"
        test_events = test_folder / "testEvents.txt"
        runs_file = test_folder / "runs_per_block.txt"

        if test_mat.exists():
            feats_test, info_test = process_mat_file(str(test_mat))
            test_events_arr = safe_load_txt(test_events) if test_events.exists() else None
            runs_val = None
            if runs_file.exists():
                try:
                    runs_val = int(runs_file.read_text().strip())
                except:
                    runs_val = None

            npz_test_path = out_session / "test_features.npz"
            np.savez_compressed(
                npz_test_path,
                X=feats_test.astype(np.float32),
                events=test_events_arr if test_events_arr is not None else np.array([]),
                runs_per_block=runs_val if runs_val is not None else -1,
                info=json.dumps(info_test)
            )
            result["files"]["test"] = str(npz_test_path.relative_to(ROOT))
    return result

def main():
    manifest = {"subjects": []}
    # iterate subjects
    for subj in sorted(DATA_DIR.glob("SBJ*")):
        if not subj.is_dir():
            continue
        subj_entry = {"id": subj.name, "sessions": []}
        for sess in sorted(subj.glob("S*")):
            if not sess.is_dir():
                continue
            print(f"Processing {subj.name}/{sess.name}")
            sess_entry = process_session(subj, sess)
            subj_entry["sessions"].append(sess_entry)
        manifest["subjects"].append(subj_entry)

    # write manifest
    manifest_path = OUT_DIR / "manifest.json"
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"\nDone. Manifest saved to: {manifest_path}")

if __name__ == "__main__":
    main()
