import os
import numpy as np
import scipy.io as sio
from scipy.signal import butter, filtfilt, iirnotch

# =============================================================================
# 1️⃣  Loading utilities
# =============================================================================
def load_mat(filepath, key_candidates=("trainData", "testData", "eeg", "data")):
    """
    Load .mat and return a numpy array (not squeezed blindly).
    We'll not squeeze away the trial/channel/sample dims so we can inspect shape.
    """
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"{filepath} not found")

    mat = sio.loadmat(filepath)
    for key in key_candidates:
        if key in mat:
            arr = mat[key]
            return np.array(arr)  # do NOT squeeze here
    # fallback: return the first ndarray-like value that isn't meta
    for k, v in mat.items():
        if not k.startswith("__") and isinstance(v, np.ndarray):
            return np.array(v)
    raise KeyError(f"None of {key_candidates} found in {filepath}")

def _to_trials_channels_samples(arr):
    """
    Accept various common axis orders and return array with shape (n_trials, n_channels, n_samples).
    Heuristics:
      - channels is 8 (C3,Cz,C4,CPz,P3,Pz,P4,POz)
      - samples ~ 350 (1400 ms @ 250 Hz -> 350 samples)
      - trials ~ 400..1600 depending on train/test
    We'll check for common patterns and permute appropriately.
    """
    if arr.ndim == 2:
        # maybe (channels, samples) for a single-trial file -> make it (1, channels, samples)
        ch, smp = arr.shape
        return arr[np.newaxis, :, :]

    if arr.ndim != 3:
        # unexpected dims, try to squeeze then raise later
        arr = np.squeeze(arr)
        if arr.ndim == 2:
            return arr[np.newaxis, :, :]
        raise ValueError(f"Unexpected array dims: {arr.shape}")

    # arr has 3 dims -> try to identify which axis is channels (should be 8)
    a, b, c = arr.shape
    # possible candidates where axis length equals 8
    candidates = []
    for idx, val in enumerate((a, b, c)):
        if val == 8:
            candidates.append(idx)
    # typical sample count near 350
    approx_sample = 350
    sample_candidates = []
    for idx, val in enumerate((a, b, c)):
        # allow some tolerance
        if abs(val - approx_sample) <= 50:
            sample_candidates.append(idx)

    # If channels axis found
    if candidates:
        ch_axis = candidates[0]
        # if sample axis detected choose it, else pick axis not channels and not trials heuristically
        rem = [0,1,2]
        rem.remove(ch_axis)
        # pick sample axis as one that is around 350 if present
        sample_axis = None
        for r in rem:
            if r in sample_candidates:
                sample_axis = r
                break
        if sample_axis is None:
            # fallback: assume samples axis is the smaller of the two remaining
            sizes = [(rem[0], arr.shape[rem[0]]), (rem[1], arr.shape[rem[1]])]
            sample_axis = min(sizes, key=lambda x: x[1])[0]
        # the remaining axis is trials
        trial_axis = [i for i in (0,1,2) if i not in (ch_axis, sample_axis)][0]
        # permute to (trials, channels, samples)
        perm = (trial_axis, ch_axis, sample_axis)
        out = np.transpose(arr, perm)
        return out

    # If no axis equals 8, try other heuristics:
    # - if one axis >> others it's probably trials (e.g., 1600)
    sizes = [(0, a), (1, b), (2, c)]
    sizes_sorted = sorted(sizes, key=lambda x: x[1], reverse=True)
    # assume largest axis is trials, smallest is channels
    trial_axis = sizes_sorted[0][0]
    channel_axis = sizes_sorted[-1][0]
    sample_axis = [i for i in (0,1,2) if i not in (trial_axis, channel_axis)][0]
    perm = (trial_axis, channel_axis, sample_axis)
    out = np.transpose(arr, perm)
    return out


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
    """
    Loads the mat, reorders to (n_trials, n_channels, n_samples),
    applies preprocessing per-trial and returns features + info.
    """
    raw = load_mat(filepath)
    # enforce shape (n_trials, n_channels, n_samples)
    try:
        raw_tcs = _to_trials_channels_samples(raw)
    except Exception as e:
        raise RuntimeError(f"Failed to normalize array shape for {filepath}: {e}")

    n_trials, n_channels, n_samples = raw_tcs.shape

    # now reuse your existing preprocess function logic:
    # we'll import local helpers here to avoid duplication
    from scipy.signal import butter, filtfilt, iirnotch

    def notch_filter(data, notch_freq=50.0, fs=250.0, q=30.0):
        b, a = iirnotch(notch_freq / (fs / 2.0), q)
        return filtfilt(b, a, data, axis=-1)

    def bandpass_filter(data, low=1.0, high=40.0, fs=250.0, order=4):
        nyq = 0.5 * fs
        b, a = butter(order, [low / nyq, high / nyq], btype="band")
        return filtfilt(b, a, data, axis=-1)

    def preprocess_eeg_epoch(epoch, fs=250.0):
        # epoch shape: (n_channels, n_samples)
        data = notch_filter(epoch, 50.0, fs)
        data = bandpass_filter(data, 1.0, 40.0, fs)
        data = data - np.mean(data, axis=-1, keepdims=True)
        return data

    # apply preprocessing per trial
    processed = np.zeros_like(raw_tcs, dtype=float)
    for i in range(n_trials):
        processed[i] = preprocess_eeg_epoch(raw_tcs[i], fs)

    # feature extraction (same simple features as before)
    start = int(window[0] * fs / 1000)
    end = int(window[1] * fs / 1000)
    if processed.ndim != 3:
        raise ValueError("Expected processed shape (n_trials, n_channels, n_samples)")
    seg = processed[:, :, start:end]
    mean_f = np.mean(seg, axis=2)
    std_f = np.std(seg, axis=2)
    max_f = np.max(seg, axis=2)
    min_f = np.min(seg, axis=2)
    feats = np.concatenate([mean_f, std_f, max_f, min_f], axis=1)

    info = {
        "filepath": filepath,
        "raw_shape": list(raw.shape),
        "normalized_shape": [int(n_trials), int(n_channels), int(n_samples)],
        "n_features": int(feats.shape[1]),
        "n_trials": int(n_trials),
        "n_channels": int(n_channels),
        "n_samples": int(n_samples),
    }

    # print short diagnostic so you can confirm
    print(f"Processed {filepath} -> raw_shape={raw.shape}, normalized={info['normalized_shape']} feats={feats.shape}")

    return feats, info