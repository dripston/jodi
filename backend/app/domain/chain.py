"""Tamper-evident hash chain (docs/contracts.md §2). Pure.

hash = sha256(prev_hash + canonical_json(entry_without_hash_fields)); first prev_hash = "GENESIS".
"""

from __future__ import annotations

import hashlib
import json
from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from typing import Any

GENESIS = "GENESIS"
HASH_FIELDS = frozenset({"prev_hash", "hash"})


def canonical_json(data: Mapping[str, Any]) -> str:
    return json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def compute_hash(prev_hash: str, entry: Mapping[str, Any]) -> str:
    body = {k: v for k, v in entry.items() if k not in HASH_FIELDS}
    return hashlib.sha256((prev_hash + canonical_json(body)).encode("utf-8")).hexdigest()


@dataclass(frozen=True)
class ChainVerdict:
    valid: bool
    entries: int
    broken_at: int | None  # 1-based position in chain order (oldest = 1)
    broken_entry_id: str | None = None


def verify_chain(entries: Iterable[Mapping[str, Any]]) -> ChainVerdict:
    """`entries` in insertion order; each must carry prev_hash and hash."""
    items = list(entries)
    prev = GENESIS
    for pos, e in enumerate(items, start=1):
        if e.get("prev_hash") != prev or compute_hash(prev, e) != e.get("hash"):
            return ChainVerdict(valid=False, entries=len(items), broken_at=pos, broken_entry_id=str(e.get("id")))
        prev = str(e["hash"])
    return ChainVerdict(valid=True, entries=len(items), broken_at=None)
