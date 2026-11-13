"""Choose which fixed script(s) an assessment maps to. Pure.

Precedence for red: RED-FITS (fits rules / safety net) > RED-BLEED (M-BLEED-01) >
RED-MOTHER > RED-BABY. Amber: AMBER-MOTHER and/or AMBER-BABY (both read when both amber).
A newly detected dismissal while a flag is active returns DISMISSAL-RESPONSE.
"""

from __future__ import annotations

from app.domain.rules import FITS_RULES, Assessment


def red_script_ids(a: Assessment) -> list[str]:
    fits = [r for r in a.fired if r.rule_id in FITS_RULES]
    if fits:
        mother_fits = any(r.subject == "mother" for r in fits)
        return ["RED-FITS" if mother_fits else "RED-FITS-BABY"]
    if "M-BLEED-01" in a.rule_ids:
        return ["RED-BLEED"]
    if a.mother_level == "red":
        return ["RED-MOTHER"]
    return ["RED-BABY"]


def choose_scripts(a: Assessment, dismissal_is_new: bool, flag_active_before: bool) -> list[str]:
    """Script IDs to read verbatim, in order. Empty list for green."""
    if dismissal_is_new and flag_active_before and a.overall_level != "green":
        return ["DISMISSAL-RESPONSE"]
    if a.overall_level == "red":
        return red_script_ids(a)
    if a.overall_level == "amber":
        ids = []
        if a.mother_level == "amber":
            ids.append("AMBER-MOTHER")
        if a.baby_level == "amber":
            ids.append("AMBER-BABY")
        return ids
    return []
