"""Application settings, read from environment / `.env` (repo root or backend/)."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
REPO_ROOT = BACKEND_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(REPO_ROOT / ".env"), str(BACKEND_DIR / ".env")),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    sarvam_api_key: str = ""
    sarvam_org_id: str = ""
    sarvam_workspace_id: str = ""
    sarvam_agent_id: str = ""
    sarvam_from_number: str = ""
    sarvam_agent_version: int = 1
    sarvam_connection_id: str = ""  # telephony connection id (dashboard → Deploy with Code recipe)
    # Instant Outbound URL; {org_id} / {workspace_id} / {agent_id} placeholders are filled in.
    sarvam_outbound_url: str = (
        "https://apps.sarvam.ai/api/outbounds/v1/orgs/{org_id}/workspaces/{workspace_id}/outbounds"
    )
    sarvam_llm_url: str = "https://api.sarvam.ai/v1/chat/completions"
    sarvam_llm_model: str = "sarvam-105b"

    public_base_url: str = ""
    tool_shared_secret: str = ""
    demo_mode: bool = True
    sarvam_mock: bool = False

    database_url: str = f"sqlite:///{(BACKEND_DIR / 'jodi.db').as_posix()}"
    scheduler_enabled: bool = True
    seed_on_startup: bool = True
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    docs_dir: Path = REPO_ROOT / "docs"

    # timeouts (seconds)
    llm_timeout_s: float = 6.0
    llm_retries: int = 1
    outbound_timeout_s: float = 10.0
    outbound_retries: int = 2
    docai_max_wait_s: float = 60.0


@lru_cache
def get_settings() -> Settings:
    return Settings()
