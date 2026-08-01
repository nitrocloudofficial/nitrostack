"""
Unit tests for privacy/phi_redaction.py (Phase 2, item 1: Presidio-based
text de-identification, replacing the old fixed regex list).
"""
from __future__ import annotations

from medagent.privacy.phi_redaction import redact_phi


def test_redact_phi_masks_person_name():
    redacted = redact_phi("Patient John Smith was seen today.")
    assert "John Smith" not in redacted
    assert "<PERSON>" in redacted


def test_redact_phi_masks_date():
    redacted = redact_phi("Seen on 2026-07-29 for a follow-up.")
    assert "2026-07-29" not in redacted
    assert "<DATE_TIME>" in redacted


def test_redact_phi_masks_organization():
    """Presidio's own default AnalyzerEngine() config excludes ORGANIZATION
    entirely (conf/default.yaml's labels_to_ignore) -- this project's
    _get_analyzer() deliberately re-enables it (see that module's
    docstring), since an unredacted hospital name is a real PHI leak.
    This test guards against that override silently regressing."""
    redacted = redact_phi("Treated at Mercy General Hospital.")
    assert "Mercy General Hospital" not in redacted
    assert "<ORGANIZATION>" in redacted


def test_redact_phi_masks_custom_mrn_pattern():
    redacted = redact_phi("Record MRN-1029384 was updated.")
    assert "1029384" not in redacted
    assert "<MEDICAL_RECORD_NUMBER>" in redacted


def test_redact_phi_masks_phone_number():
    redacted = redact_phi("Contact number: 555-123-4567.")
    assert "555-123-4567" not in redacted


def test_redact_phi_full_toxic_sentence():
    sample = (
        "Patient John Smith, DOB 04/12/1985, MRN 1029384, phone 555-123-4567, "
        "seen at Mercy General Hospital in Springfield on 2026-07-29."
    )
    redacted = redact_phi(sample)
    for leaked in ("John Smith", "1029384", "555-123-4567", "Mercy General Hospital", "Springfield"):
        assert leaked not in redacted


def test_redact_phi_empty_string_returns_as_is():
    assert redact_phi("") == ""


def test_redact_phi_leaves_clinical_text_without_pii_unchanged():
    clinical_note = "Bilateral lung opacities consistent with pneumonia."
    assert redact_phi(clinical_note) == clinical_note
