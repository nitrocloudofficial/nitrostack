"""
Hash-chained, append-only audit trail -- Phase 2, item 3
(Strategic_Startup_Roadmap.pdf: "Role-Based Authentication & Audit
Logging").

Every record carries the SHA-256 hash of the record before it, so the
log is only internally consistent as a whole sequence. Editing any past
record changes that record's own hash, which breaks the `previous_hash`
link every later record asserts -- so a tamperer cannot quietly rewrite
history without rewriting the entire remainder of the log. verify_chain()
below detects exactly that, and reports where the chain first breaks.

What this does and does not prove: the chain makes tampering *detectable*
after the fact by anyone holding the log. It does not make the log
*unforgeable* by someone who can rewrite the whole file offline -- with
no external anchor (a signature over the head hash, a witness, an
append-only WORM store), an attacker with write access can recompute a
fully self-consistent chain from scratch. That is the standard limit of
an unanchored hash chain; closing it is a Phase 3 concern, alongside the
Postgres store this module's AuditStore abstraction already prepares for
(see audit_store.py).

PHI policy: records carry only structural facts -- when, which case,
what happened, who did it. No patient metadata, no report text, no image
paths. The one free-text field (`notes`) exists because an auditor
genuinely needs to know *why* a case was rejected, and it is forced
through the Presidio de-identifier (privacy/phi_redaction.py) before it
is ever written. Structured fields are PHI-free by construction; the
free-text field is PHI-free by redaction.

Verify a live audit log from the command line:
    python3 -m medagent.security.audit_logger [path/to/audit_log.jsonl]
"""
from __future__ import annotations

import hashlib
import json
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from functools import lru_cache
from typing import Literal

from medagent.security.audit_store import AuditStore, AuditStoreError, JSONLAuditStore

logger = logging.getLogger("medagent.security.audit_logger")

# The `previous_hash` of the very first record. A fixed, all-zero
# sentinel rather than null/absent so that every record in the log has
# structurally identical fields, and so the genesis record's own hash
# still commits to the fact that it IS the genesis record.
GENESIS_HASH = "0" * 64

AuditEvent = Literal[
    "case_started",
    "deidentification_completed",
    "deidentification_failed",
    "ai_report_drafted",
    "human_review_resumed",
    "review_access_denied",
    "case_finalized",
    "case_archived",
]


@dataclass(frozen=True)
class ChainVerification:
    """Result of verify_chain(). `broken_at_index` is the 0-based index
    of the first record that failed, or None when the chain is intact."""

    is_valid: bool
    records_checked: int
    broken_at_index: int | None = None
    reason: str | None = None


def _compute_entry_hash(record: dict) -> str:
    """
    SHA-256 over every field of `record` EXCEPT `entry_hash` itself,
    serialized canonically (sorted keys, no incidental whitespace) so
    the same logical record always hashes identically regardless of dict
    ordering or how it round-tripped through JSON.

    Because `previous_hash` is one of the hashed fields, each hash
    commits to the entire history behind it -- that is what makes this a
    chain rather than a list of independent checksums.
    """
    payload = {key: value for key, value in record.items() if key != "entry_hash"}
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def verify_chain(records: list[dict]) -> ChainVerification:
    """
    Walks the audit trail front to back and confirms every record still
    hashes to what it claims and still points at its true predecessor.

    Detects, and distinguishes between:
      - a modified record (its content no longer hashes to its stored
        `entry_hash`),
      - a deleted or reordered record (a later record's `previous_hash`
        no longer matches the record actually preceding it),
      - a record with fields missing entirely.

    An empty log is valid -- a fresh deployment that has recorded
    nothing yet has not been tampered with.
    """
    for index, record in enumerate(records):
        if "entry_hash" not in record or "previous_hash" not in record:
            return ChainVerification(
                is_valid=False, records_checked=index, broken_at_index=index,
                reason=f"Record {index} is missing its hash fields entirely -- not a chained audit record.",
            )

        recomputed = _compute_entry_hash(record)
        if recomputed != record["entry_hash"]:
            return ChainVerification(
                is_valid=False, records_checked=index, broken_at_index=index,
                reason=(
                    f"Record {index} has been MODIFIED: its contents hash to {recomputed[:16]}... "
                    f"but it claims {record['entry_hash'][:16]}..."
                ),
            )

        expected_previous = GENESIS_HASH if index == 0 else records[index - 1]["entry_hash"]
        if record["previous_hash"] != expected_previous:
            return ChainVerification(
                is_valid=False, records_checked=index, broken_at_index=index,
                reason=(
                    f"Record {index} breaks the chain: it points back to "
                    f"{record['previous_hash'][:16]}... but the record actually preceding it hashes "
                    f"to {expected_previous[:16]}... -- a record was deleted, reordered, or inserted."
                ),
            )

    return ChainVerification(is_valid=True, records_checked=len(records))


