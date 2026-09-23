"""Persist extracted claims to esg_claims. Idempotent per report."""
from __future__ import annotations

from typing import Any

from supabase import Client

from app.nlp.claim_extractor import Claim


def replace_claims_for_report(
    sb: Client,
    *,
    company_id: str,
    report_id: str,
    claims: list[Claim],
) -> int:
    """Delete existing claims for this report, then bulk-insert the new set."""
    sb.table("esg_claims").delete().eq("report_id", report_id).execute()

    if not claims:
        return 0

    rows: list[dict[str, Any]] = [
        {
            "company_id": company_id,
            "report_id": report_id,
            "page_number": c.page_number,
            "sentence": c.sentence,
            "claim_type": c.claim_type,
            "category": c.category,
            "sentiment": None,
            "claim_strength": c.claim_strength,
            "evidence_available": bool(c.signals.get("quantitative")),
            "divergence_score": None,
            "extracted_features": {
                "matched_keywords": c.matched_keywords,
                "signals": c.signals,
            },
        }
        for c in claims
    ]

    # Supabase recommends batching inserts to stay under payload limits.
    BATCH = 200
    inserted = 0
    for i in range(0, len(rows), BATCH):
        chunk = rows[i : i + BATCH]
        sb.table("esg_claims").insert(chunk).execute()
        inserted += len(chunk)

    return inserted
