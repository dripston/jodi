"""APScheduler wiring: due-call runner + escalation tick, every 30 s."""

from __future__ import annotations

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.core.logging import log
from app.core.time import utcnow
from app.db.session import new_session
from app.services import call_service, ticket_service

logger = logging.getLogger(__name__)


async def due_call_job() -> None:
    with new_session() as s:
        try:
            n = await call_service.run_due_calls(s, utcnow())
            if n:
                log(logger, "due calls placed", count=n)
        except Exception:  # never let a job crash the scheduler
            logger.exception("due-call job failed")


async def escalation_job() -> None:
    with new_session() as s:
        try:
            n = await ticket_service.escalation_tick(s, utcnow())
            if n:
                log(logger, "tickets escalated", count=n)
        except Exception:
            logger.exception("escalation job failed")


def build_scheduler() -> AsyncIOScheduler:
    sched = AsyncIOScheduler(timezone="Asia/Kolkata")
    sched.add_job(due_call_job, "interval", seconds=30, id="due_calls", max_instances=1, coalesce=True)
    sched.add_job(escalation_job, "interval", seconds=30, id="escalation", max_instances=1, coalesce=True)
    return sched
