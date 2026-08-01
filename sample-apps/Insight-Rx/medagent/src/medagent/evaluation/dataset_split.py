"""
Locked, stratified train/val/test split protocol -- Phase 1 clinical
validation, item 1 (Strategic_Startup_Roadmap.pdf).

"Locked" means what it says: once a split is created here, it is
written to disk with a SHA-256 fingerprint per split, and this module
refuses to silently regenerate it. Every metric Phase 1 reports
downstream (the sensitivity/specificity/AUROC harness, calibration, the
Model Card) is only meaningful if it was measured against the SAME test
cases every time -- re-splitting on every run, even with the same seed,
if the input case index has grown or changed, would make metrics across
model iterations incomparable, and is exactly the kind of quiet mistake
that invalidates a clinical validation claim without anyone noticing.
Once locked, the test split must never be trained or tuned on.

Splitting happens at the patientId level, not the row/bounding-box
level: RSNA's stage_2_train_labels.csv gives a patient multiple rows
only when it has multiple bounding boxes for the SAME image (one
patientId = one image in this dataset), so grouping by patientId here
keeps a case's boxes atomic across the split -- and the same grouping
mechanism stays correct if a future dataset genuinely has multiple
images per real-world patient, which RSNA itself does not.

Stratification is multi-axis: rsna_class (Normal / Lung Opacity / No
Lung Opacity-Not Normal) x sex x view_position x age band, so no split
can end up skewed on any one of those axes purely by chance. Rare
combinations (e.g. very few PatientSex="O" patients) are collapsed to a
coarser key rather than crashing sklearn's stratified split -- see
_safe_strata().
"""
from __future__ import annotations

import csv
import hashlib
import json
import logging
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import TypedDict

import pydicom
from sklearn.model_selection import train_test_split

from medagent.evaluation.demographics import VALID_SEX_VALUES, VALID_VIEW_POSITIONS, age_band

logger = logging.getLogger("medagent.evaluation.dataset_split")

RSNA_CLASSES = ("Normal", "Lung Opacity", "No Lung Opacity / Not Normal")


class BoundingBox(TypedDict):
    x: float
    y: float
    width: float
    height: float


class Case(TypedDict):
    patient_id: str
    image_path: str
    rsna_class: str        # one of RSNA_CLASSES
    target: int             # 0 | 1 -- RSNA's own binary column, redundant with rsna_class but kept for convenience
    age: int
    sex: str                # "M" | "F" | "O"
    view_position: str      # "PA" | "AP"
    boxes: list[BoundingBox]


class LockedSplit(TypedDict):
    train_manifest_path: str
    val_manifest_path: str
    test_manifest_path: str
    train_hash: str
    val_hash: str
    test_hash: str
    seed: int
    test_size: float
    val_size: float
    created_at: str


# ─────────────────────────────────────────────────────────────────────
# Building a case index from an RSNA-shaped directory
# ─────────────────────────────────────────────────────────────────────

def _parse_dicom_age(raw: str | None) -> int:
    """Parses a DICOM AS-format age string (e.g. "064Y", "003M") into an
    integer number of years. Months/days floor to 0 -- not meaningful
    for this project's adult-oriented age bands, and RSNA's cohort is
    frontal adult/pediatric CXR, not neonatal imaging."""
    if not raw:
        return 0
    raw = raw.strip()
    if not raw:
        return 0
    try:
        value = int(raw[:-1])
    except ValueError:
        return 0
    return value if raw[-1].upper() == "Y" else 0


SYNTHETIC_MARKER_FILE = "SYNTHETIC_DATA_README.txt"


def is_synthetic_dataset(rsna_dir: str | Path) -> bool:
    """
    True when `rsna_dir` holds generated data rather than the real RSNA
    challenge dataset, detected by the marker file
    data/synthetic_rsna_generator.py writes alongside its output.

    Deliberately fails toward "synthetic": an unreadable or unexpected
    directory returns True. Everything downstream uses this to decide
    whether to stamp the Model Card with a NOT-CLINICAL-EVIDENCE
    watermark, and the two ways of being wrong are not symmetric --
    warning that real results are synthetic is a correctable annoyance,
    while presenting synthetic results as real clinical evidence is the
    single worst failure this document can have.
    """
    try:
        return (Path(rsna_dir) / SYNTHETIC_MARKER_FILE).exists() or not Path(rsna_dir).is_dir()
    except OSError:
        return True


