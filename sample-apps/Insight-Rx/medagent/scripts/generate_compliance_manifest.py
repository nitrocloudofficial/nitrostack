"""
Compliance evidence packager -- Phase 2, item 5
(Strategic_Startup_Roadmap.pdf: "package our Phase 1/Phase 2 artifacts
for external counsel").

Collects the evidence artifacts a regulatory reviewer asks for into a
single `compliance_export/` directory, fingerprints each one with
SHA-256, and writes both a human-readable MANIFEST.md and a machine-
readable manifest.json.

Three design decisions worth stating, because each one is about the
package being *trustworthy* rather than merely complete:

1. The RBAC matrix is generated from the code that enforces it
   (security/auth.py's describe_permission_matrix()), never transcribed.
   A permission table hand-copied into a compliance document is one that
   silently goes stale the first time the code changes -- and a stale
   control description is worse than a missing one, because it will be
   relied on.

2. The audit-log sample is a contiguous prefix from the genesis record,
   not a random selection. The audit trail is hash-chained, so only an
   unbroken prefix can actually be verified by the recipient; a random
   sample would arrive looking tampered with. The chain is verified
   before export and the verdict is recorded in the manifest -- shipping
   an audit trail to counsel without checking its integrity first would
   defeat the purpose of having built the chain.

3. Missing artifacts are reported loudly and listed in the manifest,
   and a missing REQUIRED artifact causes a non-zero exit. A compliance
   package that is quietly incomplete is the failure mode this script
   exists to prevent -- which is also why a file that exists but is
   empty is treated as missing rather than shipped: it would otherwise
   arrive with a valid checksum and read as collected evidence.

Usage:
    python3 scripts/generate_compliance_manifest.py
    python3 scripts/generate_compliance_manifest.py --output-dir /tmp/export --zip
"""
from __future__ import annotations

import argparse
import hashlib
import json
import logging
import shutil
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

# Allow running as a plain script from the repo root without installing.
_REPO_ROOT = Path(__file__).resolve().parents[1]
if str(_REPO_ROOT / "src") not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT / "src"))

from medagent.security.audit_logger import verify_chain  # noqa: E402
from medagent.security.audit_store import JSONLAuditStore  # noqa: E402
from medagent.security.auth import describe_permission_matrix  # noqa: E402

logger = logging.getLogger("medagent.compliance_manifest")

DEFAULT_OUTPUT_DIR = "compliance_export"
DEFAULT_AUDIT_SAMPLE_SIZE = 100

SYNTHETIC_NOTICE = (
    "All quantitative performance evidence in this package was computed against "
    "SYNTHETIC data (`data/synthetic_rsna_generator.py`), not real patients. No metric "
    "herein reflects real clinical performance. See REG-001 for the full status notice."
)


@dataclass
class Artifact:
    """One evidence file to collect. `required` artifacts failing to
    exist make the whole export incomplete."""

    label: str
    source: Path
    destination: str
    description: str
    required: bool = True


@dataclass
class ExportResult:
    """Outcome of a packaging run, returned rather than printed so this
    is testable and callable as a library, not only as a CLI."""

    output_dir: Path
    collected: list[dict] = field(default_factory=list)
    missing: list[dict] = field(default_factory=list)
    audit_verification: dict | None = None
    archive_path: Path | None = None

    @property
    def missing_required(self) -> list[dict]:
        return [item for item in self.missing if item["required"]]

    @property
    def is_complete(self) -> bool:
        """Complete means every REQUIRED artifact was collected. Optional
        gaps are recorded in the manifest but do not make the package
        unusable -- conflating the two would either cry wolf on every
        export or hide a genuinely missing document."""
        return not self.missing_required


def _display_path(path: Path, repo_root: Path) -> str:
    """Repo-relative where possible. This package goes to people outside
    the company, and absolute paths would carry the developer's home
    directory and local layout into it -- noise at best, and needless
    disclosure of internal structure at worst."""
    try:
        return str(path.resolve().relative_to(repo_root.resolve()))
    except ValueError:
        return str(path)


