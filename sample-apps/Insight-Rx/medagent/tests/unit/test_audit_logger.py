"""
Unit tests for security/audit_store.py and security/audit_logger.py
(Phase 2, item 3: abstract audit storage + hash-chained audit trail).

The tamper-detection tests here are the formal version of item 3's
requirement 5: edit a middle line of a generated .jsonl audit log and
confirm the validation function reports a broken chain.
"""
from __future__ import annotations

import json

import pytest

from medagent.security.audit_logger import (
    GENESIS_HASH,
    AuditLogger,
    verify_chain,
)
from medagent.security.audit_store import AuditStore, AuditStoreError, JSONLAuditStore

LIFECYCLE = [
    ("case_started", "tech.a"),
    ("deidentification_completed", None),
    ("ai_report_drafted", None),
    ("human_review_resumed", "r.chen"),
    ("case_finalized", "r.chen"),
]


@pytest.fixture
def log_path(tmp_path):
    return tmp_path / "audit_log.jsonl"


@pytest.fixture
def logger(log_path):
    return AuditLogger(JSONLAuditStore(log_path))


@pytest.fixture
def populated_logger(logger):
    for event_type, user_id in LIFECYCLE:
        logger.append_event(case_id="case-001", event_type=event_type, user_id=user_id)
    return logger


