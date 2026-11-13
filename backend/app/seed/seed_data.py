"""Synthetic demo data only — no real patients. Names/numbers are fictional."""

from __future__ import annotations

from datetime import datetime, timedelta

from sqlmodel import Session

from app.core.time import ist_today
from app.db.models import Asha, AshaTask, Assessment, Baby, Facility, FamilyContact, Mother, Ticket, TicketEvent
from app.domain.rules import RULES_VERSION
from app.domain.scheduling import is_high_risk
from app.services import call_service, record_service
from app.services.status import refresh_status

ASHAS = [  # (id, name, phone, village)
    ("a_001", "Sunita", "+919800000009", "Demo Village"),
    ("a_002", "Meena", "+919800000010", "Demo Village 2"),
]

# (id, name, type, services, lat, lng, cost_band, open_24x7) — synthetic "(demo)" facilities
_EMONC = ["labour_room", "c_section", "blood_bank", "newborn_care", "phototherapy", "postnatal_care"]
FACILITIES: list[tuple[str, str, str, list[str], float, float, str, bool]] = [
    ("f_001", "Bengaluru District Hospital (demo)", "government", _EMONC, 12.9716, 77.5946, "free", True),
    ("f_002", "Bengaluru Maternity Hospital (demo)", "government", _EMONC, 12.9850, 77.5720, "free", True),
    ("f_003", "Jayanagar General Hospital (demo)", "government", _EMONC, 12.9300, 77.5830, "free", True),
    ("f_004", "Yelahanka Taluk Hospital (demo)", "government", ["labour_room", "c_section", "newborn_care", "postnatal_care"], 13.1007, 77.5963, "free", True),
    ("f_005", "Indiranagar PHC (demo)", "government", ["postnatal_care", "labour_room"], 12.9784, 77.6408, "free", False),
    ("f_006", "Malleshwaram UPHC (demo)", "government", ["postnatal_care"], 13.0035, 77.5700, "free", False),
    ("f_007", "Whitefield CHC (demo)", "government", ["labour_room", "newborn_care", "postnatal_care"], 12.9698, 77.7500, "free", True),
    ("f_008", "Koramangala Mother & Child Clinic (demo)", "private", ["postnatal_care", "phototherapy", "newborn_care"], 12.9352, 77.6245, "medium", False),
    ("f_009", "Hebbal Women's Hospital (demo)", "private", _EMONC, 13.0358, 77.5970, "high", True),
    ("f_010", "Banashankari Nursing Home (demo)", "private", ["labour_room", "c_section", "postnatal_care"], 12.9255, 77.5468, "medium", True),
    ("f_011", "Rajajinagar Children's Clinic (demo)", "private", ["newborn_care", "phototherapy"], 12.9910, 77.5520, "low", False),
    ("f_012", "Electronic City PHC (demo)", "government", ["postnatal_care"], 12.8452, 77.6602, "free", False),
    ("f_013", "Kalaburagi District Hospital (demo)", "government", _EMONC, 17.3297, 76.8343, "free", True),
    ("f_014", "Kalaburagi Taluk PHC (demo)", "government", ["postnatal_care", "labour_room"], 17.3500, 76.8200, "free", False),
    ("f_015", "Raichur District Hospital (demo)", "government", _EMONC, 16.2120, 77.3439, "free", True),
    ("f_016", "Raichur Women's Clinic (demo)", "private", ["postnatal_care", "phototherapy"], 16.2050, 77.3550, "medium", False),
    ("f_017", "Ballari District Hospital (demo)", "government", _EMONC, 15.1394, 76.9214, "free", True),
    ("f_018", "Hosapete CHC (demo)", "government", ["labour_room", "newborn_care", "postnatal_care"], 15.2689, 76.3909, "free", True),
    ("f_019", "Vijayapura District Hospital (demo)", "government", _EMONC, 16.8302, 75.7100, "free", True),
    ("f_020", "Vijayapura PHC (demo)", "government", ["postnatal_care"], 16.8400, 75.7300, "free", False),
    ("f_021", "Hubballi KIMS (demo)", "government", _EMONC, 15.3647, 75.1240, "free", True),
    ("f_022", "Dharwad District Hospital (demo)", "government", _EMONC, 15.4589, 75.0078, "free", True),
    ("f_023", "Hubballi Maternity Nursing Home (demo)", "private", ["labour_room", "c_section", "newborn_care"], 15.3500, 75.1400, "high", True),
    ("f_024", "Belagavi District Hospital (demo)", "government", _EMONC, 15.8497, 74.4977, "free", True),
    ("f_025", "Bidar District Hospital (demo)", "government", _EMONC, 17.9104, 77.5199, "free", True),
    ("f_026", "Koppal District Hospital (demo)", "government", _EMONC, 15.3500, 76.1550, "free", True),
    ("f_027", "Bagalkot District Hospital (demo)", "government", _EMONC, 16.1691, 75.6615, "free", True),
    ("f_028", "Yadgir District Hospital (demo)", "government", _EMONC, 16.7700, 77.1376, "free", True),
    ("f_029", "Gangavathi CHC (demo)", "government", ["labour_room", "newborn_care", "postnatal_care"], 15.4319, 76.5315, "free", True),
    ("f_030", "Sindhanur PHC (demo)", "government", ["postnatal_care"], 15.7700, 76.7560, "free", False),
]  # fmt: skip


