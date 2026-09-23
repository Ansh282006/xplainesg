"""ESG report CRUD helpers."""
from __future__ import annotations

from typing import Any

from supabase import Client


def upsert_report(
    sb: Client,
    *,
    company_id: str,
    report_title: str,
    report_year: int,
    report_type: str,
    file_path: str | None = None,
) -> dict[str, Any]:
    """Find by (company_id, report_year, report_title). Create if missing."""
    existing = (
        sb.table("esg_reports")
        .select("*")
        .eq("company_id", company_id)
        .eq("report_year", report_year)
        .eq("report_title", report_title)
        .limit(1)
        .execute()
    )
    if existing.data:
        return existing.data[0]

    row = {
        "company_id": company_id,
        "report_title": report_title,
        "report_year": report_year,
        "report_type": report_type,
        "file_path": file_path,
        "processing_status": "processed",
    }
    res = sb.table("esg_reports").insert(row).execute()
    return res.data[0]
