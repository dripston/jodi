"""Application settings, read from environment / `.env` (repo root or backend/)."""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
REPO_ROOT = BACKEND_DIR.parent


# Tests set JODI_NO_DOTENV=1 so real keys / phones in .env never reach the test run.
_ENV_FILES = () if os.environ.get("JODI_NO_DOTENV") else (str(REPO_ROOT / ".env"), str(BACKEND_DIR / ".env"))


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_ENV_FILES,
        env_file_encoding="utf-8",
        extra="ignore",
        env_ignore_empty=True,  # `SARVAM_OUTBOUND_URL=` (copied from .env.example) keeps the default
    )

    sarvam_api_key: str = ""
    # Voice Agents API key (indus.sarvam.ai → Settings → API Key) for placing calls. The platform
    # `sk_` key above is rejected there ("Invalid API key format"). Empty = fall back to SARVAM_API_KEY.
    sarvam_agents_api_key: str = ""
    sarvam_org_id: str = ""
    sarvam_workspace_id: str = ""
    sarvam_agent_id: str = ""
    sarvam_from_number: str = ""
    # Red alert, family step during a live call: "call" = the backend phones the decision-maker and Jodi
    # talks to them (family_alert playbook); "transfer" = Jodi bridges the mother's call to them.
    family_contact: str = "call"
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

    # Telegram: an extra family channel. Voice calls stay primary; Telegram is never the only alert.
    telegram_enabled: bool = False
    telegram_bot_token: str = ""
    telegram_mode: str = "polling"  # polling | webhook
    telegram_webhook_secret: str = ""
    telegram_mock: bool = False
    telegram_timeout_s: float = 8.0
    telegram_poll_timeout_s: int = 25
    docai_poll_max_s: float = 60.0

    # Real demo phones (teammates' own numbers) for live calls. Kept only in .env, never committed;
    # empty = the synthetic +91980000000x numbers. Patient data stays synthetic either way.
    demo_mother_phone: str = ""  # phone A (Lakshmi)
    demo_husband_phone: str = ""  # phone B (Ravi)
    demo_asha_phone: str = ""  # phone C (ASHA Sunita)
    demo_asha_name: str = ""
    # Where the dashboard runs; share links are {public_app_url}/share/{token}.
    public_app_url: str = "http://localhost:5173"  # the real ASHA's name for phone C (empty = "Sunita")

    database_url: str = f"sqlite:///{(BACKEND_DIR / 'jodi.db').as_posix()}"
    scheduler_enabled: bool = True
    seed_on_startup: bool = True
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    docs_dir: Path = REPO_ROOT / "docs"
    # Readable per-call conversation logs (git-ignored; health conversations, demo data only).
    call_logs_enabled: bool = True
    call_logs_dir: Path = BACKEND_DIR / "call_logs"

    # timeouts (seconds)
    llm_timeout_s: float = 6.0
    llm_retries: int = 1
    llm_budget_s: float = 7.0  # all LLM attempts for one tool call together (Sarvam tool limit ~10 s)
    outbound_timeout_s: float = 10.0
    outbound_retries: int = 2
    docai_max_wait_s: float = 60.0


@lru_cache
def get_settings() -> Settings:
    return Settings()
