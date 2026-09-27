from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict


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
    confidence_score: float | None
    status: str
    is_demo: bool
    missing_data: dict[str, Any] | None
    feature_vector: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime


class AnalysisResult(BaseModel):
    analysis: AnalysisOut
    scoring_version: str
    explanations: dict[str, Any]