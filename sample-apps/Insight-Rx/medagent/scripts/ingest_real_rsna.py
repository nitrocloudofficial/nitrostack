"""
Real RSNA Pneumonia Detection Challenge ingestion -- Phase 2.5.

Downloads the competition archive via the Kaggle CLI, extracts it into
`data/rsna/`, verifies the layout the evaluation harness expects, and
creates the locked 70/15/15 patient-level split.

    python3 scripts/ingest_real_rsna.py            # download + extract + verify + split
    python3 scripts/ingest_real_rsna.py --verify-only
    python3 scripts/ingest_real_rsna.py --skip-download   # already extracted
    python3 scripts/ingest_real_rsna.py --skip-split

Prerequisites (the download step will fail fast with instructions if
these are missing):
  1. `pip install kaggle`
  2. A Kaggle API token at ~/.kaggle/kaggle.json (Kaggle -> Account ->
     Create New API Token), chmod 600.
  3. **Competition rules accepted** at
     https://www.kaggle.com/c/rsna-pneumonia-detection-challenge/rules
     -- the API returns 403 until you have clicked accept in a browser,
     and that 403 looks like an auth failure, which sends people to
     re-check their token instead of the rules page.

This is real patient imaging data. It is de-identified by RSNA, but it
remains subject to the competition's terms of use: do not redistribute
it, and do not commit it. `data/rsna/` is gitignored for that reason.
"""
from __future__ import annotations

import argparse
import logging
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[1]
if str(_REPO_ROOT / "src") not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT / "src"))

logger = logging.getLogger("medagent.ingest_rsna")

COMPETITION = "rsna-pneumonia-detection-challenge"
DEFAULT_TARGET = _REPO_ROOT / "data" / "rsna"

# What build_case_index() requires to be present. Named here rather than
# rediscovered later so a partial extraction is caught at ingestion time,
# not hours into an evaluation run.
REQUIRED_FILES = ("stage_2_train_labels.csv", "stage_2_detailed_class_info.csv")
REQUIRED_DIRS = ("stage_2_train_images",)


class IngestionError(Exception):
    """Raised when the dataset cannot be obtained or is not in the shape
    the evaluation harness requires."""


def _require_kaggle_cli() -> str:
    executable = shutil.which("kaggle")
    if executable is None:
        raise IngestionError(
            "The `kaggle` CLI is not on PATH. Install it with `pip install kaggle`, then place "
            "your API token at ~/.kaggle/kaggle.json (Kaggle -> Account -> Create New API Token) "
            "and `chmod 600 ~/.kaggle/kaggle.json`."
        )

    token = Path.home() / ".kaggle" / "kaggle.json"
    if not token.exists():
        raise IngestionError(
            f"Kaggle API token not found at {token}. Create one at Kaggle -> Account -> "
            f"Create New API Token, save it there, and `chmod 600 {token}`."
        )
    return executable


def download(target_dir: Path) -> Path:
    """
    Runs `kaggle competitions download -c rsna-pneumonia-detection-challenge`
    into `target_dir` and returns the downloaded archive path.

    The archive is ~3.7 GB; this takes a while and needs roughly 12 GB
    free once extracted.
    """
    executable = _require_kaggle_cli()
    target_dir.mkdir(parents=True, exist_ok=True)

    logger.info("Downloading %s into %s (this is several GB)...", COMPETITION, target_dir)
    completed = subprocess.run(
        [executable, "competitions", "download", "-c", COMPETITION, "-p", str(target_dir)],
        capture_output=True, text=True,
    )
    if completed.returncode != 0:
        stderr = (completed.stderr or "").strip()
        hint = ""
        if "403" in stderr or "Forbidden" in stderr:
            hint = (
                "\n\nA 403 here almost always means the competition rules have not been accepted "
                "on your Kaggle account rather than a bad token. Open "
                f"https://www.kaggle.com/c/{COMPETITION}/rules, click accept, and retry."
            )
        raise IngestionError(f"Kaggle download failed (exit {completed.returncode}):\n{stderr}{hint}")

    archive = target_dir / f"{COMPETITION}.zip"
    if not archive.exists():
        candidates = sorted(target_dir.glob("*.zip"))
        if not candidates:
            raise IngestionError(f"Download reported success but no .zip appeared in {target_dir}.")
        archive = candidates[0]

    logger.info("Downloaded %s (%.1f GB)", archive.name, archive.stat().st_size / 1e9)
    return archive


def extract(archive: Path, target_dir: Path) -> None:
    """Extracts the competition archive in place. RSNA ships nested zips
    for the image directories in some snapshots, so those are unpacked
    too -- otherwise build_case_index() finds an empty images dir and
    reports every case as missing its DICOM."""
    logger.info("Extracting %s ...", archive.name)
    with zipfile.ZipFile(archive) as zf:
        zf.extractall(target_dir)

    for nested in sorted(target_dir.glob("*.zip")):
        if nested == archive:
            continue
        destination = target_dir / nested.stem
        logger.info("Extracting nested archive %s -> %s", nested.name, destination)
        with zipfile.ZipFile(nested) as zf:
            zf.extractall(destination)

    logger.info("Extraction complete.")


