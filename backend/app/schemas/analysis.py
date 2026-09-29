from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AnalysisCreate(BaseModel):
    report_id: UUID
    indicators: dict[str, Any] | None = None


class AnalysisOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    report_id: UUID | None
    model_version: str | None
    esg_performance_score: float | None
    esg_trust_score: float | None
    environmental_score: float | None
    social_score: float | None
    governance_score: float | None
    claim_credibility_score: float | None
    greenwashing_risk: str | None
    greenwashing_probability: float | None
    risk_rating: float | None = None
    confidence_score: float | None
    status: str
    is_demo: bool
    missing_data: dict[str, Any] | None
    feature_vector: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime


class EvidenceRow(BaseModel):
    claim_id: UUID | None
    sentence: str
    page_number: int | None
    claim_type: str | None
    metric: str
    direction: str | None
    claimed_pct: float | None
    actual_pct: float | None
    divergence: float
    interpretation: str
    reliable: bool


class AnalysisResult(BaseModel):
    analysis: AnalysisOut
    scoring_version: str
    explanations: dict[str, Any]
    evidence_table: list[EvidenceRow] = []
    evidence_summary: dict[str, Any] = {}


class IndicatorPreviewRequest(BaseModel):
    indicators: dict[str, Any] = Field(default_factory=dict)


class IndicatorPreviewResponse(BaseModel):
    rating: float | None
    weakness: float | None
    signals: dict[str, float]
    breakdown: dict[str, Any]
    note: str