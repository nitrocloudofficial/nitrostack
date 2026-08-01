"""
DICOM metadata scrubbing -- Phase 2, item 1
(Strategic_Startup_Roadmap.pdf: "Replace regex PHI redaction with a
proper de-identifier ... add DICOM tag + burned-in-pixel scrubbing").

Removes or generalizes the DICOM tags HIPAA Safe Harbor treats as
direct patient identifiers -- names, birth dates, addresses, institution
and staff names, and free-text identifying fields -- before a dataset's
metadata is read by anything else in this system (privacy/deidentify.py
calls this before either the "local cache" DICOM copy or the pixel
array reaches the perception layer; see that module).

This is deliberately narrower than "redact everything": PatientAge,
PatientSex, ViewPosition, Modality, and BodyPartExamined are left intact
-- they're clinically necessary (this project's own PatientMetadata
schema depends on age/sex/view_position) and are not, on their own,
direct identifiers under Safe Harbor. PatientAge is the one exception
that needs adjustment rather than removal: Safe Harbor requires ages
90 and over be generalized to a single "90+" category rather than left
exact, since exact ages that high are rare enough to be identifying on
their own.
"""
from __future__ import annotations

import logging

import pydicom

logger = logging.getLogger("medagent.privacy.dicom_scrubbing")


class PHIScrubError(Exception):
    """Raised when a DICOM dataset can't be safely scrubbed. Callers
    (privacy/deidentify.py) must NOT catch this broadly and fall back to
    the unscrubbed dataset -- see that module's hard-gate design."""


# HIPAA Safe Harbor direct-identifier tags, plus common free-text fields
# that routinely carry identifying information in practice even though
# they aren't every one of Safe Harbor's 18 categories by name (e.g.
# OperatorsName, StationName). Removed entirely (not blanked) so a
# reader can't distinguish "redacted" from "never populated".
PHI_TAG_KEYWORDS: tuple[str, ...] = (
    "PatientName",
    "PatientID",
    "PatientBirthDate",
    "PatientBirthTime",
    "PatientAddress",
    "PatientTelephoneNumbers",
    "PatientMotherBirthName",
    "OtherPatientIDs",
    "OtherPatientNames",
    "OtherPatientIDsSequence",
    "IssuerOfPatientID",
    "InstitutionName",
    "InstitutionAddress",
    "InstitutionalDepartmentName",
    "ReferringPhysicianName",
    "ReferringPhysicianAddress",
    "ReferringPhysicianTelephoneNumbers",
    "PerformingPhysicianName",
    "RequestingPhysician",
    "PhysiciansOfRecord",
    "OperatorsName",
    "StationName",
    "AccessionNumber",
    "StudyID",
)

# HIPAA Safe Harbor: ages 90 and over must be generalized to a single
# category, not left exact. Every DICOM tag here is an AS (age string)
# field, e.g. "094Y" -- capped to this value rather than removed, since
# an age band is still clinically useful (an "unknown age" adult is
# harder to reason about than a "90+" one).
_AGE_TAGS = ("PatientAge",)
_AGE_CAP_VALUE = "090Y"


def _parse_age_years(raw: str) -> int | None:
    """Parses a DICOM AS-format age string (e.g. "094Y", "003M") into an
    integer number of years; returns None for anything not in years
    (months/days are never near the 90+ threshold this function checks)."""
    raw = (raw or "").strip()
    if not raw or raw[-1].upper() != "Y":
        return None
    try:
        return int(raw[:-1])
    except ValueError:
        return None


def scrub_dicom_dataset(dcm: "pydicom.Dataset") -> "pydicom.Dataset":
    """
    Removes PHI_TAG_KEYWORDS from `dcm` in place and caps any age tag at
    90+, and returns the same (now-scrubbed) dataset for convenience.

    Raises PHIScrubError if `dcm` isn't actually a pydicom Dataset --
    an unexpected input type here means something upstream is wrong,
    and continuing would risk silently "scrubbing" nothing. (A naive
    duck-typing check via hasattr() is NOT sufficient here: plain
    strings/dicts/lists all define __contains__ and every Python object
    inherits __delattr__ from `object`, so that check would pass for
    almost anything -- isinstance against the real pydicom type is the
    only check that actually catches a wrong-type input.)
    """
    if not isinstance(dcm, pydicom.Dataset):
        raise PHIScrubError(f"scrub_dicom_dataset() expected a pydicom Dataset, got {type(dcm).__name__}")

    try:
        removed = []
        for keyword in PHI_TAG_KEYWORDS:
            if keyword in dcm:
                delattr(dcm, keyword)
                removed.append(keyword)

        capped = []
        for keyword in _AGE_TAGS:
            if keyword in dcm:
                years = _parse_age_years(str(getattr(dcm, keyword)))
                if years is not None and years >= 90:
                    setattr(dcm, keyword, _AGE_CAP_VALUE)
                    capped.append(keyword)

        logger.info(
            "Scrubbed %d PHI tag(s)%s from DICOM dataset.",
            len(removed), f", capped {capped} to 90+" if capped else "",
        )
        return dcm
    except PHIScrubError:
        raise
    except Exception as exc:  # noqa: BLE001 - any unexpected pydicom error must halt, not silently pass through
        raise PHIScrubError(f"Unexpected error scrubbing DICOM dataset: {type(exc).__name__}: {exc}") from exc
