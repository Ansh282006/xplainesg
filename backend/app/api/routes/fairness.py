"""Fairness endpoints — sector and regional distribution of risk."""
from __future__ import annotations

from fastapi import APIRouter

from app.database.supabase_client import get_supabase_admin
from app.utils.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()


@router.get("")
async def fairness_summary() -> dict:
    sb = get_supabase_admin()
    rows = (
        sb.table("analyses")
        .select("greenwashing_risk, company_id, companies(sector, country)")
        .not_.is_("greenwashing_risk", "null")
        .execute()
    ).data or []

    by_sector: dict[str, dict[str, int]] = {}
    by_region: dict[str, dict[str, int]] = {}

    for r in rows:
        company = r.get("companies") or {}
        sector = company.get("sector") or "Unspecified"
        region = company.get("country") or "Unspecified"
        risk = r["greenwashing_risk"]

        by_sector.setdefault(sector, {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "TOTAL": 0})
        by_sector[sector][risk] += 1
        by_sector[sector]["TOTAL"] += 1

        by_region.setdefault(region, {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "TOTAL": 0})
        by_region[region][risk] += 1
        by_region[region]["TOTAL"] += 1

    return {
        "by_sector": [{"sector": k, **v} for k, v in sorted(by_sector.items())],
        "by_region": [{"region": k, **v} for k, v in sorted(by_region.items())],
        "total_analyses": len(rows),
        "note": (
            "Disparate Impact Ratios and per-sector precision/recall require labelled "
            "ground truth. Not computed in baseline. Sample sizes are shown so any "
            "sector difference can be interpreted cautiously."
        ),
    }