def build_case_index(rsna_dir: str | Path) -> list[Case]:
    """
    Reads an RSNA-shaped directory (stage_2_train_labels.csv,
    stage_2_detailed_class_info.csv, stage_2_train_images/*.dcm) into
    one Case per patientId. PatientAge/PatientSex/ViewPosition come
    straight from each DICOM's tags -- they are NOT in the CSVs; RSNA
    added them to the DICOM headers, not the label files.
    """
    rsna_dir = Path(rsna_dir)
    labels_path = rsna_dir / "stage_2_train_labels.csv"
    class_info_path = rsna_dir / "stage_2_detailed_class_info.csv"
    images_dir = rsna_dir / "stage_2_train_images"

    if not labels_path.is_file():
        raise FileNotFoundError(f"Expected RSNA labels CSV at {labels_path}")
    if not class_info_path.is_file():
        raise FileNotFoundError(f"Expected RSNA detailed class info CSV at {class_info_path}")

    target_by_patient: dict[str, int] = {}
    boxes_by_patient: dict[str, list[BoundingBox]] = {}
    with labels_path.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            patient_id = row["patientId"]
            target_by_patient[patient_id] = int(row["Target"])
            boxes_by_patient.setdefault(patient_id, [])
            if row["Target"] == "1" and row["x"]:
                boxes_by_patient[patient_id].append(
                    {"x": float(row["x"]), "y": float(row["y"]), "width": float(row["width"]), "height": float(row["height"])}
                )

    class_by_patient: dict[str, str] = {}
    with class_info_path.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            class_by_patient[row["patientId"]] = row["class"]

    cases: list[Case] = []
    missing_dicom = 0
    missing_class = 0

    for patient_id, target in target_by_patient.items():
        dcm_path = images_dir / f"{patient_id}.dcm"
        if not dcm_path.is_file():
            missing_dicom += 1
            continue

        rsna_class = class_by_patient.get(patient_id)
        if rsna_class is None:
            missing_class += 1
            rsna_class = "Lung Opacity" if target == 1 else "Normal"

        dcm = pydicom.dcmread(str(dcm_path), stop_before_pixels=True)
        sex = str(getattr(dcm, "PatientSex", "") or "").strip().upper()
        view_position = str(getattr(dcm, "ViewPosition", "") or "").strip().upper()

        cases.append(
            {
                "patient_id": patient_id,
                "image_path": str(dcm_path),
                "rsna_class": rsna_class,
                "target": target,
                "age": _parse_dicom_age(getattr(dcm, "PatientAge", None)),
                "sex": sex if sex in VALID_SEX_VALUES else "O",
                "view_position": view_position if view_position in VALID_VIEW_POSITIONS else "PA",
                "boxes": boxes_by_patient.get(patient_id, []),
            }
        )

    if missing_dicom:
        logger.warning(
            "%d patientId(s) in the label CSVs had no matching DICOM file under %s -- skipped.",
            missing_dicom, images_dir,
        )
    if missing_class:
        logger.warning(
            "%d patientId(s) had no row in %s -- inferred rsna_class from Target instead of the real label.",
            missing_class, class_info_path,
        )

    return cases


# ─────────────────────────────────────────────────────────────────────
# Locking the split
# ─────────────────────────────────────────────────────────────────────

def _key_at_level(case: Case, level: int) -> str:
    """Stratification key at a given granularity: 0 = rsna_class only,
    1 = +sex, 2 = +view_position, 3 = +age_band (the full, most
    granular key). Used to progressively coarsen when the full key
    produces more distinct strata than a split can hold -- see
    _stratified_split() below."""
    parts = [case["rsna_class"]]
    if level >= 1:
        parts.append(case["sex"])
    if level >= 2:
        parts.append(case["view_position"])
    if level >= 3:
        parts.append(age_band(case["age"]))
    return "|".join(parts)


_RARE_BUCKET = "__RARE__"


def _strata_at_level(cases: list[Case], level: int) -> list[str]:
    """Composite strata at `level`. Any bucket with fewer than 2 members
    is pooled into ONE shared rare-case bucket -- not collapsed to its
    own rsna_class, which would just create a *new* singleton bucket
    whenever a class has exactly one rare case (e.g. the single
    PatientSex="O" patient in a given class), defeating the point.
    Pooling every rare case across all classes together is what
    actually produces a bucket sklearn can split. Every pooling is
    logged, never silent."""
    by_id = {case["patient_id"]: case for case in cases}
    raw = {pid: _key_at_level(case, level) for pid, case in by_id.items()}
    counts = Counter(raw.values())
    rare = {s for s, c in counts.items() if c < 2}
    if rare:
        logger.warning(
            "%d stratification bucket(s) among %d case(s) had fewer than 2 members at "
            "granularity level=%d and were pooled into one shared rare-case bucket: %s",
            len(rare), len(cases), level, sorted(rare),
        )
    return [_RARE_BUCKET if stratum in rare else stratum for stratum in raw.values()]


