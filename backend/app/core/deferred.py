"""Work that must not delay a live Sarvam tool reply (Sarvam drops a tool call after ~10 s).

A route opens `collect()`; services call `defer(job)` for slow side effects (placing the family
call, Telegram). The route hands the jobs to FastAPI BackgroundTasks, which run them right after
the response is sent. Outside a collecting route (scheduler, post-call hooks) `defer` returns False
and the caller runs the work inline as before.
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable, Iterator
from contextlib import contextmanager
from contextvars import ContextVar

Job = Callable[[], Awaitable[None]]

_jobs: ContextVar[list[Job] | None] = ContextVar("deferred_jobs", default=None)


@contextmanager
def collect() -> Iterator[list[Job]]:
    jobs: list[Job] = []
    token = _jobs.set(jobs)
    try:
        yield jobs
    finally:
        _jobs.reset(token)


def defer(job: Job) -> bool:
    jobs = _jobs.get()
    if jobs is None:
        return False
    jobs.append(job)
    return True