def _rewrite(path, index, mutate):
    """Applies `mutate` to the record on line `index` and writes the log
    back -- i.e. tampers with the file exactly the way an attacker with
    filesystem access would."""
    lines = path.read_text(encoding="utf-8").splitlines()
    record = json.loads(lines[index])
    mutate(record)
    lines[index] = json.dumps(record, sort_keys=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


# ── JSONLAuditStore ─────────────────────────────────────────────────

def test_jsonl_store_satisfies_the_auditstore_protocol():
    assert isinstance(JSONLAuditStore("unused.jsonl"), AuditStore)


def test_read_all_records_on_a_nonexistent_log_is_empty_not_an_error(tmp_path):
    """An empty audit trail is the legitimate starting state of a fresh
    deployment, not a failure."""
    assert JSONLAuditStore(tmp_path / "never_written.jsonl").read_all_records() == []


def test_store_preserves_insertion_order(log_path):
    store = JSONLAuditStore(log_path)
    for i in range(5):
        store.append_record({"sequence": i})
    assert [r["sequence"] for r in store.read_all_records()] == [0, 1, 2, 3, 4]


def test_store_creates_parent_directories(tmp_path):
    store = JSONLAuditStore(tmp_path / "nested" / "deeper" / "audit.jsonl")
    store.append_record({"event_type": "case_started"})
    assert len(store.read_all_records()) == 1


def test_store_raises_on_a_corrupt_line_rather_than_skipping_it(log_path):
    """Silently skipping an unparseable line would let a tamperer delete
    a record simply by corrupting it."""
    log_path.write_text('{"sequence": 0}\nnot json at all\n', encoding="utf-8")
    with pytest.raises(AuditStoreError, match="not valid JSON"):
        JSONLAuditStore(log_path).read_all_records()


# ── Chain construction ──────────────────────────────────────────────

def test_first_record_links_to_the_genesis_hash(logger, log_path):
    logger.append_event(case_id="case-001", event_type="case_started")
    record = JSONLAuditStore(log_path).read_all_records()[0]
    assert record["previous_hash"] == GENESIS_HASH
    assert record["sequence"] == 0


def test_each_record_links_to_its_predecessor(populated_logger, log_path):
    records = JSONLAuditStore(log_path).read_all_records()
    assert len(records) == len(LIFECYCLE)
    for earlier, later in zip(records, records[1:]):
        assert later["previous_hash"] == earlier["entry_hash"]


def test_records_capture_the_required_fields(populated_logger, log_path):
    record = JSONLAuditStore(log_path).read_all_records()[3]
    assert record["timestamp"]
    assert record["case_id"] == "case-001"
    assert record["event_type"] == "human_review_resumed"
    assert record["user_id"] == "r.chen"


def test_an_intact_chain_verifies(populated_logger):
    result = populated_logger.verify()
    assert result.is_valid
    assert result.records_checked == len(LIFECYCLE)
    assert result.broken_at_index is None


def test_an_empty_chain_is_valid():
    """Nothing recorded yet is not the same as something removed."""
    assert verify_chain([]).is_valid


def test_append_refuses_to_chain_onto_an_unchained_legacy_log(log_path):
    """Appending onto pre-hash-chain records would make the whole log
    verify as intact while its earlier portion is unverifiable -- a
    false assurance worse than no chain at all."""
    log_path.write_text(json.dumps({"case_id": "old", "event": "legacy"}) + "\n", encoding="utf-8")
    with pytest.raises(AuditStoreError, match="predates hash chaining"):
        AuditLogger(JSONLAuditStore(log_path)).append_event(case_id="c", event_type="case_started")


# ── Tamper detection (item 3, requirement 5) ────────────────────────

def test_detects_a_tampered_middle_record(populated_logger, log_path):
    """The headline requirement: edit a middle line of the .jsonl and
    the validator must report a broken chain at that exact record."""
    _rewrite(log_path, 2, lambda r: r.update(user_id="attacker"))

    result = verify_chain(JSONLAuditStore(log_path).read_all_records())
    assert not result.is_valid
    assert result.broken_at_index == 2
    assert "MODIFIED" in result.reason


def test_detects_a_tampered_first_record(populated_logger, log_path):
    _rewrite(log_path, 0, lambda r: r.update(case_id="a-different-case"))
    result = verify_chain(JSONLAuditStore(log_path).read_all_records())
    assert not result.is_valid
    assert result.broken_at_index == 0


def test_detects_a_tampered_last_record(populated_logger, log_path):
    last = len(LIFECYCLE) - 1
    _rewrite(log_path, last, lambda r: r.update(event_type="case_archived"))
    result = verify_chain(JSONLAuditStore(log_path).read_all_records())
    assert not result.is_valid
    assert result.broken_at_index == last


def test_detects_a_deleted_middle_record(populated_logger, log_path):
    """Deletion leaves no modified record to catch -- it is caught by the
    successor's previous_hash no longer matching what precedes it."""
    lines = log_path.read_text(encoding="utf-8").splitlines()
    del lines[2]
    log_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    result = verify_chain(JSONLAuditStore(log_path).read_all_records())
    assert not result.is_valid
    assert result.broken_at_index == 2
    assert "deleted, reordered, or inserted" in result.reason


def test_detects_reordered_records(populated_logger, log_path):
    lines = log_path.read_text(encoding="utf-8").splitlines()
    lines[1], lines[2] = lines[2], lines[1]
    log_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    assert not verify_chain(JSONLAuditStore(log_path).read_all_records()).is_valid


def test_detects_a_tamperer_who_recomputes_the_edited_records_own_hash(populated_logger, log_path):
    """A naive edit breaks that record's own hash. A smarter tamperer
    recomputes it -- and is still caught, because the NEXT record's
    previous_hash now points at a hash that no longer exists. This is
    the property that makes it a chain rather than per-record checksums."""
    from medagent.security.audit_logger import _compute_entry_hash

    def _forge(record):
        record["user_id"] = "attacker"
        record["entry_hash"] = _compute_entry_hash(record)

    _rewrite(log_path, 2, _forge)

    result = verify_chain(JSONLAuditStore(log_path).read_all_records())
    assert not result.is_valid
    assert result.broken_at_index == 3  # caught at the successor, not the edited record
    assert "deleted, reordered, or inserted" in result.reason


def test_detects_records_missing_hash_fields_entirely():
    assert not verify_chain([{"case_id": "c", "event_type": "case_started"}]).is_valid


# ── PHI policy ──────────────────────────────────────────────────────

def test_notes_are_passed_through_phi_redaction(logger, log_path):
    """`notes` is the one free-text field an audit record can carry, so
    it must be de-identified before it is written."""
    logger.append_event(
        case_id="case-001", event_type="case_archived", user_id="r.chen",
        notes="Rejected -- discussed with Dr. Alice Johnson at Mercy General Hospital.",
    )
    record = JSONLAuditStore(log_path).read_all_records()[0]
    assert "Alice Johnson" not in record["notes"]
    assert "Mercy General Hospital" not in record["notes"]


def test_note_is_withheld_entirely_if_redaction_fails(logger, log_path, monkeypatch):
    """A redaction outage must never become a PHI leak."""
    import medagent.privacy.phi_redaction as phi_redaction

    def _boom(_text):
        raise RuntimeError("NLP engine unavailable")

    monkeypatch.setattr(phi_redaction, "redact_phi", _boom)

    logger.append_event(case_id="case-001", event_type="case_archived", notes="free text")

    record = JSONLAuditStore(log_path).read_all_records()[0]
    assert record["notes"] == "[REDACTION FAILED -- note withheld]"


def test_a_withheld_note_still_produces_a_valid_chain(logger, monkeypatch):
    """The chain must stay verifiable through a redaction failure -- an
    audit trail that breaks when one subsystem degrades is not an audit
    trail."""
    import medagent.privacy.phi_redaction as phi_redaction

    monkeypatch.setattr(phi_redaction, "redact_phi", lambda _t: (_ for _ in ()).throw(RuntimeError()))

    logger.append_event(case_id="case-001", event_type="case_started")
    logger.append_event(case_id="case-001", event_type="case_archived", notes="free text")
    assert logger.verify().is_valid


# ── Dependency injection ────────────────────────────────────────────

def test_logger_writes_through_whatever_store_it_is_given():
    """The Phase 3 Postgres migration is a wiring change, not a rewrite:
    AuditLogger must work against any AuditStore implementation."""

    class InMemoryStore:
        def __init__(self):
            self.records: list[dict] = []

        def append_record(self, record: dict) -> None:
            self.records.append(record)

        def read_all_records(self) -> list[dict]:
            return list(self.records)

    store = InMemoryStore()
    assert isinstance(store, AuditStore)

    logger = AuditLogger(store)
    logger.append_event(case_id="case-001", event_type="case_started")
    logger.append_event(case_id="case-001", event_type="case_finalized", user_id="r.chen")

    assert len(store.records) == 2
    assert logger.verify().is_valid
