from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import health
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


@app.on_event("startup")
async def on_startup() -> None:
    logger.info(
        "XplainESG API starting | env=%s | cors=%s",
        settings.app_env,
        settings.cors_origin_list,
    )