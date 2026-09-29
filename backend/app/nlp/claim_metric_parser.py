"""Parse claim sentences to extract structured metric statements."""
from __future__ import annotations

import re
from dataclasses import dataclass

METRIC_PATTERNS = {
    "carbon_emissions": re.compile(
        r"\b(carbon emissions?|scope\s*[123] emissions?|ghg emissions?|"
        r"greenhouse gas emissions?|co2 emissions?|carbon footprint)\b", re.IGNORECASE),
    "renewable_energy_percentage": re.compile(
        r"\b(renewable energy|clean energy|green energy|solar power|wind (power|energy))\b",
        re.IGNORECASE),
    "energy_consumption": re.compile(
        r"\b(energy consumption|electricity consumption|energy usage|energy intensity)\b",
        re.IGNORECASE),
    "water_consumption": re.compile(
        r"\b(water (consumption|usage|withdrawal|intensity|demand))\b", re.IGNORECASE),
    "waste_generated": re.compile(
        r"\b(waste (generation|reduction)|landfill|plastic waste|waste recycled)\b",
        re.IGNORECASE),
    "employee_count": re.compile(
        r"\b(employee count|headcount|total employees|workforce of|employ(?:s|ed|ing)\s+\d)\b",
        re.IGNORECASE),
    "diversity_percentage": re.compile(
        r"\b(gender diversity|women (in|on|representing|accounting for)|"
        r"female (representation|employees|workforce)|women employees?)\b", re.IGNORECASE),
    "board_independence": re.compile(r"\b(board independence|independent directors?)\b", re.IGNORECASE),
    "board_diversity": re.compile(r"\b(board diversity|female directors?|women on the board)\b", re.IGNORECASE),
    "employee_turnover": re.compile(r"\b(employee turnover|attrition rate|employee retention)\b", re.IGNORECASE),
    "training_hours": re.compile(r"\b(training hours|learning (and|&) development hours)\b", re.IGNORECASE),
    "community_investment": re.compile(r"\b(community investment|csr (spend|spending))\b", re.IGNORECASE),
    "workplace_incidents": re.compile(
        r"\b(workplace incidents?|safety incidents?|lost time injur\w*|fatalit\w*)\b", re.IGNORECASE),
}

DIRECTION_PATTERNS = {
    "reduction": re.compile(
        r"\b(reduc\w*|lower\w*|cut\w*|decreas\w*|avoid\w*|minimi[sz]\w*|eliminat\w*|declin\w*)\b",
        re.IGNORECASE),
    "increase": re.compile(
        r"\b(increas\w*|grew|grown|rais\w*|expanded|doubl\w*|tripl\w*|surge\w*)\b", re.IGNORECASE),
    "commitment": re.compile(
        r"\b(commit\w*|pledge\w*|target\w*|aim\w*|goal\w*|plan\w*|intend\w*|will|striv\w*)\b",
        re.IGNORECASE),
}

VALUE_PCT = re.compile(r"(\d{1,3}(?:\.\d+)?)\s*(?:%|percent|per cent)", re.IGNORECASE)
VALUE_ABS = re.compile(
    r"(\d[\d,]*(?:\.\d+)?)\s*(tco2e|mtco2e|ktco2e|mwh|gwh|kwh|million|billion|crore|lakh)",
    re.IGNORECASE,
)
YEAR_PATTERN = re.compile(r"\b(?:FY)?(20[2-9]\d|21\d{2})\b")

PROXIMITY_WINDOW = 60
NOISE_INDICATORS = re.compile(
    r"(\bpostal ballot\b|\bvoting results?\b|\bscrutinizer\b|\bresolution(s)? (passed|approved)\b|"
    r"\bdate of (meeting|notice)\b|\bcolumn \d\b|\btable \d\b)", re.IGNORECASE,
)

# CHANGE-frame verbs — if any of these appear near the metric, it's a CHANGE claim
CHANGE_VERBS = re.compile(
    r"\b(increas\w*|decreas\w*|reduc\w*|lower\w*|cut|grew|grown|rais\w*|expand\w*|"
    r"doubl\w*|tripl\w*|surge\w*|declin\w*|rose|risen|fell|fallen|improved|worsened|"
    r"avoided|eliminated|minimi[sz]\w*|declining|dropping)\b",
    re.IGNORECASE,
)
# LEVEL-frame verbs — states of being
LEVEL_VERBS = re.compile(
    r"\b(is|are|was|were|stands? at|consist\w* of|account\w* for|represent\w*|"
    r"comprise\w*|constitute\w*|reach\w*|reached|maintain\w*)\b",
    re.IGNORECASE,
)