def _add_mother(s: Session, m: Mother, baby: Baby, family: list[FamilyContact]) -> Mother:
    s.add(m)
    s.add(baby)
    for f in family:
        s.add(f)
    s.commit()
    return m


def seed(s: Session, now: datetime) -> None:
    today = ist_today(now)
    for aid, name, phone, village in ASHAS:
        s.add(Asha(id=aid, name=name, phone=phone, village=village))
    for fid, name, typ, services, lat, lng, cost, h24 in FACILITIES:
        s.add(Facility(id=fid, name=name, type=typ, services=services, lat=lat, lng=lng,
                       phone=f"+918000000{fid[-3:]}", cost_band=cost, open_24x7=h24))  # fmt: skip
    s.commit()

    # 1. Lakshmi — the demo mother. Registered by her ASHA (delivered yesterday); clinical
    #    details arrive through the onboarding demo (discharge slip + voice read-back).
    lakshmi = _add_mother(
        s,
        Mother(
            id="m_001",
            name="Lakshmi",
            phone="+919800000001",
            language="kn",
            delivery_date=today - timedelta(days=1),
            delivery_type="c_section",
            asha_id="a_001",
            lat=12.9600,
            lng=77.5800,
            created_at=now,
        ),  # fmt: skip
        Baby(id="b_001", mother_id="m_001"),
        [
            FamilyContact(
                mother_id="m_001", name="Ravi", relation="husband", phone="+919800000002", decision_maker=True
            ),
            FamilyContact(mother_id="m_001", name="Savitri", relation="mother_in_law", phone="+919800000006"),
        ],  # fmt: skip
    )
    record_service.append_entry(s, lakshmi, subject="mother", kind="note", source="system", now=now - timedelta(hours=20),
                                value="Registered by ASHA Sunita after delivery")  # fmt: skip

    # 2. Kavya — day 9, missed two scheduled calls → H-MISSED-01 amber + ASHA task.
    kavya = _add_mother(
        s,
        Mother(
            id="m_002",
            name="Kavya",
            phone="+919800000003",
            language="kn",
            delivery_date=today - timedelta(days=9),
            delivery_type="normal",
            asha_id="a_001",
            consent_at=now - timedelta(days=8),
            onboarded_at=now - timedelta(days=8),
            consecutive_missed=2,
            lat=12.9900,
            lng=77.6100,
            created_at=now - timedelta(days=8),
        ),  # fmt: skip
        Baby(id="b_002", mother_id="m_002", birth_weight_grams=2900, gestation_weeks=39),
        [
            FamilyContact(
                mother_id="m_002", name="Mahesh", relation="husband", phone="+919800000004", decision_maker=True
            )
        ],
    )
    _history(s, kavya, now, [
        (8, "mother", "fever", None, "no fever", "mother_reported"),
        (8, "baby", "weight_grams", 2900.0, "baby weight 2.9 kilograms", "asha_measured"),
        (5, "mother", "pads_soaked_count", 2.0, "2 pads soaked since morning", "mother_reported"),
    ])  # fmt: skip
    _missed_ticket(s, kavya, now)

    # 3. Priya — day 12, Hindi, all well.
    priya = _add_mother(
        s,
        Mother(
            id="m_003",
            name="Priya",
            phone="+919800000005",
            language="hi",
            delivery_date=today - timedelta(days=12),
            delivery_type="normal",
            asha_id="a_002",
            consent_at=now - timedelta(days=11),
            onboarded_at=now - timedelta(days=11),
            lat=12.9300,
            lng=77.6200,
            created_at=now - timedelta(days=11),
        ),  # fmt: skip
        Baby(id="b_003", mother_id="m_003", birth_weight_grams=3100, gestation_weeks=40),
        [
            FamilyContact(
                mother_id="m_003", name="Arjun", relation="husband", phone="+919800000007", decision_maker=True
            )
        ],
    )
    _history(s, priya, now, [
        (11, "mother", "fever", None, "no fever", "mother_reported"),
        (7, "mother", "bp_systolic", 118.0, "BP systolic 118", "asha_measured"),
        (7, "mother", "bp_diastolic", 76.0, "BP diastolic 76", "asha_measured"),
        (7, "baby", "weight_grams", 3250.0, "baby weight 3.25 kilograms", "asha_measured"),
    ])  # fmt: skip

    for m in (lakshmi, kavya, priya):
        baby = s.get(Baby, f"b_{m.id[2:]}")
        m.risk_profile = "high" if is_high_risk(m.delivery_type, m.complications,
                                                baby.birth_weight_grams if baby else None,
                                                baby.gestation_weeks if baby else None) else "standard"  # fmt: skip
        s.commit()
        call_service.plan_milestones(s, m, now)
        refresh_status(s, m)


