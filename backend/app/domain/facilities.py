"""Facility ranking (pure).

Routine: services match → distance → cost. Emergency: nearest *government* facility with
the needed services and open 24x7 — cost is never considered.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

COST_RANK = {"free": 0, "low": 1, "medium": 2, "high": 3}

NEED_SERVICES: dict[str, frozenset[str]] = {
    "routine_checkup": frozenset({"postnatal_care"}),
    "phototherapy": frozenset({"phototherapy"}),
    "emergency": frozenset({"c_section", "blood_bank", "newborn_care"}),
    "emergency_mother": frozenset({"c_section", "blood_bank"}),
    "emergency_baby": frozenset({"newborn_care"}),
}


@dataclass(frozen=True)
class FacilityInfo:
    id: str
    name: str
    type: str  # government | private | ...
    services: frozenset[str]
    lat: float
    lng: float
    cost_band: str
    open_24x7: bool


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def rank(facilities: list[FacilityInfo], need: str, lat: float, lng: float) -> list[tuple[FacilityInfo, float]]:
    """Return facilities (with distance km) best first. Empty list if none qualify."""
    required = NEED_SERVICES.get(need, frozenset())
    with_dist = [(f, haversine_km(lat, lng, f.lat, f.lng)) for f in facilities]
    if need.startswith("emergency"):
        ok = [(f, d) for f, d in with_dist
              if f.type == "government" and f.open_24x7 and required <= f.services]  # fmt: skip
        return sorted(ok, key=lambda fd: fd[1])

    def key(fd: tuple[FacilityInfo, float]) -> tuple[int, float, int]:
        f, d = fd
        missing = len(required - f.services)
        return (missing, round(d, 1), COST_RANK.get(f.cost_band, 9))

    return sorted(with_dist, key=key)


def say_text(f: FacilityInfo, distance_km: float) -> str:
    km = max(1, round(distance_km))
    hours = ", open 24 hours" if f.open_24x7 else ""
    return f"{f.name}, {km} kilometre{'s' if km != 1 else ''} away{hours}."
