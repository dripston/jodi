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
        text, lang = book.get(sid, "kn")
        assert text and lang == "en"  # no kn translation yet → English master
    assert "…" not in book.get("RED-FITS-BABY", "en")[0]


def test_script_render_placeholders():
    book = ScriptBook(parse_scripts('## RED-MOTHER\n\n> "{name}, go to {facility}."\n'))
    assert book.render("RED-MOTHER", "en", "Lakshmi", "District Hospital")[0] == "Lakshmi, go to District Hospital."
    assert book.render("RED-MOTHER", "en", None, None)[0] == "Go to the nearest government hospital."


def test_script_language_variant():
    book = ScriptBook(parse_scripts('## AMBER-BABY\n\n> "English."\n> **kn:** "ಕನ್ನಡ."\n'))
    assert book.get("AMBER-BABY", "kn") == ("ಕನ್ನಡ.", "kn")
    assert book.get("AMBER-BABY", "hi") == ("English.", "en")
