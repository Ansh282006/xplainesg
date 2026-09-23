"""
Rule-based ESG claim extraction.

Input:  Sentence[] (from text_cleaner)
Output: Claim[] — filtered, categorised, scored

Algorithm per sentence:
1. Match against CATEGORY_LEXICON -> candidate if any hit in E/S/G.
2. Match against CLAIM_TYPE_PATTERNS -> specific claim_type (first match wins).
3. Score claim_strength via signals:
     - commitment marker (forward-looking language)
     - achievement marker (past-tense language)
     - quantitative specificity (numbers with units)
     - time horizon (target years)
4. Sentiment is left as None for Phase 3 (added later).

This is a baseline. It is deliberately explainable: every claim retains the
keywords and signals that produced its classification.
"""

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

# A sentence must contain at least this many distinct category keywords
# to be kept. 1 is permissive; 2+ is stricter. Start at 1 to build a broad
# baseline; tune later against a labelled set.
MIN_CATEGORY_HITS = 1

# claim_strength bounds
_MIN_STRENGTH = 0.20
_MAX_STRENGTH = 1.00

# Pre-compile a case-insensitive word-boundary matcher per category keyword.
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
    category: str            # 'environmental' | 'social' | 'governance'
    claim_type: str          # matches public.claim_type enum
    claim_strength: float    # 0.0 - 1.0
    matched_keywords: list[str] = field(default_factory=list)
    signals: dict[str, bool] = field(default_factory=dict)


def _match_categories(text: str) -> dict[str, list[str]]:
    """Return {category: [matched_keywords]} for categories with >=1 hit."""
    hits: dict[str, list[str]] = {}
    for category, matchers in _CATEGORY_MATCHERS.items():
        matched = [kw for kw, pat in matchers if pat.search(text)]
        if matched:
            hits[category] = matched
    return hits


def _pick_category(hits: dict[str, list[str]]) -> str:
    """
    Pick the dominant category by keyword count. Ties broken by
    E > S > G priority (order reflects the 40/30/30 weighting in the spec).
    """
    if not hits:
        return ""
    order = {"environmental": 0, "social": 1, "governance": 2}
    return sorted(hits.keys(), key=lambda c: (-len(hits[c]), order[c]))[0]


def _match_claim_type(text: str) -> str:
    """First matching pattern wins. Falls back to 'other'."""
    for pat, claim_type in CLAIM_TYPE_PATTERNS:
        if pat.search(text):
            return claim_type
    return "other"


def _score_strength(text: str) -> tuple[float, dict[str, bool]]:
    """
    Heuristic strength score in [0.2, 1.0].

    Baseline 0.20. Each signal adds a fixed amount:
      commitment language    +0.20
      achievement language   +0.20
      numeric specificity    +0.25
      time horizon           +0.15
    Cap at 1.0.
    """
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
    """Apply the pipeline to every sentence. O(n) over the corpus."""
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
        len(claims),
        len(sentences),
        100.0 * len(claims) / max(len(sentences), 1),
    )
    return claims