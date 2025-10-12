import os
import numpy as np
import scipy.io as sio
from scipy.signal import butter, filtfilt, iirnotch

# =============================================================================
# 1️⃣  Loading utilities
# =============================================================================
def load_mat(filepath, key_candidates=("trainData", "testData", "eeg", "data")):
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"{filepath} not found")

    mat = sio.loadmat(filepath)
    for key in key_candidates:
        if key in mat:
            arr = mat[key]
            # squeeze to remove redundant dims
            return np.array(arr).squeeze()
    raise KeyError(f"None of {key_candidates} found in {filepath}")


# =============================================================================
# 2️⃣  Filtering helpers
# =============================================================================
def bandpass_filter(data, low=1.0, high=40.0, fs=250.0, order=4):
    nyq = 0.5 * fs
    b, a = butter(order, [low / nyq, high / nyq], btype="band")
    return filtfilt(b, a, data, axis=-1)


def notch_filter(data, notch_freq=50.0, fs=250.0, q=30.0):
    b, a = iirnotch(notch_freq / (fs / 2.0), q)
    return filtfilt(b, a, data, axis=-1)


def preprocess_eeg(raw_data, fs=250.0):
    data = notch_filter(raw_data, 50.0, fs)
    data = bandpass_filter(data, 1.0, 40.0, fs)
    data = data - np.mean(data, axis=-1, keepdims=True)
    return data


# =============================================================================
# 3️⃣  Feature extraction
# =============================================================================
def extract_features(eeg_data, window=(100, 700), fs=250.0):
    start = int(window[0] * fs / 1000)
    end = int(window[1] * fs / 1000)
    if eeg_data.ndim != 3:
        raise ValueError("Expected shape (n_trials, n_channels, n_samples)")

    seg = eeg_data[:, :, start:end]
    mean_f = np.mean(seg, axis=2)
    std_f = np.std(seg, axis=2)
    max_f = np.max(seg, axis=2)
    min_f = np.min(seg, axis=2)
    feats = np.concatenate([mean_f, std_f, max_f, min_f], axis=1)
    return feats


# =============================================================================
# 4️⃣  Quick utility for testing
# =============================================================================
def process_mat_file(filepath, fs=250.0, window=(100, 700)):
    raw = load_mat(filepath)
    if raw.ndim == 2:  # (channels, samples)
        raw = raw[np.newaxis, :, :]
    n_trials, n_channels, n_samples = raw.shape
    processed = np.zeros_like(raw)
    for i in range(n_trials):
        processed[i] = preprocess_eeg(raw[i], fs)
    feats = extract_features(processed, window, fs)
    info = {
        "filepath": filepath,
        "n_trials": n_trials,
        "n_channels": n_channels,
        "n_samples": n_samples,
        "n_features": feats.shape[1],
    }
    return feats, info