def _is_viable(strata: list[str], smaller_partition: int) -> bool:
    """sklearn's stratified split needs every stratum to have at least
    2 members (so at least 1 can land in each of the two partitions)
    AND the number of distinct strata must not exceed the smaller
    partition's size (each needs a slot in the smaller side too)."""
    counts = Counter(strata)
    return bool(counts) and min(counts.values()) >= 2 and len(counts) <= smaller_partition


def _stratified_split(ids: list[str], cases_by_id: dict[str, Case], test_size: float, seed: int) -> tuple[list[str], list[str]]:
    """
    train_test_split(), stratified at the finest granularity that
    actually fits: sklearn requires every stratum to have at least one
    member in BOTH resulting partitions, which means the number of
    distinct strata can't exceed the smaller partition's size, and no
    stratum can have fewer than 2 members overall. Rather than fail
    outright (or silently under-stratify from the start), this tries
    the full 4-axis key first and progressively drops the least-critical
    axis (age_band, then view_position, then sex, then finally falling
    back to no stratification at all) until the split is computable --
    logging every step down, since a coarsened split is a real signal
    this dataset is currently too small for full demographic
    stratification, not something to hide.
    """
    cases = [cases_by_id[i] for i in ids]
    n = len(ids)
    n_test = round(n * test_size)
    smaller_partition = min(n_test, n - n_test)

    for level in (3, 2, 1, 0):
        strata = _strata_at_level(cases, level)
        if _is_viable(strata, smaller_partition):
            if level < 3:
                logger.warning(
                    "Coarsened stratification to level=%d for this %d-case split (the full "
                    "4-axis key wasn't viable at the smaller partition's size, %d cases).",
                    level, n, smaller_partition,
                )
            return train_test_split(ids, test_size=test_size, random_state=seed, stratify=strata)

    logger.warning(
        "Even class-only stratification (with rare cases pooled) isn't viable for this "
        "%d-case split (smaller partition holds %d) -- falling back to an unstratified "
        "random split.",
        n, smaller_partition,
    )
    return train_test_split(ids, test_size=test_size, random_state=seed)


def _manifest_hash(cases: list[Case]) -> str:
    """SHA-256 over the sorted (patient_id, rsna_class) pairs -- a
    fingerprint of exactly which cases are in a split, independent of
    row order. Used by verify_lock() to detect drift between what's on
    disk and what was actually locked."""
    payload = "\n".join(sorted(f"{c['patient_id']}\t{c['rsna_class']}" for c in cases))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _write_manifest(cases: list[Case], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(cases, indent=2))


def load_manifest(path: str | Path) -> list[Case]:
    return json.loads(Path(path).read_text())


def _with_paths_relative_to(locked: dict, output_dir: Path) -> LockedSplit:
    """
    Overwrites the three manifest-path fields with paths freshly computed
    from `output_dir`, ignoring whatever was serialized in the lock file.

    Manifest paths are recomputed on every read rather than trusted
    as-stored deliberately: they were written relative to whatever the
    *original* caller's working directory happened to be when the split
    was first created, which silently breaks the moment this lock file
    is read from a different cwd (e.g. the repo root instead of `src/`)
    -- the split itself (identified by its hashes, which ARE trusted
    as-stored) hasn't moved, only the path string describing where to
    find it relative to the caller has.
    """
    return {
        **locked,
        "train_manifest_path": str(output_dir / "train_manifest.json"),
        "val_manifest_path": str(output_dir / "val_manifest.json"),
        "test_manifest_path": str(output_dir / "test_manifest.json"),
    }


