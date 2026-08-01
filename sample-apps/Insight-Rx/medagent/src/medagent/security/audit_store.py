"""
Storage abstraction for the audit trail -- Phase 2, item 3
(Strategic_Startup_Roadmap.pdf: "abstract storage interface to prepare
for Phase 3's Postgres migration").

audit_logger.py owns the hash chain and the event semantics; this module
owns only "where do the bytes go". Keeping those separate is the whole
point: Phase 3 swaps JSONLAuditStore for a PostgresAuditStore without
audit_logger.py changing at all, because the logger only ever talks to
the AuditStore protocol below.

Deliberately minimal -- two methods, append and read-all. A richer
interface (query by case, paginate, read just the tail) would be more
efficient, but every method added here is a method the Postgres
implementation must also honor, and this is a local-first system whose
audit volume is bounded by "cases a radiology department reviews by
hand". See AuditLogger.append_event()'s note on the read-all-to-append
cost this implies.
"""
from __future__ import annotations

import json
import logging
import threading
from pathlib import Path
from typing import Protocol, runtime_checkable

logger = logging.getLogger("medagent.security.audit_store")


class AuditStoreError(Exception):
    """Raised when the audit trail cannot be read or written.

    Unlike most I/O failures in this codebase, this is NOT swallowed by
    its callers: an audit record that silently fails to persist is
    indistinguishable, after the fact, from an event that never
    happened -- which is exactly the property an audit log exists to
    rule out. See audit_logger.py."""


@runtime_checkable
class AuditStore(Protocol):
    """The storage contract audit_logger.AuditLogger is written
    against. Implemented by JSONLAuditStore below today, and by a
    Postgres-backed store in Phase 3."""

    def append_record(self, record: dict) -> None:
        """Durably appends one audit record. Must preserve insertion
        order -- the hash chain is only verifiable in the order it was
        written."""
        ...

    def read_all_records(self) -> list[dict]:
        """Returns every record ever appended, in insertion order.
        Returns an empty list (never raises) for a store that has not
        been written to yet -- an empty audit trail is the legitimate
        starting state of every fresh deployment, not an error."""
        ...


class JSONLAuditStore:
    """
    Append-only JSON Lines audit store: one JSON object per line, in
    write order. Chosen over a single JSON array because appending to an
    array requires rewriting the whole file -- which would mean a crash
    mid-write could corrupt or truncate records that were already
    safely committed.

    Thread-safe within one process via a lock around each append. It is
    NOT safe across processes: two OS processes appending concurrently
    can interleave writes and fork the hash chain. That is an accepted
    limitation of the local-file store, not of the design -- the Phase 3
    Postgres store resolves it with a transaction, and until then this
    system runs as a single writer process.
    """

    def __init__(self, path: str | Path):
        self.path = Path(path)
        self._lock = threading.Lock()

    def append_record(self, record: dict) -> None:
        try:
            with self._lock:
                self.path.parent.mkdir(parents=True, exist_ok=True)
                with self.path.open("a", encoding="utf-8") as f:
                    f.write(json.dumps(record, sort_keys=True) + "\n")
                    # The hash chain's integrity guarantee is only as good as
                    # the record actually reaching disk -- without this, a
                    # crash could lose a buffered record that the in-memory
                    # chain has already built on top of.
                    f.flush()
        except OSError as exc:
            raise AuditStoreError(f"Failed to append audit record to {self.path}: {exc}") from exc

    def read_all_records(self) -> list[dict]:
        if not self.path.exists():
            return []

        try:
            lines = self.path.read_text(encoding="utf-8").splitlines()
        except OSError as exc:
            raise AuditStoreError(f"Failed to read audit log at {self.path}: {exc}") from exc

        records = []
        for line_number, line in enumerate(lines, start=1):
            if not line.strip():
                continue
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError as exc:
                # Surfaced rather than skipped: an unparseable line in an
                # append-only log means the file was edited or truncated
                # out-of-band, which is itself the tampering signal this
                # whole subsystem exists to detect. Silently skipping it
                # would let a tamperer delete a record by corrupting it.
                raise AuditStoreError(
                    f"Audit log {self.path} line {line_number} is not valid JSON -- the log has "
                    f"been modified out-of-band or truncated mid-write: {exc}"
                ) from exc
        return records
