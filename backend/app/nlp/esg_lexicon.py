"""
ESG lexicon for rule-based claim extraction.

Sources of terminology:
- GRI Standards (Global Reporting Initiative)
- SASB (Sustainability Accounting Standards Board)
- TCFD (Task Force on Climate-related Financial Disclosures)
- SEBI BRSR (Business Responsibility and Sustainability Report)
- Common usage in corporate sustainability reports

Structure:
- CATEGORY_LEXICON: words/phrases grouped by E/S/G
- CLAIM_TYPE_PATTERNS: regex patterns per claim_type
- COMMITMENT_MARKERS: verbs signalling forward-looking promises
- ACHIEVEMENT_MARKERS: verbs signalling past-tense results
- NUMBER_PATTERN: detects quantitative specificity
- TIME_HORIZON_PATTERN: detects target years like "by 2030"

This file is pure data. No logic. Logic lives in claim_extractor.py.
"""

from __future__ import annotations

import re

# ---------------------------------------------------------------------------
# Category lexicons
# ---------------------------------------------------------------------------
# A sentence is a candidate ESG claim if it contains at least one phrase from
# any category. We deliberately keep this broad; the claim_type patterns below
# do the fine-grained classification.

CATEGORY_LEXICON: dict[str, list[str]] = {
    "environmental": [
        # Emissions & climate
        "emission", "emissions", "carbon", "co2", "co₂", "greenhouse gas", "ghg",
        "climate change", "global warming", "carbon footprint", "scope 1", "scope 2",
        "scope 3", "decarbonis", "decarboniz", "net zero", "net-zero",
        "carbon neutral", "carbon neutrality", "paris agreement",
        "science-based target", "sbti", "carbon intensity", "emissions intensity",
        # Energy
        "renewable energy", "clean energy", "solar", "wind power", "wind energy",
        "hydro", "hydrogen", "energy consumption", "energy intensity",
        "energy efficiency", "green energy", "electricity consumption",
        # Water & waste
        "water consumption", "water usage", "water withdrawal", "water intensity",
        "water stewardship", "waste generation", "waste reduction", "waste recycled",
        "circular economy", "recycling", "single-use plastic", "landfill",
        "hazardous waste", "e-waste",
        # Biodiversity & land
        "biodiversity", "deforestation", "land use", "ecosystem", "afforestation",
        "reforestation", "habitat", "conservation",
    ],
    "social": [
        # Employees
        "employee", "employees", "workforce", "staff", "human capital",
        "employee turnover", "attrition", "employee engagement", "employee welfare",
        "employee wellbeing", "employee well-being", "occupational health",
        "workplace safety", "workplace incident", "safety incident",
        "lost time injury", "ltifr", "fatalit", "training hours",
        "learning and development", "reskilling", "upskilling", "talent",
        # Diversity & inclusion
        "diversity", "inclusion", "gender diversity", "women in", "female",
        "underrepresented", "inclusive workplace", "pay equity", "gender pay gap",
        "equal opportunity", "affirmative action",
        # Community
        "community investment", "community engagement", "csr", "corporate social",
        "philanthropy", "social impact", "local community", "community development",
        "supply chain", "supplier", "human rights", "labour rights", "labor rights",
        "child labour", "child labor", "modern slavery", "forced labor", "forced labour",
        # Customers & products
        "product safety", "customer privacy", "data privacy", "data protection",
        "customer satisfaction", "responsible marketing",
    ],
    "governance": [
        # Board & management
        "board of directors", "board independence", "independent director",
        "board diversity", "board committee", "audit committee", "nomination committee",
        "remuneration committee", "executive compensation", "say on pay",
        "chief sustainability officer", "csr committee", "esg committee",
        # Ethics & compliance
        "business ethics", "code of conduct", "anti-bribery", "anti-corruption",
        "corruption", "bribery", "compliance", "whistleblower", "whistle-blower",
        "grievance", "ethics hotline", "regulatory compliance", "anti-money laundering",
        # Transparency & reporting
        "esg disclosure", "sustainability reporting", "brsr", "gri", "sasb", "tcfd",
        "integrated report", "materiality", "stakeholder engagement",
        "transparency", "disclosure", "shareholder rights", "proxy",
    ],
}


