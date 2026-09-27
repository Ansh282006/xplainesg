from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (
    analysis, audit_logs, auth, companies, dashboard, explanations, fairness, health, indicators, reports,
)
from app.core.config import get_settings
from app.utils.logging import configure_logging, get_logger

configure_logging()
logger = get_logger(__name__)

settings = get_settings()

app = FastAPI(
    title="XplainESG API",
    description=(
        "Responsible and Explainable AI framework for trustworthy ESG assessment "
        "and greenwashing risk detection. Research prototype."
    ),
    version="0.1.0",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["health"])
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(companies.router, prefix="/companies", tags=["companies"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
app.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
app.include_router(indicators.router, prefix="/indicators", tags=["indicators"])
app.include_router(reports.router, prefix="/reports", tags=["reports"])
app.include_router(fairness.router, prefix="/fairness", tags=["fairness"])
app.include_router(audit_logs.router, prefix="/audit-logs", tags=["audit-logs"])
app.include_router(explanations.router, prefix="/explanations", tags=["explanations"])


@app.on_event("startup")
async def on_startup() -> None:
    logger.info(
        "XplainESG API starting | env=%s | cors=%s",
        settings.app_env,
        settings.cors_origin_list,
    )
