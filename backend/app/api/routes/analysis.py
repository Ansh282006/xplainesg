from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_current_user, require_roles
from app.core.scoring import compute_indicator_weakness_public
from app.database.supabase_client import get_supabase_admin
from app.schemas.analysis import (
    AnalysisCreate,
    AnalysisOut,
    AnalysisResult,
    IndicatorPreviewRequest,
    IndicatorPreviewResponse,
    ReviewCreate,
)
from app.schemas.auth import CurrentUser
from app.services import analysis_service

router = APIRouter()


# --- STATIC routes first ---
@router.post("/preview", response_model=IndicatorPreviewResponse)
async def preview_rating(payload: IndicatorPreviewRequest) -> IndicatorPreviewResponse:
    """
    Live 0-10 risk preview from user-supplied indicators only.
    """
    result = compute_indicator_weakness_public(payload.indicators or {})

    return IndicatorPreviewResponse(
        rating=result.get("rating"),
        weakness=result.get("score"),
        signals=result.get("signals", {}),
        breakdown={
            "formula": (
                "indicator_weakness = mean of per-field weakness; "
                "rating = 10 × indicator_weakness"
            ),
            "reason": result.get("reason"),
            "n_signals": result.get("n_signals", 0),
        },
        note=(
            "Preview only. Final rating also considers claim vagueness and "
            "claim-vs-indicator divergence once the report is analysed."
        ),
    )


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
        evidence_table=result.get("evidence_table", []),
        evidence_summary=result.get("evidence_summary", {}),
    )


# --- DYNAMIC routes last ---
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


@router.post("/{analysis_id}/review")
async def review_analysis(
    analysis_id: UUID,
    payload: ReviewCreate,
    user: CurrentUser = Depends(require_roles("admin", "reviewer")),
) -> dict:
    sb = get_supabase_admin()
    try:
        return analysis_service.submit_review(
            sb, analysis_id=str(analysis_id), reviewer_id=str(user.id), payload=payload
        )
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.get("/{analysis_id}/review")
async def get_review(analysis_id: UUID) -> dict | None:
    sb = get_supabase_admin()
    res = (
        sb.table("human_reviews")
        .select("*")
        .eq("analysis_id", str(analysis_id))
        .limit(1)
        .execute()
    )
    return res.data[0] if res.data else None
