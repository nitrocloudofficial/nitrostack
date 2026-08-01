"""
Unit tests for scripts/generate_compliance_manifest.py (Phase 2, item 5).

The property under test throughout is not "does it copy files" but "can
the resulting package be trusted": that a gap is always visible, that a
control description cannot silently go stale, and that the audit sample
it ships is actually verifiable by whoever receives it.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

_REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_REPO_ROOT / "scripts"))

from generate_compliance_manifest import (  # noqa: E402
    generate_compliance_export,
)
from medagent.security.audit_logger import AuditLogger, verify_chain  # noqa: E402
from medagent.security.audit_store import JSONLAuditStore  # noqa: E402
from medagent.security.auth import describe_permission_matrix  # noqa: E402


@pytest.fixture
def fake_repo(tmp_path):
    """A minimal repo layout containing every artifact the exporter
    looks for, so tests exercise the collector rather than this
    checkout's incidental state."""
    root = tmp_path / "repo"
    (root / "docs" / "regulatory").mkdir(parents=True)
    (root / "docs" / "architecture.md").write_text("# Architecture\nReal content.", encoding="utf-8")
    (root / "docs" / "regulatory" / "intended_use.md").write_text("# REG-001", encoding="utf-8")
    (root / "docs" / "regulatory" / "fda_ce_pathway.md").write_text("# REG-002", encoding="utf-8")
    (root / "evaluation_results").mkdir(parents=True)
    (root / "evaluation_results" / "Model_Card.md").write_text("# Model Card", encoding="utf-8")
    (root / "evaluation_results" / "subgroup_analysis.json").write_text("{}", encoding="utf-8")
    return root


@pytest.fixture
def populated_audit_log(tmp_path):
    path = tmp_path / "audit_log.jsonl"
    logger = AuditLogger(JSONLAuditStore(path))
    for event, user in [
        ("case_started", "tech.a"),
        ("deidentification_completed", None),
        ("ai_report_drafted", None),
        ("human_review_resumed", "r.chen"),
        ("case_finalized", "r.chen"),
    ]:
        logger.append_event(case_id="case-001", event_type=event, user_id=user)
    return path


def _export(tmp_path, fake_repo, audit_log_path, **kwargs):
    return generate_compliance_export(
        output_dir=tmp_path / "export",
        repo_root=fake_repo,
        audit_log_path=audit_log_path,
        **kwargs,
    )


# ── Collection ──────────────────────────────────────────────────────

def test_export_collects_every_expected_artifact(tmp_path, fake_repo, populated_audit_log):
    result = _export(tmp_path, fake_repo, populated_audit_log)

    assert result.is_complete
    files = {item["file"] for item in result.collected}
    assert files == {
        "REG-001_intended_use.md",
        "REG-002_fda_ce_pathway.md",
        "Model_Card.md",
        "subgroup_analysis.json",
        "audit_log_sample.jsonl",
        "architecture.md",
        "rbac_permission_matrix.md",
    }
    for name in files:
        assert (result.output_dir / name).exists()


def test_export_writes_both_manifest_formats(tmp_path, fake_repo, populated_audit_log):
    result = _export(tmp_path, fake_repo, populated_audit_log)

    assert (result.output_dir / "MANIFEST.md").exists()
    payload = json.loads((result.output_dir / "manifest.json").read_text())
    assert payload["status"] == "COMPLETE"
    assert payload["artifacts"]
    assert "SYNTHETIC" in payload["synthetic_data_notice"]


def test_every_artifact_is_fingerprinted(tmp_path, fake_repo, populated_audit_log):
    """The recipient must be able to confirm nothing changed in transit."""
    import hashlib

    result = _export(tmp_path, fake_repo, populated_audit_log)
    for item in result.collected:
        actual = hashlib.sha256((result.output_dir / item["file"]).read_bytes()).hexdigest()
        assert item["sha256"] == actual
        assert item["size_bytes"] > 0


def test_export_is_rebuilt_from_scratch_each_run(tmp_path, fake_repo, populated_audit_log):
    """A leftover file from a previous export would be indistinguishable
    from current evidence."""
    result = _export(tmp_path, fake_repo, populated_audit_log)
    stale = result.output_dir / "stale_artifact_from_last_time.md"
    stale.write_text("old", encoding="utf-8")

    _export(tmp_path, fake_repo, populated_audit_log)
    assert not stale.exists()


# ── Gaps are always visible ─────────────────────────────────────────

def test_missing_required_artifact_marks_the_package_incomplete(
    tmp_path, fake_repo, populated_audit_log
):
    (fake_repo / "evaluation_results" / "Model_Card.md").unlink()

    result = _export(tmp_path, fake_repo, populated_audit_log)

    assert not result.is_complete
    assert "Model Card" in [item["label"] for item in result.missing_required]
    assert json.loads((result.output_dir / "manifest.json").read_text())["status"] == "INCOMPLETE"


def test_a_partial_package_is_still_written_with_the_gap_recorded(
    tmp_path, fake_repo, populated_audit_log
):
    """An incomplete package plus an explicit record of what is absent is
    more useful to counsel than no package at all."""
    (fake_repo / "evaluation_results" / "Model_Card.md").unlink()

    result = _export(tmp_path, fake_repo, populated_audit_log)

    assert (result.output_dir / "MANIFEST.md").exists()
    assert "Model Card" in (result.output_dir / "MANIFEST.md").read_text()
    assert (result.output_dir / "REG-001_intended_use.md").exists()


