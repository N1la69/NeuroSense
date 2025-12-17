import numpy as np
import hashlib
from app.games import GAMES


# -----------------------------
# Helpers
# -----------------------------
def compute_trend(session_scores):
    if len(session_scores) < 4:
        return 0.0
    recent = np.mean(session_scores[-2:])
    earlier = np.mean(session_scores[-4:-2])
    return float(recent - earlier)


def target_attention_demand(nsi):
    if nsi < 45:
        return 1.0
    if nsi < 55:
        return 1.5
    if nsi < 65:
        return 2.0
    if nsi < 75:
        return 2.5
    return 3.0


def subject_hash_bias(subject_id: str, game_key: str) -> float:
    """
    Deterministic, tiny bias so different children
    don't collapse to the same game
    """
    h = hashlib.md5(f"{subject_id}:{game_key}".encode()).hexdigest()
    return (int(h[:2], 16) / 255.0 - 0.5) * 0.2  # range ≈ ±0.1


def session_rotation_bias(session_count: int, game_key: str) -> float:
    """
    Encourages gentle rotation over sessions
    """
    keys = sorted(GAMES.keys())
    idx = keys.index(game_key)
    preferred = session_count % len(keys)
    return 0.15 if idx == preferred else 0.0


# -----------------------------
# Main recommender
# -----------------------------
def recommend_next_game(nsi, session_scores, subject_id, last_game=None):
    variability = float(np.std(session_scores[-3:])) if len(session_scores) >= 3 else 0.3
    trend = compute_trend(session_scores)
    session_count = len(session_scores)

    target_ad = target_attention_demand(nsi)

    # Trend adjustment
    if trend > 0.03:
        target_ad += 0.3
    elif trend < -0.03:
        target_ad -= 0.3

    target_ad = float(np.clip(target_ad, 1.0, 3.0))

    ranked = []

    for key, g in GAMES.items():
        if key == last_game:
            continue

        ad_distance = abs(g["AD"] - target_ad)

        base_score = (
            g["EB"]
            - ad_distance
            - 0.5 * variability
        )

        # Avoid staying at easiest level too long
        if nsi > 55 and g["AD"] == 1:
            base_score -= 0.4

        score = (
            base_score
            + subject_hash_bias(subject_id, key)      # A: subject diversity
            + session_rotation_bias(session_count, key)  # B: progression
        )

        ranked.append((score, key))

    ranked.sort(reverse=True)
    best_key = ranked[0][1]

    return {
        "game_id": best_key,
        "game_name": GAMES[best_key]["name"],
        "mode": f"adaptive (target AD ≈ {round(target_ad, 1)})",
        "reason": (
            "Selected using attention stability, recent progress trend, "
            "and structured activity variation to maintain engagement"
        ),
    }