class AuditLogger:
    """
    Writes hash-chained audit records through an injected AuditStore.

    The store is a constructor argument rather than a module-level
    default so the Phase 3 Postgres migration is a wiring change, not a
    rewrite -- and so tests can point a logger at a throwaway file
    without monkeypatching module globals.
    """

    def __init__(self, store: AuditStore):
        self.store = store

    def append_event(
        self,
        case_id: str,
        event_type: AuditEvent,
        user_id: str | None = None,
        notes: str | None = None,
    ) -> dict:
        """
        Appends one event to the audit trail and returns the record as
        written (including its computed hashes).

        `notes` is the only free-text field and is passed through
        redact_phi() before being written -- see this module's docstring
        on the PHI policy. If redaction itself fails, the note is
        withheld entirely rather than written unredacted: a redaction
        outage must never become a PHI leak.

        Reads the existing log to find the previous hash on every
        append. That is O(n) per write against the JSONL store, which is
        acceptable at this system's audit volume (bounded by cases a
        department reviews by hand) and keeps AuditStore's contract to
        the two methods Phase 3's Postgres implementation must honor --
        where the same lookup becomes a single indexed query. If the
        trail ever outgrows that, the fix is a tail-read method on
        AuditStore, not caching the head hash in memory here: a cached
        head silently forks the chain the moment anything else appends.
        """
        if notes:
            try:
                from medagent.privacy.phi_redaction import redact_phi

                notes = redact_phi(notes)
            except Exception:
                logger.exception(
                    "redact_phi() failed while writing audit event=%s for case=%s -- withholding "
                    "the note entirely rather than risk writing unredacted text.",
                    event_type, case_id,
                )
                notes = "[REDACTION FAILED -- note withheld]"

        existing = self.store.read_all_records()
        if existing and "entry_hash" not in existing[-1]:
            # An audit trail whose tail predates hash chaining (or was
            # hand-edited into that shape). Chaining a new record onto it
            # would produce a log that VERIFIES as intact while its
            # earlier portion is entirely unverified -- a false assurance
            # worse than no chain at all. Refuse instead, and say what to
            # do about it.
            raise AuditStoreError(
                "The existing audit trail's most recent record has no 'entry_hash' -- it predates "
                "hash chaining (or has been modified out-of-band). Refusing to append, because "
                "chaining onto it would make the whole log verify as intact while its earlier "
                "records are unverifiable. Archive the existing log to a dated filename and let a "
                "fresh chain start, or migrate the old records deliberately."
            )
        previous_hash = existing[-1]["entry_hash"] if existing else GENESIS_HASH

        record = {
            "sequence": len(existing),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "case_id": case_id,
            "event_type": event_type,
            "user_id": user_id,
            "notes": notes,
            "previous_hash": previous_hash,
        }
        record["entry_hash"] = _compute_entry_hash(record)

        self.store.append_record(record)
        logger.info(
            "Audit: case=%s event=%s user=%s seq=%d", case_id, event_type, user_id, record["sequence"]
        )
        return record

    def verify(self) -> ChainVerification:
        """Verifies the whole trail currently in the injected store."""
        return verify_chain(self.store.read_all_records())


@lru_cache(maxsize=1)
def get_audit_logger() -> AuditLogger:
    """
    The process-wide AuditLogger the graph's nodes use, backed by the
    JSONL store at settings.audit_log_path. Cached so every node in a
    run shares one store instance (and therefore one append lock).

    Tests and the Phase 3 Postgres wiring construct AuditLogger(store)
    directly instead of going through this.
    """
    from medagent.utils.settings import get_settings

    return AuditLogger(JSONLAuditStore(get_settings().audit_log_path))


if __name__ == "__main__":
    import sys

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

    if len(sys.argv) > 1:
        store: AuditStore = JSONLAuditStore(sys.argv[1])
        target = sys.argv[1]
    else:
        from medagent.utils.settings import get_settings

        target = get_settings().audit_log_path
        store = JSONLAuditStore(target)

    result = verify_chain(store.read_all_records())
    if result.is_valid:
        print(f"OK: audit chain intact across {result.records_checked} record(s) in {target}")
    else:
        print(f"TAMPERING DETECTED in {target}")
        print(f"  first break at record index {result.broken_at_index}")
        print(f"  {result.reason}")
        raise SystemExit(1)