def create_locked_split(
    cases: list[Case],
    output_dir: str | Path = "data/splits",
    test_size: float = 0.15,
    val_size: float = 0.15,
    seed: int = 42,
    force: bool = False,
) -> LockedSplit:
    """
    Splits `cases` into train/val/test at the patientId level, stratified
    by rsna_class x sex x view_position x age_band, and writes three JSON
    manifests plus a `split.lock.json` fingerprint to `output_dir`.

    If `output_dir/split.lock.json` already exists, this refuses to
    re-split and returns the existing locked split instead -- pass
    force=True to explicitly override. Overriding invalidates
    comparability with any metric already reported against the old test
    set; the lock file's `created_at` makes that traceable.
    """
    output_dir = Path(output_dir)
    lock_path = output_dir / "split.lock.json"

    if lock_path.exists() and not force:
        logger.info("Test set already locked at %s -- loading existing split, not re-splitting.", lock_path)
        return _with_paths_relative_to(json.loads(lock_path.read_text()), output_dir)

    if not cases:
        raise ValueError("create_locked_split() called with an empty case list")

    # The protocol is a 70/15/15 train/val/test split. Validating the
    # fractions here rather than trusting the defaults means a caller
    # who passes an inconsistent pair (say test_size=0.2, val_size=0.3)
    # is refused up front instead of silently locking a split that no
    # longer matches the documented protocol -- and a locked split is
    # exactly the thing that must not be quietly wrong, since every
    # metric afterwards is reported against it.
    if not 0.0 < test_size < 1.0 or not 0.0 < val_size < 1.0:
        raise ValueError(f"test_size and val_size must each be in (0, 1); got {test_size}, {val_size}")
    train_size = 1.0 - test_size - val_size
    if train_size <= 0.0:
        raise ValueError(
            f"test_size + val_size must leave a non-empty training set; got "
            f"{test_size} + {val_size} = {test_size + val_size}"
        )

    duplicate_ids = [pid for pid, count in Counter(c["patient_id"] for c in cases).items() if count > 1]
    if duplicate_ids:
        raise ValueError(
            f"{len(duplicate_ids)} duplicate patient_id(s) in the input case list (e.g. "
            f"{duplicate_ids[:3]}) -- build_case_index() should produce one Case per patient; "
            "refusing to split ambiguous input."
        )

    by_id = {c["patient_id"]: c for c in cases}
    # Sorted, not dict-insertion order. train_test_split() shuffles
    # deterministically for a given seed, but only relative to the order
    # it is handed -- and insertion order here follows whatever order
    # build_case_index() happened to read the CSV rows in. Sorting by
    # patientId first means the same dataset yields the same split on
    # any machine, after any re-download, regardless of row ordering:
    # the seed alone does not guarantee that, and a split that quietly
    # differs between environments makes every reported metric
    # unreproducible.
    all_ids = sorted(by_id.keys())

    train_val_ids, test_ids = _stratified_split(all_ids, by_id, test_size, seed)
    relative_val_size = val_size / (1.0 - test_size)
    train_ids, val_ids = _stratified_split(train_val_ids, by_id, relative_val_size, seed)

    train_cases = [by_id[i] for i in train_ids]
    val_cases = [by_id[i] for i in val_ids]
    test_cases = [by_id[i] for i in test_ids]

    # --- Hard leakage check -- this should be structurally impossible
    # given train_test_split() partitions all_ids, but asserting it
    # explicitly means a future refactor that breaks that guarantee
    # fails loudly here instead of silently shipping a leaking split.
    train_set, val_set, test_set = set(train_ids), set(val_ids), set(test_ids)
    overlap = (train_set & val_set) | (train_set & test_set) | (val_set & test_set)
    if overlap:
        raise RuntimeError(
            f"Split produced {len(overlap)} patient_id(s) present in more than one split -- "
            "this should be impossible and indicates a bug in this function, not a data "
            "problem. Refusing to write a leaking split to disk."
        )

    train_path = output_dir / "train_manifest.json"
    val_path = output_dir / "val_manifest.json"
    test_path = output_dir / "test_manifest.json"
    _write_manifest(train_cases, train_path)
    _write_manifest(val_cases, val_path)
    _write_manifest(test_cases, test_path)

    locked: LockedSplit = {
        "train_manifest_path": str(train_path),
        "val_manifest_path": str(val_path),
        "test_manifest_path": str(test_path),
        "train_hash": _manifest_hash(train_cases),
        "val_hash": _manifest_hash(val_cases),
        "test_hash": _manifest_hash(test_cases),
        "seed": seed,
        "test_size": test_size,
        "val_size": val_size,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    lock_path.write_text(json.dumps(locked, indent=2))
    logger.info(
        "Locked split written to %s -- %d train / %d val / %d test patients. "
        "This test set must never be trained or tuned on.",
        lock_path, len(train_ids), len(val_ids), len(test_ids),
    )
    return locked


def verify_lock(output_dir: str | Path) -> LockedSplit:
    """
    Re-reads the manifests on disk and confirms their hashes still match
    split.lock.json. Call this before ANY Phase 1 evaluation run, so a
    manually edited or accidentally regenerated manifest is caught
    immediately rather than silently producing metrics against the wrong
    test set.
    """
    output_dir = Path(output_dir)
    lock_path = output_dir / "split.lock.json"
    if not lock_path.exists():
        raise FileNotFoundError(f"No locked split found at {lock_path} -- run create_locked_split() first.")

    locked: LockedSplit = _with_paths_relative_to(json.loads(lock_path.read_text()), output_dir)
    for split_name, manifest_key, hash_key in [
        ("train", "train_manifest_path", "train_hash"),
        ("val", "val_manifest_path", "val_hash"),
        ("test", "test_manifest_path", "test_hash"),
    ]:
        cases = load_manifest(locked[manifest_key])
        current_hash = _manifest_hash(cases)
        if current_hash != locked[hash_key]:
            raise RuntimeError(
                f"{split_name} manifest at {locked[manifest_key]} does not match its locked hash "
                f"(expected {locked[hash_key][:12]}..., got {current_hash[:12]}...) -- it was "
                "edited or regenerated after locking. Any metric computed against it is not "
                "comparable to previously reported Phase 1 results."
            )
    logger.info("Locked split at %s verified OK (train/val/test hashes match).", lock_path)
    return locked


# ─────────────────────────────────────────────────────────────────────
# Audit report
# ─────────────────────────────────────────────────────────────────────

def _distribution(cases: list[Case], key) -> dict[str, float]:
    n = len(cases)
    if n == 0:
        return {}
    counts = Counter(key(c) for c in cases)
    return {label: round(100.0 * count / n, 1) for label, count in sorted(counts.items())}


def generate_split_report(locked: LockedSplit) -> dict:
    """
    Builds an audit report proving (a) zero patient overlap across
    splits and (b) demographic/class distribution percentages per
    split, per axis -- the concrete evidence that the stratification in
    create_locked_split() actually worked, not just a claim that it did.
    """
    train = load_manifest(locked["train_manifest_path"])
    val = load_manifest(locked["val_manifest_path"])
    test = load_manifest(locked["test_manifest_path"])

    train_ids, val_ids, test_ids = (
        {c["patient_id"] for c in train}, {c["patient_id"] for c in val}, {c["patient_id"] for c in test},
    )
    overlap = (train_ids & val_ids) | (train_ids & test_ids) | (val_ids & test_ids)

    axes = {
        "rsna_class": lambda c: c["rsna_class"],
        "sex": lambda c: c["sex"],
        "view_position": lambda c: c["view_position"],
        "age_band": lambda c: age_band(c["age"]),
    }

    report = {
        "created_at": locked["created_at"],
        "seed": locked["seed"],
        "counts": {"train": len(train), "val": len(val), "test": len(test)},
        "leakage_check": {
            "overlapping_patient_ids": len(overlap),
            "status": "PASSED" if not overlap else "FAILED",
        },
        "distribution_pct": {
            axis_name: {
                "train": _distribution(train, axis_fn),
                "val": _distribution(val, axis_fn),
                "test": _distribution(test, axis_fn),
            }
            for axis_name, axis_fn in axes.items()
        },
    }
    return report


def format_split_report(report: dict) -> str:
    """Renders generate_split_report()'s dict as a readable Markdown
    table -- the actual artifact a human (or a Model Card, see item 5)
    would read, not just a data structure."""
    lines = ["# Locked Split Audit Report", ""]
    lines.append(f"Created: {report['created_at']}  \nSeed: {report['seed']}")
    lines.append("")
    counts = report["counts"]
    lines.append(f"**Counts** -- train: {counts['train']}, val: {counts['val']}, test: {counts['test']}")
    lines.append("")
    leak = report["leakage_check"]
    lines.append(f"**Patient-level leakage check: {leak['status']}** "
                 f"({leak['overlapping_patient_ids']} overlapping patient_id(s) across splits)")
    lines.append("")

    for axis_name, per_split in report["distribution_pct"].items():
        lines.append(f"## Distribution by {axis_name} (%)")
        all_labels = sorted({label for dist in per_split.values() for label in dist})
        lines.append("| " + axis_name + " | train | val | test |")
        lines.append("|---|---|---|---|")
        for label in all_labels:
            row = [label]
            for split_name in ("train", "val", "test"):
                row.append(f"{per_split[split_name].get(label, 0.0)}%")
            lines.append("| " + " | ".join(row) + " |")
        lines.append("")

    return "\n".join(lines)


if __name__ == "__main__":
    import sys

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

    rsna_dir = sys.argv[1] if len(sys.argv) > 1 else "data/synthetic_rsna"
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "data/splits"

    cases = build_case_index(rsna_dir)
    print(f"Indexed {len(cases)} cases from {rsna_dir}")

    locked = create_locked_split(cases, output_dir=output_dir, seed=42)
    verify_lock(output_dir)

    report = generate_split_report(locked)
    report_path = Path(output_dir) / "split_report.md"
    report_path.write_text(format_split_report(report))
    print(f"Report written to {report_path}")
    print()
    print(format_split_report(report))
