from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException

from app.database.supabase_client import get_supabase_admin
from app.schemas.analysis import AnalysisCreate, AnalysisOut, AnalysisResult
from app.services import analysis_service

router = APIRouter()


@router.post("", response_model=AnalysisResult)
async def create_analysis(payload: AnalysisCreate) -> AnalysisResult:
    sb = get_supabase_admin()
    try:
        result = analysis_service.run_analysis(
            sb,
            report_id=str(payload.report_id),
            override_indicators=payload.indicators,
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}") from exc

    return AnalysisResult(
        analysis=AnalysisOut(**result["analysis"]),
        scoring_version=result["scoring_version"],
        explanations=result["explanations"],
    )


@router.get("/{analysis_id}", response_model=AnalysisOut)
async def get_analysis(analysis_id: UUID) -> AnalysisOut:
    sb = get_supabase_admin()
    res = (
        sb.table("analyses")
        .select("*")
        .eq("id", str(analysis_id))
        .limit(1)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return AnalysisOut(**res.data[0])