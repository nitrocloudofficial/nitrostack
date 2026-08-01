"""
Role-based access control for the human-in-the-loop review gate --
Phase 2, item 3 (Strategic_Startup_Roadmap.pdf: "Role-Based
Authentication & Audit Logging").

The graph's human_review interrupt is the single point where a person
takes clinical responsibility for an AI-drafted report (PRD 1's
Human-in-the-Loop paradigm). Before this module existed, ANY caller who
could reach the resume path could approve a diagnosis -- the payload was
just {"action": "approve"} with no notion of who was acting. This module
supplies that missing identity, and the rule about who may do what with
it.

The core asymmetry here is deliberate and clinical, not administrative:

  - Approving or revising a report means signing off on a diagnosis.
    That is a licensed clinical act, so only a `radiologist` may do it.
  - Rejecting a report only ever routes a case AWAY from automation and
    toward a manual radiologist workup. It cannot cause an AI-generated
    finding to be blessed as clinical truth, so an `admin` (an
    operational/compliance role, not a licensed clinician) may also do
    it.

In other words the permission model fails safe in the same direction the
rest of this pipeline does: the action that can only ever reduce
automated trust is the permissive one. An `admin` is emphatically NOT a
clinical super-user -- being able to administer the system does not make
someone qualified to sign a radiology report.

This module deliberately does NOT authenticate (verify a password,
validate a JWT, check a session). It authorizes an already-established
identity. Wiring a real identity provider in front of it -- so the
`user_id`/`role` reaching resume_case() are attested rather than
self-asserted -- is a Phase 3 deployment concern; see
docs/architecture.md. Until then, treat these roles as trusted input
from the surrounding deployment, not as a security boundary against a
malicious caller.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Literal, get_args

logger = logging.getLogger("medagent.security.auth")

Role = Literal["radiologist", "admin"]
VALID_ROLES: frozenset[str] = frozenset(get_args(Role))

ReviewAction = Literal["approve", "revise", "reject"]
VALID_REVIEW_ACTIONS: frozenset[str] = frozenset(get_args(ReviewAction))

# Which roles may perform which human_review actions. See this module's
# docstring for why `admin` can reject but cannot approve or revise.
_ROLE_PERMISSIONS: dict[str, frozenset[str]] = {
    "radiologist": frozenset({"approve", "revise", "reject"}),
    "admin": frozenset({"reject"}),
}


class AuthenticationError(Exception):
    """Raised when a caller's identity is missing or malformed -- "who
    are you?" failed, before any question of permissions arises."""


class AuthorizationError(Exception):
    """Raised when a valid, known user attempts an action their role
    does not permit -- "who are you?" succeeded, "may you do this?" did
    not.

    Callers MUST NOT catch this and fall through to performing the
    action anyway. It propagates out of graph.invoke() and leaves the
    case paused at human_review, still awaiting a properly authorized
    reviewer -- an unauthorized attempt must never advance OR destroy a
    case (see human_review_node in agents/orchestrator.py)."""


@dataclass(frozen=True)
class UserContext:
    """An identified actor. Frozen so a node can't quietly re-label who
    performed an action partway through handling it."""

    user_id: str
    role: Role

    @classmethod
    def from_payload(cls, payload: object) -> "UserContext":
        """
        Parses and validates the `user` block of a human_review resume
        payload (see human_review_node's docstring for the full shape).

        The resume payload crosses a checkpointer boundary as plain
        JSON, so this arrives as an untyped dict and every field has to
        be checked rather than trusted. Raises AuthenticationError --
        never returns a partially-valid user -- if anything is missing,
        blank, or not a recognized role.
        """
        if not isinstance(payload, dict):
            raise AuthenticationError(
                f"Expected a user identity dict on the resume payload, got {type(payload).__name__}. "
                f"Resuming a case from human_review requires an authenticated user."
            )

        user_id = payload.get("user_id")
        role = payload.get("role")

        if not isinstance(user_id, str) or not user_id.strip():
            raise AuthenticationError("Resume payload's user.user_id is missing or empty.")
        if role not in VALID_ROLES:
            raise AuthenticationError(
                f"Resume payload's user.role is {role!r}, which is not a recognized role "
                f"({sorted(VALID_ROLES)})."
            )

        return cls(user_id=user_id.strip(), role=role)

    def to_dict(self) -> dict[str, str]:
        return {"user_id": self.user_id, "role": self.role}


def describe_permission_matrix() -> dict[str, list[str]]:
    """
    The RBAC matrix as plain data: {role: [permitted actions]}.

    Exists so scripts/generate_compliance_manifest.py can publish the
    matrix that is actually enforced rather than a hand-maintained copy
    of it. A permission table transcribed into a regulatory document is
    a table that silently goes stale the first time the code changes --
    and in a compliance export, a stale control description is worse
    than none, because it will be relied on.
    """
    return {role: sorted(actions) for role, actions in sorted(_ROLE_PERMISSIONS.items())}


def authorize_review_action(user: UserContext, action: str) -> None:
    """
    Enforces the RBAC matrix for one human_review action. Returns None
    when permitted; raises AuthorizationError when not.

    An unrecognized action is refused rather than ignored: human_review_node
    treats any unknown action as a rejection (fail safe to a manual
    workup), but it should never reach that fallback carrying an
    authorization decision this function silently declined to make.
    """
    if action not in VALID_REVIEW_ACTIONS:
        raise AuthorizationError(
            f"User {user.user_id!r} attempted unrecognized review action {action!r} "
            f"(expected one of {sorted(VALID_REVIEW_ACTIONS)})."
        )

    permitted = _ROLE_PERMISSIONS.get(user.role, frozenset())
    if action not in permitted:
        raise AuthorizationError(
            f"Role {user.role!r} (user {user.user_id!r}) is not permitted to {action!r} a clinical "
            f"report. Approving or revising a diagnosis is a licensed clinical act restricted to "
            f"role 'radiologist'; {user.role!r} may only {sorted(permitted) or 'perform no review actions'}."
        )

    logger.info("Authorized user=%s role=%s for review action=%s", user.user_id, user.role, action)
