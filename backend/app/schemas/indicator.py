from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class IndicatorBase(BaseModel):
    year: int = Field(..., ge=1990, le=2100)
    report_id: UUID | None = None
    carbon_emissions: float | None = None
    emissions_intensity: float | None = None
    energy_consumption: float | None = None
    renewable_energy_percentage: float | None = Field(default=None, ge=0, le=100)
    water_consumption: float | None = None
    waste_generated: float | None = None
    waste_recycled: float | None = None
    employee_count: int | None = None
    employee_turnover: float | None = None
    workplace_incidents: int | None = None
    diversity_percentage: float | None = Field(default=None, ge=0, le=100)
    training_hours: float | None = None
    community_investment: float | None = None
    board_independence: float | None = Field(default=None, ge=0, le=100)
    board_diversity: float | None = Field(default=None, ge=0, le=100)
    corruption_incidents: int | None = None
    compliance_incidents: int | None = None
    governance_score: float | None = Field(default=None, ge=0, le=100)
    source: str | None = None


class IndicatorCreate(IndicatorBase):
    company_id: UUID


class IndicatorOut(IndicatorBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    company_id: UUID
    created_at: datetime
    updated_at: datetime