def _sha256(path: Path) -> str:
    hasher = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def _artifacts(repo_root: Path, audit_log_path: Path) -> list[Artifact]:
    docs = repo_root / "docs" / "regulatory"
    results = repo_root / "evaluation_results"
    return [
        Artifact(
            "Intended Use Statement (REG-001)", docs / "intended_use.md",
            "REG-001_intended_use.md",
            "Defines the device as assistive clinical decision support, not autonomous diagnosis.",
        ),
        Artifact(
            "Regulatory Pathway & Controls Mapping (REG-002)", docs / "fda_ce_pathway.md",
            "REG-002_fda_ce_pathway.md",
            "FDA/CE pathway scoping, Phase 2 controls mapped to risk controls, and gap analysis.",
        ),
        Artifact(
            "Model Card", results / "Model_Card.md", "Model_Card.md",
            "Phase 1 performance, calibration, and subgroup analysis. SYNTHETIC DATA ONLY.",
        ),
        Artifact(
            "Subgroup & bias analysis", results / "subgroup_analysis.json",
            "subgroup_analysis.json",
            "Machine-readable subgroup metrics with safety and fairness flags. SYNTHETIC DATA ONLY.",
            required=False,
        ),
        Artifact(
            "Audit trail sample", audit_log_path, "audit_log_sample.jsonl",
            "Contiguous prefix of the hash-chained audit trail, independently verifiable.",
            required=False,
        ),
        Artifact(
            "Architecture description", repo_root / "docs" / "architecture.md",
            "architecture.md", "System architecture and data flow.", required=False,
        ),
    ]


def _export_audit_sample(
    source: Path, destination: Path, sample_size: int
) -> tuple[bool, dict]:
    """
    Writes the first `sample_size` audit records to `destination` and
    verifies the chain over exactly what was written.

    A prefix, deliberately: the recipient can only re-verify a chain that
    starts at the genesis record, so an arbitrary slice would be
    unverifiable and would read as tampered. Verification runs over the
    exported subset so the verdict in the manifest describes the file
    actually shipped, not the file it came from.
    """
    store = JSONLAuditStore(source)
    try:
        records = store.read_all_records()
    except Exception as exc:  # noqa: BLE001 - a corrupt log is itself a finding worth reporting
        return False, {
            "status": "UNREADABLE",
            "detail": f"{type(exc).__name__}: {exc}",
            "records_exported": 0,
        }

    if not records:
        return False, {"status": "EMPTY", "detail": "No audit records exist yet.", "records_exported": 0}

    sample = records[:sample_size]
    destination.write_text(
        "".join(json.dumps(record, sort_keys=True) + "\n" for record in sample), encoding="utf-8"
    )

    result = verify_chain(sample)
    return True, {
        "status": "VERIFIED" if result.is_valid else "CHAIN BROKEN",
        "detail": result.reason or "Hash chain intact across the exported records.",
        "records_exported": len(sample),
        "records_in_source": len(records),
        "truncated": len(records) > len(sample),
    }


def _write_rbac_matrix(destination: Path) -> None:
    """Publishes the permission matrix that is actually enforced, read
    live from security/auth.py -- see this module's docstring."""
    matrix = describe_permission_matrix()
    all_actions = sorted({action for actions in matrix.values() for action in actions})

    lines = [
        "# RBAC Permission Matrix",
        "",
        "Generated directly from `src/medagent/security/auth.py` at export time -- this is",
        "the matrix the running system enforces, not a transcription of it.",
        "",
        "Scope: authorization of the mandatory clinical review decision (the `human_review`",
        "gate). Every decision, and every refused attempt, is recorded in the hash-chained",
        "audit trail.",
        "",
        "| Role | " + " | ".join(all_actions) + " |",
        "|---|" + "---|" * len(all_actions),
    ]
    for role, permitted in matrix.items():
        cells = ["YES" if action in permitted else "NO" for action in all_actions]
        lines.append(f"| `{role}` | " + " | ".join(cells) + " |")

    lines += [
        "",
        "## Rationale for the asymmetry",
        "",
        "Approving or revising a report is a licensed clinical act and is restricted to",
        "`radiologist`. Rejecting only ever routes a case toward manual radiologist workup",
        "and so cannot cause an AI-generated finding to be accepted as clinical truth --",
        "which is why the operational `admin` role may reject but may not approve or revise.",
        "Administering the system does not confer authority to sign an interpretation.",
        "",
        "## Known limitation",
        "",
        "This layer *authorizes* an established identity; it does not *authenticate* one.",
        "Roles are currently trusted input from the surrounding deployment. Integration with",
        "an attested identity provider is tracked as a gap in REG-002 section 6.2.",
        "",
    ]
    destination.write_text("\n".join(lines), encoding="utf-8")