def verify(target_dir: Path) -> dict:
    """
    Confirms `target_dir` has the layout build_case_index() expects and
    returns a small summary. Raises IngestionError listing everything
    missing at once -- discovering the second missing file only after
    fixing the first wastes a multi-gigabyte round trip.
    """
    missing: list[str] = []
    for name in REQUIRED_FILES:
        if not (target_dir / name).is_file():
            missing.append(f"file {name}")
    for name in REQUIRED_DIRS:
        if not (target_dir / name).is_dir():
            missing.append(f"directory {name}/")

    if missing:
        raise IngestionError(
            f"{target_dir} is not a complete RSNA dataset. Missing: {', '.join(missing)}. "
            f"Re-run without --skip-download, or point --target-dir at the right directory."
        )

    images = list((target_dir / "stage_2_train_images").glob("*.dcm"))
    if not images:
        raise IngestionError(
            f"{target_dir / 'stage_2_train_images'} contains no .dcm files -- the archive was "
            f"probably extracted only one level deep. Re-run extraction."
        )

    import csv

    with (target_dir / "stage_2_train_labels.csv").open(newline="", encoding="utf-8") as handle:
        label_rows = list(csv.DictReader(handle))

    expected_columns = {"patientId", "x", "y", "width", "height", "Target"}
    actual_columns = set(label_rows[0].keys()) if label_rows else set()
    if not expected_columns.issubset(actual_columns):
        raise IngestionError(
            f"stage_2_train_labels.csv has unexpected columns {sorted(actual_columns)}; "
            f"expected at least {sorted(expected_columns)}."
        )

    summary = {
        "dicom_files": len(images),
        "label_rows": len(label_rows),
        "unique_patients": len({row["patientId"] for row in label_rows}),
        "positive_rows": sum(1 for row in label_rows if row["Target"] == "1"),
    }
    logger.info(
        "Verified: %(dicom_files)d DICOMs, %(label_rows)d label rows, "
        "%(unique_patients)d unique patients, %(positive_rows)d positive boxes.", summary,
    )
    return summary


def build_split(target_dir: Path, splits_dir: Path, force: bool) -> None:
    """
    Builds the locked 70/15/15 patient-level split over the real data.

    Ratios and seed are passed explicitly rather than relying on
    defaults: this is the protocol of record, and it should be readable
    here without having to go and check what create_locked_split()
    happens to default to.
    """
    from medagent.evaluation.dataset_split import (
        build_case_index,
        create_locked_split,
        format_split_report,
        generate_split_report,
        verify_lock,
    )

    logger.info("Indexing cases from %s ...", target_dir)
    cases = build_case_index(target_dir)
    logger.info("Indexed %d patient-level cases.", len(cases))

    locked = create_locked_split(
        cases,
        output_dir=splits_dir,
        test_size=0.15,
        val_size=0.15,
        seed=42,
        force=force,
    )
    # Re-reads the manifests and re-checks their SHA-256 fingerprints
    # against the lock file, so a split that was corrupted or edited
    # between creation and use fails here rather than silently skewing
    # every metric computed afterwards.
    verify_lock(splits_dir)

    report = generate_split_report(locked)
    counts = report["counts"]
    logger.info(
        "Locked split: train=%d val=%d test=%d | leakage check: %s",
        counts["train"], counts["val"], counts["test"], report["leakage_check"]["status"],
    )

    report_path = Path(splits_dir) / "split_report.md"
    report_path.write_text(format_split_report(report), encoding="utf-8")
    logger.info("Split report -> %s", report_path)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--target-dir", default=str(DEFAULT_TARGET))
    parser.add_argument("--splits-dir", default=str(_REPO_ROOT / "data" / "splits"))
    parser.add_argument("--skip-download", action="store_true",
                        help="Dataset is already downloaded and extracted.")
    parser.add_argument("--skip-split", action="store_true",
                        help="Download and verify only; do not create the locked split.")
    parser.add_argument("--verify-only", action="store_true",
                        help="Only check that an existing dataset has the expected layout.")
    parser.add_argument("--force-resplit", action="store_true",
                        help="Overwrite an existing locked split. Invalidates comparability "
                             "with any metric already reported against the old test set.")
    parser.add_argument("--keep-archive", action="store_true",
                        help="Keep the downloaded .zip (default: delete it after extraction).")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    target_dir = Path(args.target_dir)

    try:
        if args.verify_only:
            verify(target_dir)
            print(f"\nOK: {target_dir} has the expected RSNA layout.")
            return 0

        if not args.skip_download:
            archive = download(target_dir)
            extract(archive, target_dir)
            if not args.keep_archive:
                archive.unlink(missing_ok=True)
                logger.info("Removed archive %s (pass --keep-archive to retain it).", archive.name)

        verify(target_dir)

        if not args.skip_split:
            build_split(target_dir, Path(args.splits_dir), force=args.force_resplit)

    except IngestionError as exc:
        print(f"\nIngestion failed:\n  {exc}\n", file=sys.stderr)
        return 1

    print(
        "\nDone. The evaluation harness reads the locked split from "
        f"{args.splits_dir}; point it at this dataset with RSNA_DATA_DIR "
        f"(see .env.example) or --rsna-dir."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
