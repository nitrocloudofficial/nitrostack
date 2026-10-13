"""
Validates the AFO statistical engine (dir.py + fisher_bh.py) against the
real UCI Adult (Census Income) dataset.

This is a genuine, external validation — the gender income gap in this dataset
is one of the most-replicated findings in the fairness ML literature.
If our DIR and Fisher's p-value agree with published results, that proves our
pipeline is computing correctly, independently of any internal fixture we wrote.

Source: Becker, B. & Kohavi, R. (1996). Adult [Dataset].
        UCI Machine Learning Repository. https://doi.org/10.24432/C5XW20
"""
import sys
import os
from pathlib import Path

# Allow running from project root or scripts/ directory
REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "orchestrator"))

from track_a.real_data_loader import fetch_real_income_data
from stats.dir import compute_dir
from stats.fisher_bh import fisher_test, correct_pvalues

def main():
    df = fetch_real_income_data()

    # Strip whitespace from all string columns (UCI CSVs can have leading spaces)
    df.columns = [c.strip() for c in df.columns]

    # Print raw values first — verify the trailing-period quirk
    print("\n=== COLUMN VERIFICATION ===")
    print(f"Columns: {list(df.columns)}")
    print(f"income unique values (raw): {df['income'].astype(str).str.strip().unique().tolist()}")
    print(f"sex    unique values (raw): {df['sex'].astype(str).str.strip().unique().tolist()}")

    # Normalise income labels: strip whitespace AND trailing period
    # The Adult dataset concatenates train + test splits; train uses ">50K"
    # while test uses ">50K." — both splits are present in the fetched data.
    income_col = df["income"].astype(str).str.strip().str.rstrip(".")

    male_mask   = df["sex"].astype(str).str.strip() == "Male"
    female_mask = df["sex"].astype(str).str.strip() == "Female"

    male_income   = income_col[male_mask]
    female_income = income_col[female_mask]

    male_total    = int(male_mask.sum())
    female_total  = int(female_mask.sum())
    male_positive = int((male_income == ">50K").sum())
    female_positive = int((female_income == ">50K").sum())
    male_denied   = male_total   - male_positive
    female_denied = female_total - female_positive

    male_rate   = male_positive   / male_total
    female_rate = female_positive / female_total

    dir_value = compute_dir(
        unprivileged_approval_rate=female_rate,   # female is the unprivileged group
        privileged_approval_rate=male_rate,
    )

    # Fisher's exact test — note argument order: (priv_approved, priv_denied, unpriv_approved, unpriv_denied)
    _, p_value = fisher_test(
        privileged_approved=male_positive,
        privileged_denied=male_denied,
        unprivileged_approved=female_positive,
        unprivileged_denied=female_denied,
    )

    reject, adjusted = correct_pvalues([p_value])

    print("\n=== REAL DATA VALIDATION — UCI Adult Income Census ===")
    print(f"Total records:         {len(df):,}")
    print(f"Male  total:           {male_total:,}")
    print(f"Female total:          {female_total:,}")
    print()
    print(f"Male   >$50k:          {male_positive:,}  ({male_rate:.1%})")
    print(f"Female >$50k:          {female_positive:,}  ({female_rate:.1%})")
    print()
    print(f"Disparate Impact Ratio (DIR): {dir_value:.4f}  (four-fifths threshold: 0.80)")
    print(f"Fisher's exact p-value:       {p_value:.2e}")
    print(f"BH-FDR adjusted p-value:      {adjusted[0]:.2e}")
    print(f"Statistically significant:    {bool(reject[0])}")
    print()
    if dir_value < 0.80:
        print("[PASS] DIR < 0.80 -- adverse impact detected, consistent with published literature")
    else:
        print("[WARN] DIR >= 0.80 -- no adverse impact detected (unexpected -- check data/logic)")

    if bool(reject[0]):
        print("[PASS] BH-corrected p < 0.05 -- finding is statistically significant")
    else:
        print("[WARN] BH-corrected p >= 0.05 -- not statistically significant (unexpected)")

    print()
    print("Source: Becker, B. & Kohavi, R. (1996). Adult [Dataset].")
    print("        UCI Machine Learning Repository. https://doi.org/10.24432/C5XW20")

    # Return structured dict so this can be imported by the API route
    return {
        "total_records": len(df),
        "male_total": male_total,
        "female_total": female_total,
        "male_positive": male_positive,
        "female_positive": female_positive,
        "male_rate": male_rate,
        "female_rate": female_rate,
        "dir_value": dir_value,
        "p_value": p_value,
        "adjusted_p": adjusted[0],
        "significant": bool(reject[0]),
    }


if __name__ == "__main__":
    main()