def _write_manifest(result: ExportResult, audit_log_path: Path, repo_root: Path) -> None:
    generated_at = datetime.now(timezone.utc).isoformat()

    if not result.is_complete:
        status = "INCOMPLETE"
        status_line = "⚠️ INCOMPLETE — required artifact(s) missing, see below"
    elif result.missing:
        status = "COMPLETE_WITH_OPTIONAL_GAPS"
        status_line = "COMPLETE — all required artifacts present; optional gap(s) noted below"
    else:
        status = "COMPLETE"
        status_line = "COMPLETE"

    payload = {
        "generated_at": generated_at,
        "status": status,
        "synthetic_data_notice": SYNTHETIC_NOTICE,
        "audit_verification": result.audit_verification,
        "artifacts": result.collected,
        "missing_artifacts": result.missing,
    }
    (result.output_dir / "manifest.json").write_text(
        json.dumps(payload, indent=2), encoding="utf-8"
    )

    lines = [
        "# Compliance Evidence Manifest",
        "",
        f"**Generated:** {generated_at}",
        f"**Package status:** {status_line}",
        "",
        "---",
        "",
        "## ⚠️ Synthetic data notice",
        "",
        SYNTHETIC_NOTICE,
        "",
        "This package is an engineering evidence bundle prepared for external regulatory",
        "counsel. It is not a regulatory submission and contains no legal advice.",
        "",
        "## Artifacts",
        "",
        "Each file is fingerprinted with SHA-256 so the recipient can confirm nothing was",
        "altered in transit.",
        "",
        "| Artifact | File | SHA-256 | Size |",
        "|---|---|---|---|",
    ]
    for item in result.collected:
        lines.append(
            f"| {item['label']} | `{item['file']}` | `{item['sha256'][:16]}…` | {item['size_bytes']:,} B |"
        )

    lines += ["", "### Descriptions", ""]
    for item in result.collected:
        lines.append(f"- **{item['label']}** (`{item['file']}`) — {item['description']}")

    if result.missing:
        lines += [
            "",
            "## Artifacts not collected",
            "",
            (
                "**One or more REQUIRED artifacts are missing — this package is incomplete.**"
                if not result.is_complete
                else "All required artifacts were collected. The following optional artifacts "
                     "were unavailable and are recorded here so their absence is explicit "
                     "rather than inferred."
            ),
            "",
            "| Artifact | Expected at | Required | Reason |",
            "|---|---|---|---|",
        ]
        for item in result.missing:
            lines.append(
                f"| {item['label']} | `{item['expected_path']}` | "
                f"{'**YES**' if item['required'] else 'no'} | {item['reason']} |"
            )

    if result.audit_verification:
        verification = result.audit_verification
        lines += [
            "",
            "## Audit trail integrity",
            "",
            f"- **Source:** `{_display_path(audit_log_path, repo_root)}`",
            f"- **Verification:** **{verification['status']}**",
            f"- **Detail:** {verification['detail']}",
            f"- **Records exported:** {verification['records_exported']}",
        ]
        if verification.get("truncated"):
            lines.append(
                f"- **Note:** sampled the first {verification['records_exported']} of "
                f"{verification['records_in_source']} records. The sample is a contiguous prefix "
                f"from the genesis record so the recipient can independently re-verify the chain; "
                f"a non-contiguous sample would be unverifiable by construction."
            )
        lines += [
            "",
            "Re-verify independently with:",
            "",
            "```",
            "python3 -m medagent.security.audit_logger <path-to-audit_log_sample.jsonl>",
            "```",
            "",
            "Audit records carry no PHI: structured fields are PHI-free by construction and the",
            "single free-text field is passed through the Presidio de-identifier before being",
            "written. See REG-002 section 3.3.",
        ]

    lines += ["", "---", "", "*Generated by `scripts/generate_compliance_manifest.py`.*", ""]
    (result.output_dir / "MANIFEST.md").write_text("\n".join(lines), encoding="utf-8")


