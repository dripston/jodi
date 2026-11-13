"""Ranked facility options for a mother (dashboard list; same ranking Jodi and Telegram use)."""

from __future__ import annotations

from sqlmodel import Session

from app.db.models import Mother
from app.domain import facilities as fac
from app.repositories import mothers as mrepo
from app.repositories import records as rrepo
from app.schemas.api import FacilityOptionOut, FacilityOptionsOut


def infos(s: Session) -> list[fac.FacilityInfo]:
    return [fac.FacilityInfo(f.id, f.name, f.type, frozenset(f.services), f.lat, f.lng, f.cost_band, f.open_24x7,
                             f.availability) for f in mrepo.list_facilities(s)]  # fmt: skip


def need_for(s: Session, mother: Mother) -> str:
    t = rrepo.active_ticket(s, mother.id)
    if t is None or t.level != "red":
        return "routine_checkup"
    subjects = set(t.subjects)
    if subjects >= {"mother", "baby"}:
        return "emergency"
    return "emergency_baby" if subjects == {"baby"} else "emergency_mother"


def options_for(s: Session, mother: Mother, need: str | None, limit: int = 5) -> FacilityOptionsOut:
    need = need or need_for(s, mother)
    phones = {f.id: f.phone for f in mrepo.list_facilities(s)}
    opts = fac.options(infos(s), need, mother.lat, mother.lng, limit)
    return FacilityOptionsOut(need=need, options=[
        FacilityOptionOut(id=o.facility.id, name=o.facility.name, type=o.facility.type,
                          phone=phones.get(o.facility.id, ""), distance_km=o.distance_km,
                          cost_band=o.facility.cost_band, open_24x7=o.facility.open_24x7,
                          availability=o.facility.availability, services=sorted(o.facility.services),
                          reasons=list(o.reasons))
        for o in opts
    ])  # fmt: skip
