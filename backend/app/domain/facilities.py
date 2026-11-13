"""Facility ranking (pure). One ranking feeds Jodi's script, Telegram and the dashboard list.

Emergency: must have the needed services and be open 24x7; then beds not full → distance band
(≤5, ≤10, ≤20 km, further) → cost → exact distance. So among hospitals about as near, the free or
cheaper one comes first, but a much farther hospital never beats a near capable one.
Routine: needed services → beds not full → cost → distance.
Bed availability is demo data until a live source (state health system) exists.
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
    availability: str = "unknown"  # available | limited | full | unknown (demo data)


AVAILABILITY_RANK = {"available": 0, "limited": 1, "unknown": 1, "full": 3}
SERVICE_WORDS = {"c_section": "C-section", "blood_bank": "blood bank", "newborn_care": "newborn care",
                 "phototherapy": "phototherapy", "postnatal_care": "postnatal care", "labour_room": "labour room"}  # fmt: skip
COST_WORDS = {"free": "free (government)", "low": "low cost", "medium": "medium cost", "high": "high cost"}


@dataclass(frozen=True)
class Option:
    facility: FacilityInfo
    distance_km: float
    reasons: tuple[str, ...]


def _band(km: float) -> int:
    return 0 if km <= 5 else 1 if km <= 10 else 2 if km <= 20 else 3


def options(facilities: list[FacilityInfo], need: str, lat: float, lng: float, limit: int = 5) -> list[Option]:
    """Ranked choices with plain-language reasons (best first)."""
    required = NEED_SERVICES.get(need, frozenset())
    emergency = need.startswith("emergency")
    rows = [(f, haversine_km(lat, lng, f.lat, f.lng)) for f in facilities]
    if emergency:
        rows = [(f, d) for f, d in rows if f.open_24x7 and required <= f.services]

        def key(fd: tuple[FacilityInfo, float]) -> tuple[float, ...]:
            f, d = fd
            full = AVAILABILITY_RANK.get(f.availability, 1) >= 3
            return (full, _band(d), COST_RANK.get(f.cost_band, 9), d)
    else:

        def key(fd: tuple[FacilityInfo, float]) -> tuple[float, ...]:
            f, d = fd
            full = AVAILABILITY_RANK.get(f.availability, 1) >= 3
            return (len(required - f.services), full, COST_RANK.get(f.cost_band, 9), round(d, 1))

    out = []
    for f, d in sorted(rows, key=key)[:limit]:
        can = [SERVICE_WORDS.get(x, x) for x in sorted(required & f.services)]
        reasons = [f"Can treat: {', '.join(can)}" if can else "General care",
                   f"{d:.1f} km away", COST_WORDS.get(f.cost_band, f.cost_band),
                   f"beds: {f.availability} (demo data)"] + (["open 24×7"] if f.open_24x7 else [])  # fmt: skip
        out.append(Option(f, round(d, 1), tuple(reasons)))
    return out


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def rank(facilities: list[FacilityInfo], need: str, lat: float, lng: float) -> list[tuple[FacilityInfo, float]]:
    """Return facilities (with distance km) best first. Empty list if none qualify."""
    return [(o.facility, o.distance_km) for o in options(facilities, need, lat, lng, limit=len(facilities))]


def _rank_v1(facilities: list[FacilityInfo], need: str, lat: float, lng: float) -> list[tuple[FacilityInfo, float]]:
    """Previous ranking (government-only emergencies), kept for reference."""
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
