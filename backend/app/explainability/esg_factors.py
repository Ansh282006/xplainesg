"""
Maps raw SHAP/LIME tokens to 10 real ESG factors.

Each factor is a domain concept from GRI / SASB / TCFD terminology.
A token contributes to a factor if it matches one of that factor's keywords.
"""
from __future__ import annotations

from typing import Any

# ---------------------------------------------------------------------------
# The 10 factors
# ---------------------------------------------------------------------------
ESG_FACTORS: dict[str, dict[str, Any]] = {
    "climate_carbon": {
        "label": "Climate & Carbon",
        "category": "environmental",
        "keywords": {
            "carbon", "co2", "co₂", "emission", "net", "zero", "scope", "ghg",
            "greenhouse", "climate", "decarbonis", "decarboniz", "neutral",
        },
    },
    "renewable_energy": {
        "label": "Renewable Energy",
        "category": "environmental",
        "keywords": {
            "renewable", "solar", "wind", "clean", "green", "energy",
            "electricity", "power",
        },
    },
    "waste_circular": {
        "label": "Waste & Circular Economy",
        "category": "environmental",
        "keywords": {"waste", "recycl", "circular", "landfill", "plastic", "reuse"},
    },
    "water_stewardship": {
        "label": "Water Stewardship",
        "category": "environmental",
        "keywords": {"water", "wastewater", "effluent", "rainwater", "discharge"},
    },
    "biodiversity_land": {
        "label": "Biodiversity & Land",
        "category": "environmental",
        "keywords": {"biodivers", "forest", "deforest", "ecosystem", "habitat",
                     "conserv", "afforest", "reforest"},
    },
    "employee_welfare": {
        "label": "Employee Welfare & Safety",
        "category": "social",
        "keywords": {"employee", "worker", "safety", "health", "training",
                     "wellbeing", "well-being", "workplace", "human", "rights",
                     "safety", "labour", "labor", "reskill", "upskill"},
    },
    "diversity_inclusion": {
        "label": "Diversity & Inclusion",
        "category": "social",
        "keywords": {"diversity", "inclusion", "gender", "women", "female",
                     "underrepresented", "equity", "inclusive"},
    },
    "community_society": {
        "label": "Community & Society",
        "category": "social",
        "keywords": {"community", "csr", "philanthrop", "foundation", "donation",
                     "volunteer", "society", "social"},
    },
    "board_governance": {
        "label": "Board & Governance",
        "category": "governance",
        "keywords": {"board", "director", "governance", "committee",
                     "independence", "independent", "shareholder", "compensation"},
    },
    "transparency_ethics": {
        "label": "Transparency & Ethics",
        "category": "governance",
        "keywords": {"transparen", "disclos", "ethic", "complian", "corrupt",
                     "briber", "whistleblower", "conduct", "audit", "materialit"},
    },
}


def _token_matches_factor(token: str, factor_id: str) -> bool:
    t = token.lower().strip()
    if not t:
        return False
    for kw in ESG_FACTORS[factor_id]["keywords"]:
        if kw in t:
            return True
    return False


def classify_token_to_factor(token: str) -> str | None:
    """Return the factor_id this token best maps to, or None."""
    for factor_id in ESG_FACTORS:
        if _token_matches_factor(token, factor_id):
            return factor_id
    return None


def aggregate_features_to_factors(
    features: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    features: [{feature: str, contribution: float, direction: str}, ...]
    Returns: list of factors with aggregated contributions, sorted by abs(contribution) desc.

    Each returned factor:
        {
            "factor_id": "climate_carbon",
            "label": "Climate & Carbon",
            "category": "environmental",
            "contribution": 0.42,
            "direction": "unsubstantiated" | "substantiated",
            "matched_tokens": [
                {"token": "carbon", "contribution": 0.3, "direction": "..."},
                ...
            ],
            "n_tokens": 3,
        }
    """
    buckets: dict[str, dict[str, Any]] = {}

    for f in features:
        token = f.get("feature", "")
        factor_id = classify_token_to_factor(token)
        if factor_id is None:
            continue

        spec = ESG_FACTORS[factor_id]
        bucket = buckets.setdefault(
            factor_id,
            {
                "factor_id": factor_id,
                "label": spec["label"],
                "category": spec["category"],
                "contribution": 0.0,
                "matched_tokens": [],
            },
        )
        contribution = float(f.get("contribution") or 0.0)
        bucket["contribution"] += contribution
        bucket["matched_tokens"].append(
            {
                "token": token,
                "contribution": round(contribution, 5),
                "direction": f.get("direction"),
            }
        )

    out = []
    for b in buckets.values():
        b["contribution"] = round(b["contribution"], 5)
        b["n_tokens"] = len(b["matched_tokens"])
        b["direction"] = "unsubstantiated" if b["contribution"] > 0 else "substantiated"
        out.append(b)

    # Sort by absolute contribution descending
    out.sort(key=lambda x: abs(x["contribution"]), reverse=True)
    return out


def all_factor_labels() -> list[dict[str, str]]:
    """Returns all 10 factors even if no tokens matched — useful for UI."""
    return [
        {"factor_id": fid, "label": spec["label"], "category": spec["category"]}
        for fid, spec in ESG_FACTORS.items()
    ]
