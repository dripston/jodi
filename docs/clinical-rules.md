# Clinical rules (DRAFT)

> ⚠️ **DRAFT for hackathon demonstration only.** These rules are adapted from WHO/UNICEF newborn home-visit danger signs and standard postpartum warning signs. **They must be reviewed and approved by a qualified clinician before any real-world use.** Agents implement these rules exactly; agents never invent, remove or soften rules. Only the human content owner edits this file.

Sources to cite: WHO/UNICEF *Home visits for the newborn child* (2009) danger signs; WHO newborn mortality fact sheet; standard postpartum danger-sign counselling (heavy bleeding, severe headache/vision changes, fever, fits, breathing difficulty, calf pain, wound/breast infection).

---

## How the engine works

- Input: facts for the current call **plus** facts from previous calls (history), the mother's and baby's profile, and the day since delivery.
- Each rule has an **ID**, a **level** (`red` / `amber`) and a **condition**. Output for each subject is the **highest** level fired. If none fire, the subject is `green`.
- Every fired rule is returned as `rule_ids` with a human-readable `reason_text`.
- Rules are pure functions in code, with **one unit test per rule** (fires on the positive case and does not fire on the near-miss case).
- `RULES_VERSION` is stored with every assessment.

---

## Mother rules

| ID | Level | Condition (facts with `present = true`) |
|---|---|---|
| M-BLEED-01 | red | `pad_soaked_within_hour` OR `clots_large` OR (`bleeding_heavy` AND `dizziness_fainting`) |
| M-BLEED-02 | amber | `bleeding_heavy` alone, OR `pads_soaked_count` ≥ 4 since morning |
| M-HTN-01 | red | `headache_severe` AND (`vision_blurred` OR `swelling_face_hands`) |
| M-HTN-02 | red | `bp_systolic` ≥ 160 OR `bp_diastolic` ≥ 110 |
| M-HTN-03 | red | (`bp_systolic` ≥ 140 OR `bp_diastolic` ≥ 90) AND (`headache_severe` OR `vision_blurred`) |
| M-HTN-04 | amber | `bp_systolic` ≥ 140 OR `bp_diastolic` ≥ 90 (no symptoms) |
| M-HTN-05 | amber | `headache_severe` alone, or `vision_blurred` alone |
| M-FITS-01 | red | `fits` OR `unconscious` |
| M-SEPSIS-01 | red | `fever` AND (`discharge_foul` OR `abdominal_pain_severe`) |
| M-FEVER-01 | amber | `fever` alone |
| M-WOUND-01 | amber | `wound_red_or_oozing` (red if `fever` also present → M-WOUND-02) |
| M-WOUND-02 | red | `wound_red_or_oozing` AND `fever` |
| M-BREAST-01 | amber | `breast_red_painful` |
| M-CLOT-01 | red | `breathless` OR `chest_pain` |
| M-CLOT-02 | amber | `calf_pain_swelling` |
| M-MED-01 | amber | `stopped_bp_medicine` (only if profile has high BP) |
| M-MED-02 | green+note | `stopped_iron` → no alert, add reminder |

## Baby rules (WHO young-infant danger signs + jaundice + cord)

| ID | Level | Condition |
|---|---|---|
| B-FEED-01 | red | `not_feeding` (stopped feeding / unable to feed) |
| B-FITS-01 | red | `fits` |
| B-BREATH-01 | red | `breathing_fast` OR `breaths_per_minute` ≥ 60 |
| B-BREATH-02 | red | `chest_indrawing` |
| B-TEMP-01 | red | `feels_hot` OR `feels_cold` |
| B-ACT-01 | red | `lethargic` (moves only when touched, or not at all) |
| B-JAUN-01 | red | `jaundice_palms_soles` |
| B-JAUN-02 | red | `jaundice_face_body` AND baby age < 24 hours |
| B-JAUN-03 | amber | `jaundice_face_body` (age ≥ 24 h) |
| B-CORD-01 | amber | `cord_red_or_pus` |
| B-VOMIT-01 | red | `vomiting_everything` |
| B-FEED-02 | amber | `feeding_poor` |
| B-WET-01 | amber | `wet_nappies_count` < 6 in 24 h after day 5 |

## Dyad rules (mother + baby as one pair; Jodi's core idea)

| ID | Effect | Condition |
|---|---|---|
| D-INF-01 | raise **both** subjects one level (green→amber, amber→red) | mother `fever` AND baby (`feeding_poor` OR `feels_hot` OR `lethargic`) |
| D-FEED-01 | baby amber + schedule recheck in 6 h | mother `breast_red_painful` AND baby `feeding_poor` |
| D-JAUN-01 | baby red | baby `feeding_poor` AND (`jaundice_face_body` OR `jaundice_palms_soles`) |

## History rules

| ID | Effect | Condition |
|---|---|---|
| H-REPEAT-01 | raise one level | the same amber rule fired on the previous assessment as well |
| H-MISSED-01 | amber + ASHA visit task | 2 consecutive scheduled calls unanswered (after retries and family contact) |

## Dismissal rule

| ID | Effect | Condition |
|---|---|---|
| X-DISMISS-01 | **never lowers a level**; sets `dismissed_by_family = true` on the ticket and keeps escalation running | `dismissal_detected = true` while any amber/red rule fired |

## Keyword safety net (runs on raw transcript, independent of the LLM)

If the transcript contains any of these (any language, case-insensitive), force at least `red` and call `assess-risk` logic with rule `K-SAFETY-01`:
`fits`, `jhatke`, `daura`, `unconscious`, `behosh`, `not breathing`, `saans nahi`, `usiru illa`, `blue lips`, `neela`.

## Schedule (used by scheduler)

- **Milestone calls:** day 1, 3, 4, 5 (jaundice window), 7, 14, 21, 28, 42 (day 42 = single trip for mother's postnatal check + baby's 6-week vaccines).
- **High-risk profile** (C-section, high BP in pregnancy, birth weight < 2500 g, gestation < 37 weeks): daily calls days 1–10.
- **Amber:** recheck call in 6 h.
- **Red:** ticket escalation (see contracts); recheck call 2 h after `reached`.
- **Missed call:** retry after 30 min → call family decision-maker → ASHA task (H-MISSED-01).
- **Quiet hours:** no routine calls 21:00–07:00; red/amber rechecks and inbound are always allowed.

## Escalation timing (ticket)

- `open` → immediately `notified`: call family decision-maker (transfer during call if live) + ASHA alert.
- No `ack` within **10 min (red)** / **60 min (amber)** → notify next contact (next family phone → ASHA → ANM).
- Ticket closes only on `reached` (ASHA/doctor/family confirms the mother or baby was seen by a health worker or reached a facility) **and** a follow-up assessment that is not red.