def test_missing_optional_artifact_does_not_make_the_package_incomplete(
    tmp_path, fake_repo, populated_audit_log
):
    (fake_repo / "docs" / "architecture.md").unlink()

    result = _export(tmp_path, fake_repo, populated_audit_log)

    assert result.is_complete
    assert "Architecture description" in [item["label"] for item in result.missing]
    assert json.loads((result.output_dir / "manifest.json").read_text())["status"] == (
        "COMPLETE_WITH_OPTIONAL_GAPS"
    )


def test_an_empty_file_is_treated_as_missing_not_shipped(
    tmp_path, fake_repo, populated_audit_log
):
    """An empty artifact would arrive with a valid checksum and read as
    collected evidence, giving a reviewer no signal that it is hollow."""
    (fake_repo / "docs" / "architecture.md").write_text("", encoding="utf-8")

    result = _export(tmp_path, fake_repo, populated_audit_log)

    assert "architecture.md" not in {item["file"] for item in result.collected}
    missing = next(i for i in result.missing if i["label"] == "Architecture description")
    assert missing["reason"] == "file exists but is empty"


def test_manifest_paths_are_repo_relative_not_absolute(
    tmp_path, fake_repo, populated_audit_log
):
    """This package leaves the company; it should not carry the
    developer's home directory with it."""
    (fake_repo / "evaluation_results" / "Model_Card.md").unlink()

    result = _export(tmp_path, fake_repo, populated_audit_log)

    manifest = (result.output_dir / "MANIFEST.md").read_text()
    assert str(fake_repo) not in manifest
    assert "evaluation_results/Model_Card.md" in manifest


# ── Audit sample integrity ──────────────────────────────────────────

def test_audit_sample_is_a_verifiable_contiguous_prefix(
    tmp_path, fake_repo, populated_audit_log
):
    """Only an unbroken prefix from the genesis record can be re-verified
    by the recipient; a random sample would arrive looking tampered."""
    result = _export(tmp_path, fake_repo, populated_audit_log, audit_sample_size=3)

    exported = JSONLAuditStore(result.output_dir / "audit_log_sample.jsonl").read_all_records()
    assert [record["sequence"] for record in exported] == [0, 1, 2]
    assert verify_chain(exported).is_valid

    assert result.audit_verification["status"] == "VERIFIED"
    assert result.audit_verification["records_exported"] == 3
    assert result.audit_verification["truncated"] is True


def test_a_tampered_audit_log_is_reported_not_silently_shipped(
    tmp_path, fake_repo, populated_audit_log
):
    """Shipping an audit trail to counsel without checking its integrity
    would defeat the point of having built the chain."""
    lines = populated_audit_log.read_text(encoding="utf-8").splitlines()
    record = json.loads(lines[2])
    record["user_id"] = "attacker"
    lines[2] = json.dumps(record, sort_keys=True)
    populated_audit_log.write_text("\n".join(lines) + "\n", encoding="utf-8")

    result = _export(tmp_path, fake_repo, populated_audit_log)

    assert result.audit_verification["status"] == "CHAIN BROKEN"
    assert "MODIFIED" in result.audit_verification["detail"]
    assert "CHAIN BROKEN" in (result.output_dir / "MANIFEST.md").read_text()


def test_an_absent_audit_log_is_recorded_rather_than_crashing(tmp_path, fake_repo):
    result = _export(tmp_path, fake_repo, tmp_path / "no_such_log.jsonl")

    assert result.audit_verification["status"] == "EMPTY"
    assert result.is_complete  # the audit sample is optional
    assert not (result.output_dir / "audit_log_sample.jsonl").exists()


# ── RBAC matrix is generated, not transcribed ───────────────────────

def test_rbac_matrix_reflects_the_code_that_enforces_it(
    tmp_path, fake_repo, populated_audit_log
):
    """A permission table hand-copied into a compliance document goes
    stale the first time the code changes -- and a stale control
    description is worse than a missing one, because it gets relied on."""
    result = _export(tmp_path, fake_repo, populated_audit_log)
    matrix_text = (result.output_dir / "rbac_permission_matrix.md").read_text()

    for role, actions in describe_permission_matrix().items():
        assert f"`{role}`" in matrix_text
        row = next(line for line in matrix_text.splitlines() if f"`{role}`" in line)
        header = next(line for line in matrix_text.splitlines() if line.startswith("| Role |"))
        columns = [cell.strip() for cell in header.strip("|").split("|")][1:]
        cells = [cell.strip() for cell in row.strip("|").split("|")][1:]
        for action, cell in zip(columns, cells):
            assert cell == ("YES" if action in actions else "NO"), (
                f"{role}/{action} rendered as {cell} but the enforced matrix says otherwise"
            )


def test_rbac_matrix_documents_the_authentication_limitation(
    tmp_path, fake_repo, populated_audit_log
):
    """Counsel must not read this control as stronger than it is: it
    authorizes an identity, it does not authenticate one."""
    result = _export(tmp_path, fake_repo, populated_audit_log)
    text = (result.output_dir / "rbac_permission_matrix.md").read_text()
    assert "does not *authenticate*" in text
    assert "REG-002" in text, "the limitation must point at where the gap is tracked"


# ── Archive ─────────────────────────────────────────────────────────

def test_zip_archive_is_produced_on_request(tmp_path, fake_repo, populated_audit_log):
    import zipfile

    result = _export(tmp_path, fake_repo, populated_audit_log, make_archive=True)

    assert result.archive_path is not None and result.archive_path.exists()
    with zipfile.ZipFile(result.archive_path) as archive:
        assert "MANIFEST.md" in archive.namelist()
        assert "rbac_permission_matrix.md" in archive.namelist()