def _history(s: Session, m: Mother, now: datetime,
             rows: list[tuple[int, str, str, float | None, str, str]]) -> None:  # fmt: skip
    phones = {"mother_reported": m.phone, "asha_measured": "+919800000009" if m.asha_id == "a_001" else "+919800000010"}
    for days_ago, subject, code, num, value, source in rows:
        at = now - timedelta(days=days_ago)
        unit = {"weight_grams": "g", "bp_systolic": "mmHg", "bp_diastolic": "mmHg", "pads_soaked_count": "pads"}.get(
            code
        )
        kind = "vital" if code in ("weight_grams", "bp_systolic", "bp_diastolic") else "symptom"
        record_service.append_entry(s, m, subject=subject, kind=kind, source=source, now=at, code=code, value=value,
                                    numeric_value=num, unit=unit, source_phone=phones.get(source),
                                    interaction_id=f"seed_{m.id}_{days_ago}")  # fmt: skip
        if source == "mother_reported":
            s.add(
                Assessment(
                    mother_id=m.id,
                    interaction_id=f"seed_{m.id}_{days_ago}",
                    mother_level="green",
                    baby_level="green",
                    overall_level="green",
                    rules_version=RULES_VERSION,
                    created_at=at,
                )
            )
    s.commit()


def _missed_ticket(s: Session, m: Mother, now: datetime) -> None:
    opened = now - timedelta(minutes=25)
    reason = "2 scheduled calls unanswered (ASHA visit needed)"
    t = Ticket(id="t_001", mother_id=m.id, subjects=["mother"], level="amber", rule_ids=["H-MISSED-01"],
               state="notified", reason_text=reason, created_at=opened,
               next_escalation_at=opened + timedelta(minutes=60),
               assigned_to=["+919800000004", "asha:a_001"])  # fmt: skip
    s.add(t)
    for state, note in (("open", reason), ("notified", "family alert call placed; ASHA alerted (visit task)")):
        s.add(TicketEvent(ticket_id=t.id, at=opened, state=state, note=note))
    s.add(AshaTask(id="task_001", asha_id="a_001", mother_id=m.id, reason="2 calls unanswered: please visit",
                   ticket_id=t.id, created_at=opened))  # fmt: skip
    s.add(Assessment(mother_id=m.id, interaction_id=f"missed_{m.id}_seed", mother_level="amber",
                     baby_level="green", overall_level="amber", rule_ids=["H-MISSED-01"], reason_text=reason,
                     rules_version=RULES_VERSION, created_at=opened))  # fmt: skip
    s.commit()
