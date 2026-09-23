"""Company CRUD helpers."""
from __future__ import annotations

from typing import Any

from supabase import Client


def upsert_company(
    sb: Client,
    *,
    name: str,
    ticker: str | None,
    country: str | None,
    sector: str | None,
    industry: str | None = None,
    website: str | None = None,
) -> dict[str, Any]:
    """Find by ticker (if given), else by exact name. Create if missing."""
    q = sb.table("companies").select("*")
    q = q.eq("ticker", ticker) if ticker else q.eq("name", name)
    existing = q.limit(1).execute()

    if existing.data:
        return existing.data[0]

    row = {
        "name": name,
        "ticker": ticker,
        "country": country,
        "sector": sector,
        "industry": industry,
        "website": website,
        "is_demo": False,
    }
    res = sb.table("companies").insert(row).execute()
    return res.data[0]
