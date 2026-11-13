"""Engine, session dependency and init."""

from __future__ import annotations

from collections.abc import Iterator
from functools import lru_cache

from sqlalchemy import Engine, event
from sqlmodel import Session, SQLModel, create_engine

from app.core.config import get_settings
from app.db import models  # noqa: F401  (register tables)


@lru_cache
def get_engine() -> Engine:
    url = get_settings().database_url
    kwargs: dict[str, object] = {}
    if url.startswith("sqlite"):
        kwargs["connect_args"] = {"check_same_thread": False, "timeout": 15}
        if ":memory:" in url:
            from sqlalchemy.pool import StaticPool

            kwargs["poolclass"] = StaticPool
    engine = create_engine(url, **kwargs)
    if url.startswith("sqlite"):

        @event.listens_for(engine, "connect")
        def _pragma(dbapi_conn, _):  # type: ignore[no-untyped-def]
            cur = dbapi_conn.cursor()
            cur.execute("PRAGMA journal_mode=WAL")
            cur.execute("PRAGMA foreign_keys=ON")
            cur.close()

    return engine


def init_db() -> None:
    SQLModel.metadata.create_all(get_engine())


def reset_db() -> None:
    engine = get_engine()
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    with Session(get_engine(), expire_on_commit=False) as session:
        yield session


def new_session() -> Session:
    return Session(get_engine(), expire_on_commit=False)
