"""
Unit tests for security/auth.py (Phase 2, item 3: RBAC for the
human_review gate).
"""
from __future__ import annotations

import pytest

from medagent.security.auth import (
    AuthenticationError,
    AuthorizationError,
    UserContext,
    authorize_review_action,
)

RADIOLOGIST = UserContext(user_id="r.chen", role="radiologist")
ADMIN = UserContext(user_id="admin.bob", role="admin")


# ── Identity parsing ────────────────────────────────────────────────

def test_from_payload_accepts_a_well_formed_user():
    user = UserContext.from_payload({"user_id": "r.chen", "role": "radiologist"})
    assert user == RADIOLOGIST


def test_from_payload_strips_surrounding_whitespace_on_user_id():
    assert UserContext.from_payload({"user_id": "  r.chen  ", "role": "radiologist"}).user_id == "r.chen"


@pytest.mark.parametrize(
    "payload",
    [
        None,                                          # resume payload had no user block at all
        "r.chen",                                      # a bare string, not an identity
        {},                                            # empty dict
        {"role": "radiologist"},                       # no user_id
        {"user_id": "r.chen"},                         # no role
        {"user_id": "", "role": "radiologist"},        # blank user_id
        {"user_id": "   ", "role": "radiologist"},     # whitespace-only user_id
        {"user_id": 12345, "role": "radiologist"},     # non-string user_id
        {"user_id": "r.chen", "role": "surgeon"},      # role outside the known set
        {"user_id": "r.chen", "role": None},
    ],
)
def test_from_payload_rejects_malformed_identities(payload):
    with pytest.raises(AuthenticationError):
        UserContext.from_payload(payload)


def test_user_context_is_immutable():
    """A node must not be able to re-label who performed an action
    partway through handling it."""
    with pytest.raises(Exception):
        RADIOLOGIST.user_id = "someone.else"


def test_to_dict_round_trips_through_from_payload():
    assert UserContext.from_payload(RADIOLOGIST.to_dict()) == RADIOLOGIST


# ── The permission matrix ───────────────────────────────────────────

@pytest.mark.parametrize("action", ["approve", "revise", "reject"])
def test_radiologist_may_perform_every_review_action(action):
    authorize_review_action(RADIOLOGIST, action)  # must not raise


@pytest.mark.parametrize("action", ["approve", "revise"])
def test_admin_may_not_approve_or_revise(action):
    """Signing off on a diagnosis is a licensed clinical act -- being
    able to administer the system does not confer it."""
    with pytest.raises(AuthorizationError, match="licensed clinical act"):
        authorize_review_action(ADMIN, action)


def test_admin_may_reject():
    """Rejecting only ever routes a case toward manual radiologist
    workup, so it cannot cause an AI finding to be blessed as truth."""
    authorize_review_action(ADMIN, "reject")  # must not raise


@pytest.mark.parametrize("action", ["delete", "", "APPROVE", "sign_off", None])
def test_unrecognized_actions_are_refused_even_for_a_radiologist(action):
    with pytest.raises(AuthorizationError, match="unrecognized review action"):
        authorize_review_action(RADIOLOGIST, action)
