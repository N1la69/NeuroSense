import os
import numpy as np
import pandas as pd
import joblib
import time
from sklearn.decomposition import PCA
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split
from app.preprocess import process_mat_file


# =============================================================================
# 🔧  Helper: load subject data (all sessions)
# =============================================================================
def load_subject_data(base_path, subject_id, sessions, train_mode=True):
    features_list, labels_list = [], []

    for session_id in sessions:
        folder = "Train" if train_mode else "Test"
        data_path = os.path.join(base_path, f"SBJ{subject_id:02d}", f"S{session_id:02d}", folder)
        mat_file = os.path.join(data_path, "trainData.mat" if train_mode else "testData.mat")
        target_file = os.path.join(data_path, "trainTargets.txt")

        if not os.path.exists(mat_file) or not os.path.exists(target_file):
            continue

        feats, info = process_mat_file(mat_file)
        labels = np.loadtxt(target_file, dtype=int)

        if len(labels) != feats.shape[0]:
            print(f"⚠️ Mismatch in trials/labels for SBJ{subject_id:02d}-S{session_id:02d}")
            continue

        features_list.append(feats)
        labels_list.append(labels)

    if not features_list:
        return None, None

    X = np.vstack(features_list)
    y = np.concatenate(labels_list)
    return X, y


# =============================================================================
# 🧠  Subject-Specific Model Training
# =============================================================================
def train_subject_specific(base_path, subject_id, sessions=range(1, 8), output_dir="models/subject_models"):
    X, y = load_subject_data(base_path, subject_id, sessions)
    if X is None:
        print(f"⚠️ No data found for Subject {subject_id:02d}")
        return None

    print(f"Training Subject-Specific Model for SBJ{subject_id:02d} | Samples: {X.shape}")

    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=42, stratify=y
    )

    # PCA
    pca = PCA(n_components=150, random_state=42)
    X_train_pca = pca.fit_transform(X_train)
    X_test_pca = pca.transform(X_test)

    # Model
    model = LogisticRegression(
        solver="liblinear", class_weight="balanced", random_state=42
    )
    model.fit(X_train_pca, y_train)

    # Evaluate
    y_prob = model.predict_proba(X_test_pca)[:, 1]
    auc = roc_auc_score(y_test, y_prob)
    print(f"✅ SBJ{subject_id:02d} AUC = {auc:.3f}")

    # Save
    os.makedirs(output_dir, exist_ok=True)
    save_path = os.path.join(output_dir, f"SBJ{subject_id:02d}_model.pkl")
    joblib.dump({"model": model, "pca": pca, "auc": auc}, save_path)
    print(f"💾 Saved Subject Model → {save_path}\n")

    return {"Subject": f"SBJ{subject_id:02d}", "AUC": auc}


# =============================================================================
# 🌍  LOSO Generalized Model Training
# =============================================================================
def train_loso(base_path, subjects=range(1, 16), sessions=range(1, 8), output_dir="models/generalized"):
    start_all = time.time()
    results = []
    all_data = {}

    print("📦 Loading all subjects' data...")
    for sid in subjects:
        X, y = load_subject_data(base_path, sid, sessions)
        if X is not None:
            all_data[sid] = (X, y)
            print(f"✅ Loaded SBJ{sid:02d}: {X.shape[0]} trials")
        else:
            print(f"⚠️ SBJ{sid:02d} skipped.")

    print("\n🚀 Starting LOSO training...\n")

    for test_sid in subjects:
        if test_sid not in all_data:
            continue

        # Split data
        X_test, y_test = all_data[test_sid]
        X_train = np.vstack([X for sid, (X, _) in all_data.items() if sid != test_sid])
        y_train = np.concatenate([y for sid, (_, y) in all_data.items() if sid != test_sid])

        print(f"Training LOSO fold: leaving out SBJ{test_sid:02d}")
        print(f"Train: {X_train.shape}, Test: {X_test.shape}")

        # PCA
        pca = PCA(n_components=150, random_state=42)
        X_train_pca = pca.fit_transform(X_train)
        X_test_pca = pca.transform(X_test)

        # Model
        model = LogisticRegression(
            solver="saga",
            penalty="l2",
            class_weight="balanced",
            random_state=42,
            C=0.1,
            max_iter=1000,
        )
        model.fit(X_train_pca, y_train)
        y_prob = model.predict_proba(X_test_pca)[:, 1]
        auc = roc_auc_score(y_test, y_prob)
        results.append({"Subject": f"SBJ{test_sid:02d}", "AUC": auc})

        print(f"✅ LOSO SBJ{test_sid:02d} AUC = {auc:.3f}\n")

    # Save generalized model (last trained fold or retrain on all)
    print("🔁 Retraining on all subjects to finalize generalized model...")
    X_all = np.vstack([X for X, _ in all_data.values()])
    y_all = np.concatenate([y for _, y in all_data.values()])
    pca_final = PCA(n_components=150, random_state=42)
    X_all_pca = pca_final.fit_transform(X_all)
    final_model = LogisticRegression(
        solver="saga", penalty="l2", class_weight="balanced", random_state=42, max_iter=1000
    )
    final_model.fit(X_all_pca, y_all)

    os.makedirs(output_dir, exist_ok=True)
    joblib.dump({"model": final_model, "pca": pca_final}, os.path.join(output_dir, "generalized_model.pkl"))
    print(f"💾 Final Generalized Model Saved → {output_dir}/generalized_model.pkl")

    # Save results
    results_df = pd.DataFrame(results)
    results_df.to_csv(os.path.join(output_dir, "loso_results.csv"), index=False)
    print("📊 LOSO AUC results saved to loso_results.csv")

    print(f"🏁 Completed in {(time.time() - start_all)/60:.1f} mins")
    return results_df
