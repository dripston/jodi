from __future__ import annotations

import os

os.environ.update({
    "JODI_NO_DOTENV": "1",  # never read the developer's .env (real keys, real phones) in tests
    "DATABASE_URL": "sqlite:///:memory:",
    "SARVAM_MOCK": "true",
    "TOOL_SHARED_SECRET": "test-secret",
    "DEMO_MODE": "true",
    "SCHEDULER_ENABLED": "false",
    "SEED_ON_STARTUP": "false",
    "SARVAM_API_KEY": "",
    "TELEGRAM_ENABLED": "true",
    "TELEGRAM_MOCK": "true",
    "TELEGRAM_MODE": "webhook",  # the polling loop is tested on its own
    "TELEGRAM_WEBHOOK_SECRET": "tg-secret",
    "TELEGRAM_BOT_TOKEN": "",
    "FAMILY_CONTACT": "transfer",
    "CALL_LOGS_ENABLED": "false",  # tests write no files (one test enables it with a temp folder)  # most scenario tests check the transfer path; call mode is tested explicitly
})  # fmt: skip

from datetime import UTC, datetime, timedelta  # noqa: E402

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.api.deps import now as now_dep  # noqa: E402
from app.db.session import new_session  # noqa: E402
from app.main import create_app  # noqa: E402

AUTH = {"Authorization": "Bearer test-secret"}
START = datetime(2026, 11, 13, 4, 0, tzinfo=UTC)  # 09:30 IST


class Clock:
    def __init__(self) -> None:
        self.t = START

    def __call__(self) -> datetime:
        return self.t

    def advance(self, **kw: float) -> datetime:
        self.t = self.t + timedelta(**kw)
        return self.t


@pytest.fixture
def clock() -> Clock:
    return Clock()


@pytest.fixture
def client(clock: Clock) -> TestClient:
    app = create_app()
    app.dependency_overrides[now_dep] = clock
    with TestClient(app) as c:
        assert c.post("/api/demo/reset?keep_telegram=false").status_code == 200
        yield c


@pytest.fixture
def session():
    with new_session() as s:
        yield s
