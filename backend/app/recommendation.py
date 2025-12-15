import numpy as np
from app.games import GAMES

def determine_mode(nsi, variability):
    if nsi < 40 or variability > 0.25:
        return "stabilization"
    if nsi <= 70:
        return "consolidation"
    return "challenge"


def allowed_games(mode):
    out = {}
    for k, g in GAMES.items():
        if mode == "stabilization" and g["AD"] <= 1:
            out[k] = g
        elif mode == "consolidation" and g["AD"] <= 2:
            out[k] = g
        elif mode == "challenge":
            out[k] = g
    return out


def recommend_next_game(nsi, session_scores, last_game=None):
    variability = float(np.std(session_scores[-3:])) if len(session_scores) >= 3 else 0.3
    mode = determine_mode(nsi, variability)

    candidates = allowed_games(mode)

    ranked = []
    target_ad = 1 if mode == "stabilization" else 2 if mode == "consolidation" else 3

    for key, g in candidates.items():
        if key == last_game:
            continue

        score = (
            g["EB"]
            + (1 - abs(g["AD"] - target_ad))
            - variability
        )
        ranked.append((score, key))

    ranked.sort(reverse=True)
    best_key = ranked[0][1]

    return {
        "game_id": best_key,
        "game_name": GAMES[best_key]["name"],
        "mode": mode,
        "reason": f"Selected for {mode} based on attention stability",
    }