# ---------------------------------------------------------------------------
# Claim-type patterns
# ---------------------------------------------------------------------------
# Order matters: first match wins. More specific patterns go first.
# Each pattern is a compiled regex; the value is the claim_type string that
# matches our public.claim_type enum.

CLAIM_TYPE_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\bnet[\s-]?zero\b", re.IGNORECASE), "net_zero"),
    (re.compile(r"\bcarbon[\s-]?neutral(ity)?\b", re.IGNORECASE), "carbon_neutrality"),
    (re.compile(
        r"\b(reduc\w+|lower\w+|cut\w+|decreas\w+|avoid\w+)\b[^.]{0,40}\b"
        r"(emission|carbon|co2|co₂|ghg|greenhouse gas|footprint)",
        re.IGNORECASE,
    ), "emission_reduction"),
    (re.compile(
        r"\b(renewable|clean|green)\s+(energy|electricity|power)\b"
        r"|\bsolar\b|\bwind (power|energy|farm)\b|\bhydrogen\b",
        re.IGNORECASE,
    ), "renewable_energy"),
    (re.compile(
        r"\b(reduc\w+|lower\w+|cut\w+|eliminat\w+|recycl\w+|minimi[sz]\w+)\b"
        r"[^.]{0,40}\b(waste|plastic|landfill|effluent|discharge)",
        re.IGNORECASE,
    ), "waste_reduction"),
    (re.compile(
        r"\b(employee|workforce|worker|staff|human rights|labour|child labour|"
        r"workplace safety|occupational health)\b",
        re.IGNORECASE,
    ), "employee_welfare"),
    (re.compile(
        r"\b(diversity|inclusion|gender|women|female|underrepresented|"
        r"pay (equity|gap)|equal opportunity)\b",
        re.IGNORECASE,
    ), "diversity"),
    (re.compile(
        r"\b(board|governance|compliance|anti[- ]?bribery|anti[- ]?corruption|"
        r"business ethics|code of conduct|whistle[- ]?blower|materiality)\b",
        re.IGNORECASE,
    ), "governance"),
    (re.compile(
        r"\b(commit\w*|pledge\w*|target\w*|goal\w*|aim\w*|"
        r"sustainab\w+|responsible\w+|esg)\b",
        re.IGNORECASE,
    ), "sustainability_commitment"),
]


# ---------------------------------------------------------------------------
# Signal markers used for claim_strength scoring
# ---------------------------------------------------------------------------
# Strong claim = forward-looking commitment + specific number + time horizon.
# Weak claim = vague aspirational language with no numbers.

COMMITMENT_MARKERS = re.compile(
    r"\b(commit\w*|pledge\w*|promise\w*|will|target\w*|aim\w*|plan\w*|"
    r"intend\w*|striv\w*|seeking to|working to|endeavou?r\w*|"
    r"by 20[2-9]\d|by 21\d\d)\b",
    re.IGNORECASE,
)

ACHIEVEMENT_MARKERS = re.compile(
    r"\b(achieved|reduced|eliminated|attained|reached|delivered|"
    r"have (reduced|decreased|lowered|cut)|"
    r"we (reduced|decreased|lowered|cut|achieved|eliminated))\b",
    re.IGNORECASE,
)

NUMBER_PATTERN = re.compile(
    # Number: digit followed by digits/commas, optional decimal.
    # Handles Western (1,234,567) and Indian (12,34,567) comma groupings.
    r"\b\d[\d,]*(?:\.\d+)?\s*"
    r"(%|percent|per cent|tonnes?|tons?|tco2e?|mtco2e?|ktco2e?|"
    r"mw|mwh|gwh|kwh|litres?|liters?|megalitres?|megaliters?|"
    r"million|billion|crore|lakh|rs\.?|inr|usd|\$|€|£)",
    re.IGNORECASE,
)

TIME_HORIZON_PATTERN = re.compile(
    r"\b(by|in|before|from|until|through)\s+(20[2-9]\d|21\d\d)\b",
    re.IGNORECASE,
)