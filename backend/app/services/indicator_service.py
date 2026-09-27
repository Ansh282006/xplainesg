from __future__ import annotations

from typing import Any

from supabase import Client

from app.schemas.indicator import IndicatorCreate


def upsert_indicator(sb: Client, payload: IndicatorCreate) -> dict[str, Any]:
    data = payload.model_dump(mode="json")
    company_id = data.pop("company_id")
    year = data["year"]

    existing = (
        sb.table("esg_indicators")
        .select("id")
        .eq("company_id", company_id)
        .eq("year", year)
        .limit(1)
        .execute()
    )

    if existing.data:
        res = (
            sb.table("esg_indicators")
            .update(data)
            .eq("id", existing.data[0]["id"])
            .execute()
        )
    else:
        data["company_id"] = company_id
        res = sb.table("esg_indicators").insert(data).execute()

    return res.data[0]


def list_indicators(sb: Client, company_id: str) -> list[dict[str, Any]]:
    res = (
        sb.table("esg_indicators")
        .select("*")
        .eq("company_id", company_id)
        .order("year", desc=True)
        .execute()
    )
    return res.data or []