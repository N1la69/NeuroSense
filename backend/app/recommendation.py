import numpy as np
import hashlib

# -------------------------------------------------------------------
# GAME DEFINITIONS
# AD = Attention Demand (1 easy → 3 hard)
# EB = Engagement Bias (baseline preference)
# -------------------------------------------------------------------
GAMES = {
    "follow_animal": {
        "name": "Follow the Animal",
        "AD": 1.2,
        "EB": 0.8,
    },
    "color_focus": {
        "name": "Color Focus",
        "AD": 2.0,
        "EB": 1.0,
    },
    "find_the_star": {
        "name": "Find the Star",
        "AD": 2.6,
        "EB": 0.9,
    },
}


# -------------------------------------------------------------------
# Helper: trend computation
# -------------------------------------------------------------------
def compute_trend(scores):
    if len(scores) < 3:
        return 0.0
    return float((scores[-1] - scores[-3]) / 2)


# -------------------------------------------------------------------
# Helper: target attention demand from NSI
# -------------------------------------------------------------------
def target_attention_demand(nsi):
    """
    Maps NSI (0–100) → AD (1.0–3.0)
    Uses a soft curve to avoid clustering
    """
    return 1.0 + 2.0 * np.clip((nsi - 40) / 40, 0, 1)


# -------------------------------------------------------------------
# Helper: subject diversity bias
# -------------------------------------------------------------------
def subject_hash_bias(subject_id, game_id):
    """
    Deterministic but different per subject
    Prevents all subjects choosing same game
    """
    h = hashlib.md5(f"{subject_id}_{game_id}".encode()).hexdigest()
    return (int(h[:2], 16) / 255.0 - 0.5) * 0.3


# -------------------------------------------------------------------
# Helper: session progression bias
# -------------------------------------------------------------------
def session_rotation_bias(session_count, game_id):
    """
    Encourages progression and rotation across sessions
    """
    rotation = (session_count % len(GAMES)) / len(GAMES)
    return (rotation - 0.5) * 0.25


# -------------------------------------------------------------------
# ✅ FINAL RECOMMENDER (INTELLIGENT + EXPLAINABLE)
# -------------------------------------------------------------------
def recommend_next_game(nsi, session_scores, subject_id, last_game=None):
    session_count = len(session_scores)
    explanations = []

    # -------------------------------
    # Core behavioral signals
    # -------------------------------
    variability = float(np.std(session_scores[-3:])) if session_count >= 3 else 0.25
    trend = compute_trend(session_scores)

    target_ad = target_attention_demand(nsi)

    # Trend-based adjustment
    if trend > 0.03:
        target_ad += 0.3
    elif trend < -0.03:
        target_ad -= 0.3

    target_ad = float(np.clip(target_ad, 1.0, 3.0))

    # -------------------------------
    # Game scoring
    # -------------------------------
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
        if nsi > 55 and g["AD"] < 1.5:
            base_score -= 0.4

        score = (
            base_score
            + subject_hash_bias(subject_id, key)
            + session_rotation_bias(session_count, key)
        )

        ranked.append((score, key))

    ranked.sort(reverse=True)
    best_key = ranked[0][1]

    # -------------------------------
    # EXPLANATIONS (XAI Layer)
    # -------------------------------
    if nsi < 50:
        explanations.append("Attention responses are currently unstable")
    elif nsi < 65:
        explanations.append("Attention stability is developing but inconsistent")
    else:
        explanations.append("Attention responses are becoming more stable")

    if trend > 0.03:
        explanations.append("Recent sessions show improving engagement")
    elif trend < -0.03:
        explanations.append("Recent sessions show reduced engagement")
    else:
        explanations.append("Recent attention levels are stable")

    if variability > 0.12:
        explanations.append("High variability detected across recent activities")

    explanations.append(
        f"Activity difficulty matched to current attention demand (AD ≈ {round(target_ad, 1)})"
    )

    # -------------------------------
    # FINAL OUTPUT
    # -------------------------------
    return {
        "game_id": best_key,
        "game_name": GAMES[best_key]["name"],
        "mode": f"adaptive (target AD ≈ {round(target_ad, 1)})",
        "explanations": explanations,
    }
