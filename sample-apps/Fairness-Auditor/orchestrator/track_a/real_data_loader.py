"""
Fetches the real UCI Adult (Census Income) dataset live over the network.
Real-world data, not synthetic — 1994 U.S. Census microdata, 48,842 records,
including sex, race, age, education, occupation, hours-per-week, and a binary
income label (>$50K / <=$50K). Anonymized — no identifiable individuals.

Licensed CC BY 4.0.
Source: Becker, B. & Kohavi, R. (1996). Adult [Dataset].
        UCI Machine Learning Repository. https://doi.org/10.24432/C5XW20

Cached locally after the first fetch so demo-time reliability does not depend
on UCI's servers or venue wifi.
"""
import os
import pandas as pd
from pathlib import Path

# Resolve cache relative to this file's location — works regardless of cwd.
_HERE = Path(__file__).resolve().parent.parent  # orchestrator/
CACHE_PATH = _HERE / "data" / "adult_income.csv"


def fetch_real_income_data() -> pd.DataFrame:
    """Return the UCI Adult dataset as a DataFrame.

    On the first call, fetches live from archive.ics.uci.edu and caches.
    Subsequent calls return the cached CSV without a network round-trip.
    """
    if CACHE_PATH.exists():
        print(f"[real_data_loader] Loading from cache: {CACHE_PATH}")
        df = pd.read_csv(CACHE_PATH)
        print(f"[real_data_loader] Loaded {len(df)} records from cache.")
        return df

    print("Fetching UCI Adult (Census Income) dataset live from archive.ics.uci.edu...")
    from ucimlrepo import fetch_ucirepo
    adult = fetch_ucirepo(id=2)
    df = pd.concat([adult.data.features, adult.data.targets], axis=1)
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(CACHE_PATH, index=False)
    print(f"Fetched {len(df)} real records live. Cached to {CACHE_PATH}.")
    return df


if __name__ == "__main__":
    df = fetch_real_income_data()
    print(f"\nColumn names: {list(df.columns)}")
    print(f"Income unique values: {df['income'].astype(str).str.strip().unique()}")
    print(f"Sex unique values:    {df['sex'].astype(str).str.strip().unique()}")
    print(f"\nShape: {df.shape}")