CLAUSE_SPLIT = re.compile(r"[,;:\.\u2014\u2013]")


@dataclass(frozen=True)
class ClaimMetric:
    direction: str | None
    metric: str | None
    value_pct: float | None
    value_abs: float | None
    unit: str | None
    year: int | None
    confidence: float
    claim_type: str  # 'level' | 'change' | 'unknown'


def _extract_direction(text: str) -> str | None:
    for direction, pat in DIRECTION_PATTERNS.items():
        if pat.search(text):
            return direction
    return None


def _find_metric_span(text: str) -> tuple[str | None, int, int]:
    earliest = None
    for key, pat in METRIC_PATTERNS.items():
        m = pat.search(text)
        if m and (earliest is None or m.start() < earliest[1]):
            earliest = (key, m.start(), m.end())
    if earliest is None:
        return None, -1, -1
    return earliest


def _find_value_spans(text: str):
    spans = []
    for m in VALUE_PCT.finditer(text):
        spans.append((float(m.group(1)) / 100.0, None, "%", m.start(), m.end()))
    for m in VALUE_ABS.finditer(text):
        spans.append((None, float(m.group(1).replace(",", "")), m.group(2).lower(), m.start(), m.end()))
    return spans


def _extract_year(text: str) -> int | None:
    m = YEAR_PATTERN.search(text)
    return int(m.group(1)) if m else None


def _clause_containing(text: str, pos: int) -> tuple[int, int]:
    start = 0
    for m in CLAUSE_SPLIT.finditer(text):
        if m.start() >= pos:
            return start, m.start()
        start = m.end()
    return start, len(text)


def _classify_claim_type(text: str) -> str:
    """
    'change' if a change-frame verb appears (increased/reduced/grew/etc.)
    'level'  if a level-frame verb or no change verb appears
    Falls back to 'unknown' only if text is empty.
    """
    if not text.strip():
        return "unknown"
    if CHANGE_VERBS.search(text):
        return "change"
    if LEVEL_VERBS.search(text):
        return "level"
    # No explicit verb — but contains a %, so it's probably a level statement
    return "level"


def parse_claim_metric(sentence: str) -> ClaimMetric:
    if NOISE_INDICATORS.search(sentence):
        return ClaimMetric(None, None, None, None, None, None, 0.0, "unknown")

    metric_key, m_start, m_end = _find_metric_span(sentence)
    if metric_key is None:
        return ClaimMetric(None, None, None, None, None, None, 0.0, "unknown")

    clause_start, clause_end = _clause_containing(sentence, m_start)
    clause = sentence[clause_start:clause_end]

    value_spans = _find_value_spans(clause)
    best_value = None
    best_distance = None
    for v in value_spans:
        _, _, _, v_start, v_end = v
        metric_local_start = m_start - clause_start
        metric_local_end = m_end - clause_start
        distance = min(abs(v_start - metric_local_end), abs(metric_local_start - v_end))
        if best_distance is None or distance < best_distance:
            best_distance = distance
            best_value = v

    claim_type = _classify_claim_type(sentence)

    if best_value is None or best_distance is None or best_distance > PROXIMITY_WINDOW:
        direction = _extract_direction(clause)
        year = _extract_year(clause)
        confidence = 0.35 + (0.10 if year else 0.0)
        return ClaimMetric(
            direction=direction, metric=metric_key,
            value_pct=None, value_abs=None, unit=None,
            year=year, confidence=round(confidence, 2), claim_type=claim_type,
        )

    value_pct, value_abs, unit = best_value[0], best_value[1], best_value[2]
    direction = _extract_direction(clause)
    year = _extract_year(clause)

    # Sign flip ONLY for change claims (never touch level claims)
    if value_pct is not None and claim_type == "change":
        metric_local_start = m_start - clause_start
        metric_local_end = m_end - clause_start
        for d_name in ("reduction", "increase"):
            for m in DIRECTION_PATTERNS[d_name].finditer(clause):
                if m.start() < metric_local_start and (metric_local_start - m.end()) <= 30:
                    if d_name == "reduction":
                        value_pct = -abs(value_pct)
                    else:
                        value_pct = abs(value_pct)
                    break
            else:
                continue
            break

    confidence = 0.0
    confidence += 0.40
    if value_pct is not None or value_abs is not None:
        confidence += 0.30
    if direction:
        confidence += 0.15
    if year:
        confidence += 0.15

    return ClaimMetric(
        direction=direction, metric=metric_key,
        value_pct=value_pct, value_abs=value_abs, unit=unit,
        year=year, confidence=round(confidence, 2), claim_type=claim_type,
    )