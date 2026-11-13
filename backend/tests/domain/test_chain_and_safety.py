from __future__ import annotations

from pathlib import Path

from app.domain.chain import GENESIS, canonical_json, compute_hash, verify_chain
from app.domain.safety_net import check
from app.domain.scripts import ScriptBook, parse_scripts
from app.domain.transcript import caller_text

DOCS = Path(__file__).resolve().parents[3] / "docs"


def _chain(n: int) -> list[dict]:
    prev, out = GENESIS, []
    for i in range(n):
        e = {"id": f"e_{i}", "value": f"v{i}", "numeric_value": float(i)}
        h = compute_hash(prev, e)
        out.append({**e, "prev_hash": prev, "hash": h})
        prev = h
    return out


def test_canonical_json_sorted_compact():
    assert canonical_json({"b": 1, "a": "ಕ"}) == '{"a":"ಕ","b":1}'


def test_chain_valid():
    v = verify_chain(_chain(5))
    assert v.valid and v.entries == 5 and v.broken_at is None


def test_chain_detects_tamper():
    entries = _chain(5)
    entries[2]["value"] = "tampered"
    v = verify_chain(entries)
    assert not v.valid and v.broken_at == 3 and v.broken_entry_id == "e_2" and v.entries == 5


def test_empty_chain_valid():
    assert verify_chain([]).valid


# ----------------------------------------------------------------- safety net
def test_safety_net_hits_keyword_any_language():
    r = check("user: avalige jhatke bantu")
    assert r.fired and r.keywords == ("jhatke",) and r.subject == "mother"


def test_safety_net_baby_subject():
    assert check("User: magu usiru illa").subject == "baby"


def test_safety_net_ignores_agent_turns():
    assert not check("Agent: Did she have any fits or was she unconscious?\nUser: illa, chennagide").fired


def test_safety_net_word_boundaries():
    assert not check("user: the benefits of rest").fired
    assert not check("user: dauran khana khaya").fired


def test_safety_net_json_transcript():
    t = '[{"role":"assistant","content":"any fits?"},{"role":"user","content":"behosh ho gayi"}]'
    assert check(t).fired


def test_caller_text_plain_passthrough():
    assert caller_text("naalku batte") == "naalku batte"


# -------------------------------------------------------------------- scripts
def test_scripts_parsed_from_docs():
    book = ScriptBook.load(DOCS / "red-scripts.md")
    for sid in ("RED-MOTHER", "RED-BABY", "RED-FITS", "RED-FITS-BABY", "RED-BLEED",
                "AMBER-MOTHER", "AMBER-BABY", "DISMISSAL-RESPONSE", "FAMILY-ALERT", "NOT-ALLOWED"):  # fmt: skip
        text, lang = book.get(sid, "en")
        assert text and lang == "en"
        if sid != "RED-FITS-BABY":  # the baby fits variant has no kn/hi lines yet → English master
            for want in ("kn", "hi"):
                text, lang = book.get(sid, want)
                assert lang == want and text != book.get(sid, "en")[0], (sid, want)
    assert book.get("RED-FITS-BABY", "kn")[1] == "en"
    assert "…" not in book.get("RED-FITS-BABY", "en")[0]
    assert book.get("RED-BLEED", "hi")[0].endswith("।")  # Hindi danda kept, no extra "."
    kn, _ = book.render("RED-BLEED", "kn", None, None)
    assert "{" not in kn and "ಸರ್ಕಾರಿ ಆಸ್ಪತ್ರೆ" in kn  # localized default facility
    assert "{" not in book.render("FAMILY-ALERT", "hi", None, "X")[0]


def test_script_render_placeholders():
    book = ScriptBook(parse_scripts('## RED-MOTHER\n\n> "{name}, go to {facility}."\n'))
    assert book.render("RED-MOTHER", "en", "Lakshmi", "District Hospital")[0] == "Lakshmi, go to District Hospital."
    assert book.render("RED-MOTHER", "en", None, None)[0] == "Go to the nearest government hospital."


def test_script_language_variant():
    book = ScriptBook(parse_scripts('## AMBER-BABY\n\n> "English."\n> **kn:** "ಕನ್ನಡ."\n'))
    assert book.get("AMBER-BABY", "kn") == ("ಕನ್ನಡ.", "kn")
    assert book.get("AMBER-BABY", "hi") == ("English.", "en")


# ------------------------------------------------------------ rule ↔ fact map
def test_every_fact_rule_lists_valid_fact_codes():
    from app.domain.facts import BABY_CODES, MOTHER_CODES, NUMERIC_CODES
    from app.domain.rules import BABY_RULES, MOTHER_RULES, RULE_FACT_CODES

    for rule_id, *_ in MOTHER_RULES + BABY_RULES:
        assert rule_id in RULE_FACT_CODES, rule_id
    for rule_id, by_subject in RULE_FACT_CODES.items():
        for subject, codes in by_subject.items():
            valid = (MOTHER_CODES if subject == "mother" else BABY_CODES) | NUMERIC_CODES
            assert codes and codes <= valid, (rule_id, codes - valid)


def test_rules_for_fact():
    from app.domain.rules import rules_for_fact

    fired = ["M-BLEED-01", "B-FEED-02", "D-INF-01"]
    assert rules_for_fact("mother", "clots_large", fired) == ["M-BLEED-01"]
    assert rules_for_fact("baby", "feeding_poor", fired) == ["B-FEED-02", "D-INF-01"]
    assert rules_for_fact("baby", "fits", fired) == [] and rules_for_fact("mother", None, fired) == []
