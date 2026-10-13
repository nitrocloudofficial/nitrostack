"""
FORAY — password hashing, shared by api/main.py and demo/seed_profiles.py.

One deterministic function so the seeder can create accounts without
storing plaintext, and the login check can never drift from the seeder.
Salt is derived from the email; good enough for a demo cohort, and it
keeps the seed fully reproducible (rule: reset.sh restores a known-good
state in one command).
"""

from __future__ import annotations

import hashlib

SALT_PREFIX = "foray::"


def hash_password(email: str, password: str) -> str:
    return hashlib.sha256(
        f"{SALT_PREFIX}{email.strip().lower()}::{password}".encode()
    ).hexdigest()