def generate_compliance_export(
    output_dir: str | Path = DEFAULT_OUTPUT_DIR,
    repo_root: str | Path | None = None,
    audit_log_path: str | Path | None = None,
    audit_sample_size: int = DEFAULT_AUDIT_SAMPLE_SIZE,
    make_archive: bool = False,
) -> ExportResult:
    """
    Builds the compliance package and returns what was and was not
    collected. Never raises for a missing artifact -- an incomplete
    package plus an explicit record of the gap is more useful to counsel
    than no package at all; the CLI turns that into a non-zero exit.
    """
    repo_root = Path(repo_root) if repo_root else _REPO_ROOT
    if audit_log_path is None:
        from medagent.utils.settings import get_settings

        audit_log_path = Path(get_settings().audit_log_path)
        if not audit_log_path.is_absolute():
            audit_log_path = repo_root / audit_log_path
    audit_log_path = Path(audit_log_path)

    output_dir = Path(output_dir)
    # Rebuilt from scratch each run: a stale artifact left over from a
    # previous export would be indistinguishable from a current one.
    if output_dir.exists():
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True)

    result = ExportResult(output_dir=output_dir)

    for artifact in _artifacts(repo_root, audit_log_path):
        destination = output_dir / artifact.destination

        if artifact.destination == "audit_log_sample.jsonl":
            exported, verification = _export_audit_sample(
                artifact.source, destination, audit_sample_size
            )
            result.audit_verification = verification
            if not exported:
                result.missing.append({
                    "label": artifact.label,
                    "expected_path": _display_path(artifact.source, repo_root),
                    "required": artifact.required,
                    "reason": verification["detail"],
                })
                continue
        elif not artifact.source.exists():
            logger.warning("Missing %s (expected at %s)", artifact.label, artifact.source)
            result.missing.append({
                "label": artifact.label,
                "expected_path": _display_path(artifact.source, repo_root),
                "required": artifact.required,
                "reason": "file not found",
            })
            continue
        elif artifact.source.stat().st_size == 0:
            # An empty file is worse than an absent one here: it lands in
            # the package with a valid checksum and reads as collected
            # evidence, so a reviewer has no signal that there is nothing
            # in it. Report it as missing instead.
            logger.warning("Empty artifact %s at %s -- treating as missing",
                           artifact.label, artifact.source)
            result.missing.append({
                "label": artifact.label,
                "expected_path": _display_path(artifact.source, repo_root),
                "required": artifact.required,
                "reason": "file exists but is empty",
            })
            continue
        else:
            shutil.copy2(artifact.source, destination)

        result.collected.append({
            "label": artifact.label,
            "file": artifact.destination,
            "source": _display_path(artifact.source, repo_root),
            "description": artifact.description,
            "sha256": _sha256(destination),
            "size_bytes": destination.stat().st_size,
        })

    # Generated rather than copied -- see this module's docstring.
    rbac_path = output_dir / "rbac_permission_matrix.md"
    _write_rbac_matrix(rbac_path)
    result.collected.append({
        "label": "RBAC permission matrix",
        "file": rbac_path.name,
        "source": "generated from src/medagent/security/auth.py",
        "description": "The clinical-review permission matrix as enforced in code at export time.",
        "sha256": _sha256(rbac_path),
        "size_bytes": rbac_path.stat().st_size,
    })

    _write_manifest(result, audit_log_path, repo_root)

    if make_archive:
        archive_base = output_dir.parent / output_dir.name
        result.archive_path = Path(
            shutil.make_archive(str(archive_base), "zip", root_dir=output_dir)
        )

    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--output-dir", default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--audit-log", default=None, help="Override the audit log path.")
    parser.add_argument("--audit-sample-size", type=int, default=DEFAULT_AUDIT_SAMPLE_SIZE)
    parser.add_argument("--zip", action="store_true", help="Also produce a .zip archive.")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

    result = generate_compliance_export(
        output_dir=args.output_dir,
        audit_log_path=args.audit_log,
        audit_sample_size=args.audit_sample_size,
        make_archive=args.zip,
    )

    print(f"\nCompliance export -> {result.output_dir}")
    for item in result.collected:
        print(f"  [OK]      {item['file']:<34} sha256={item['sha256'][:16]}…")
    for item in result.missing:
        marker = "[MISSING]" if item["required"] else "[skipped]"
        print(f"  {marker} {item['label']:<34} ({item['reason']})")

    if result.audit_verification:
        print(f"\n  Audit chain: {result.audit_verification['status']} "
              f"({result.audit_verification['records_exported']} record(s) exported)")

    if result.archive_path:
        print(f"\n  Archive: {result.archive_path}")

    if not result.is_complete:
        required_missing = [item for item in result.missing if item["required"]]
        if required_missing:
            print(
                "\nINCOMPLETE: required artifact(s) missing -- "
                f"{[item['label'] for item in required_missing]}. "
                "The package and manifest were still written, with the gap recorded.",
                file=sys.stderr,
            )
            return 1
        print("\nComplete, with optional artifact(s) absent (recorded in the manifest).")

    print("\nDone.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
