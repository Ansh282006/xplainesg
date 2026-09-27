from __future__ import annotations

import re
from dataclasses import dataclass, field

from app.nlp.esg_lexicon import (
    ACHIEVEMENT_MARKERS,
    CATEGORY_LEXICON,
    CLAIM_TYPE_PATTERNS,
    COMMITMENT_MARKERS,
    NUMBER_PATTERN,
    TIME_HORIZON_PATTERN,
)
from app.nlp.text_cleaner import Sentence
from app.utils.logging import get_logger

logger = get_logger(__name__)

MIN_CATEGORY_HITS = 1
_MIN_STRENGTH = 0.20
_MAX_STRENGTH = 1.00

_CATEGORY_MATCHERS: dict[str, list[tuple[str, re.Pattern[str]]]] = {
    cat: [
        (kw, re.compile(r"\b" + re.escape(kw) + r"\w*", re.IGNORECASE))
        for kw in keywords
    ]
    for cat, keywords in CATEGORY_LEXICON.items()
}


@dataclass(frozen=True)
class Claim:
    page_number: int
    sentence: str
    category: str
    claim_type: str
    claim_strength: float
    matched_keywords: list[str] = field(default_factory=list)
    signals: dict[str, bool] = field(default_factory=dict)


def _match_categories(text: str) -> dict[str, list[str]]:
    hits: dict[str, list[str]] = {}
    for category, matchers in _CATEGORY_MATCHERS.items():
        matched = [kw for kw, pat in matchers if pat.search(text)]
        if matched:
            hits[category] = matched
    return hits


def _pick_category(hits: dict[str, list[str]]) -> str:
    if not hits:
        return ""
    order = {"environmental": 0, "social": 1, "governance": 2}
    return sorted(hits.keys(), key=lambda c: (-len(hits[c]), order[c]))[0]


def _match_claim_type(text: str) -> str:
    for pat, claim_type in CLAIM_TYPE_PATTERNS:
        if pat.search(text):
            return claim_type
    return "other"


def _score_strength(text: str) -> tuple[float, dict[str, bool]]:
    signals = {
        "commitment": bool(COMMITMENT_MARKERS.search(text)),
        "achievement": bool(ACHIEVEMENT_MARKERS.search(text)),
        "quantitative": bool(NUMBER_PATTERN.search(text)),
        "time_horizon": bool(TIME_HORIZON_PATTERN.search(text)),
    }
    score = _MIN_STRENGTH
    if signals["commitment"]:
        score += 0.20
    if signals["achievement"]:
        score += 0.20
    if signals["quantitative"]:
        score += 0.25
    if signals["time_horizon"]:
        score += 0.15
    return min(round(score, 2), _MAX_STRENGTH), signals


def extract_claims(sentences: list[Sentence]) -> list[Claim]:
    claims: list[Claim] = []
    for sent in sentences:
        text = sent.text
        category_hits = _match_categories(text)
        if sum(len(v) for v in category_hits.values()) < MIN_CATEGORY_HITS:
            continue
        category = _pick_category(category_hits)
        if not category:
            continue
        claim_type = _match_claim_type(text)
        strength, signals = _score_strength(text)
        matched_keywords: list[str] = []
        for kws in category_hits.values():
            matched_keywords.extend(kws)
        claims.append(
            Claim(
                page_number=sent.page_number,
                sentence=text,
                category=category,
                claim_type=claim_type,
                claim_strength=strength,
                matched_keywords=matched_keywords,
                signals=signals,
            )
        )
    logger.info(
        "Extracted %d claims from %d sentences (%.1f%%)",
        len(claims), len(sentences),
        100.0 * len(claims) / max(len(sentences), 1),
    )
    return claims