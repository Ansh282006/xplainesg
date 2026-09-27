from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve .env relative to THIS file so it works no matter the CWD.
_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_PATH),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # --- Supabase (server side) ---
    supabase_url: str = Field(..., alias="SUPABASE_URL")
    supabase_service_role_key: str = Field(..., alias="SUPABASE_SERVICE_ROLE_KEY")

    # --- App ---
    app_env: Literal["development", "staging", "production"] = Field(
        "development", alias="APP_ENV"
    )
    log_level: str = Field("INFO", alias="LOG_LEVEL")
    cors_origins: str = Field("http://localhost:5180", alias="CORS_ORIGINS")

    # --- ML ---
    ml_inference_url: str = Field("", alias="ML_INFERENCE_URL")
    model_path: str = Field("../ml/models", alias="MODEL_PATH")
    model_version: str = Field("", alias="MODEL_VERSION")
    huggingface_token: str = Field("", alias="HUGGINGFACE_TOKEN")

    # --- Demo ---
    demo_mode: bool = Field(False, alias="DEMO_MODE")

    @field_validator("supabase_url")
    @classmethod
    def _strip_trailing_slash(cls, v: str) -> str:
        return v.rstrip("/")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]