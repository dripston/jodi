"""Mother / baby / family / ASHA / facility access (no business logic)."""

from __future__ import annotations

from sqlmodel import Session, col, select

from app.core.errors import NotFound
from app.db.models import Asha, AshaTask, Baby, Facility, FamilyContact, Mother
from app.domain.access import MotherContacts


def get_mother(s: Session, mother_id: str) -> Mother:
    m = s.get(Mother, mother_id)
    if m is None:
        raise NotFound(f"mother {mother_id} not found")
    return m


def list_mothers(s: Session) -> list[Mother]:
    """Newest registration first (the dashboard opens on the mother just onboarded)."""
    return list(s.exec(select(Mother).order_by(col(Mother.created_at).desc(), col(Mother.id))))


def mother_by_phone(s: Session, phone: str) -> Mother | None:
    return s.exec(select(Mother).where(Mother.phone == phone)).first()


def baby_of(s: Session, mother_id: str) -> Baby | None:
    return s.exec(select(Baby).where(Baby.mother_id == mother_id)).first()


def family_of(s: Session, mother_id: str) -> list[FamilyContact]:
    return list(s.exec(select(FamilyContact).where(FamilyContact.mother_id == mother_id).order_by(FamilyContact.id)))


def decision_maker(s: Session, mother_id: str) -> FamilyContact | None:
    fam = family_of(s, mother_id)
    return next((f for f in fam if f.decision_maker), fam[0] if fam else None)


def get_asha(s: Session, asha_id: str) -> Asha:
    a = s.get(Asha, asha_id)
    if a is None:
        raise NotFound(f"asha {asha_id} not found")
    return a


def list_ashas(s: Session) -> list[Asha]:
    return list(s.exec(select(Asha).order_by(Asha.id)))


def mothers_of_asha(s: Session, asha_id: str) -> list[Mother]:
    return list(s.exec(select(Mother).where(Mother.asha_id == asha_id).order_by(Mother.id)))


def contacts_directory(s: Session) -> tuple[list[MotherContacts], dict[str, str]]:
    fam: dict[str, list[str]] = {}
    for f in s.exec(select(FamilyContact)):
        fam.setdefault(f.mother_id, []).append(f.phone)
    mothers = [MotherContacts(m.id, m.phone, tuple(fam.get(m.id, [])), m.asha_id) for m in list_mothers(s)]
    ashas = {a.phone: a.id for a in list_ashas(s)}
    return mothers, ashas


def list_facilities(s: Session) -> list[Facility]:
    return list(s.exec(select(Facility).order_by(Facility.id)))


def open_asha_tasks(s: Session, asha_id: str | None = None) -> list[AshaTask]:
    q = select(AshaTask).where(AshaTask.status == "open")
    if asha_id:
        q = q.where(AshaTask.asha_id == asha_id)
    return list(s.exec(q))
