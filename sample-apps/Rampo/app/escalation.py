"""In-memory session signal store + escalation risk predictor.

This is the kernel of the MCP tool `predict_escalation_risk(session_id)` that the
support agent would call. In the PoC it lives in FastAPI; in the full product it
would be exposed over MCP.
"""
from __future__ import annotations

import time
from collections import defaultdict
from threading import Lock
from typing import Any

# Weighted signal model. Each signal contributes points to the risk score.
# Tuned for a hackathon demo; real weights would come from PostHog funnel data.
SIGNAL_WEIGHTS: dict[str, float] = {
    "rage_click": 18.0,
    "failed_form": 15.0,
    "nav_back_forth": 10.0,
    "funnel_dropoff": 12.0,
    "repeated_visit": 8.0,
    "long_dwell_no_action": 6.0,
    "help_search": 9.0,
}

# Per-signal decay: only count the most recent N occurrences.
SIGNAL_CAP: dict[str, int] = {
    "rage_click": 5,
    "failed_form": 4,
    "nav_back_forth": 6,
    "funnel_dropoff": 2,
    "repeated_visit": 3,
    "long_dwell_no_action": 2,
    "help_search": 3,
}

RISK_THRESHOLD = 45.0  # above this -> proactive nudge
HIGH_RISK_THRESHOLD = 70.0

# Contextual nudges keyed by the funnel step the user appears stuck on.
# The client tracker sends `funnel_step` as one of:
#   - "<flow>"             (e.g. "swift_wire") — flow-level default
#   - "<flow>#<button>"    (e.g. "swift_wire#validate_swift") — per-button
# Lookup: exact funnel_step -> "<flow>" prefix -> "default".
NUDGES: dict[str, str] = {
    # ---- legacy NitraBank keys (still honored) ---------------------------
    "imps_transfer": (
        "It looks like you're having trouble with the IMPS transfer — "
        "the beneficiary name may not match the bank records. "
        "Would you like to verify the beneficiary name?"
    ),
    "beneficiary_add": (
        "Adding a beneficiary can take up to 30 min to activate. "
        "Want to check its activation status?"
    ),
    "balance_check": (
        "Can't see your balance? Your session may have expired — "
        "a quick re-login usually fixes it."
    ),
    "statement_download": (
        "Statement export is taking longer than usual. "
        "We can email it to you instead — want to switch?"
    ),
    "login": (
        "Looks like repeated login failures. Did you forget your password? "
        "We can start a secure reset."
    ),
    # ---- flow-level defaults for Rashtriya Bank of India -----------------
    "swift_wire": (
        "You seem stuck on the SWIFT international transfer. "
        "SWIFT/BIC codes are 8 or 11 alphanumeric characters (e.g. CITIUS33). "
        "Tip: try CITIUS33 / BARCGB22 / DEUTDEDB for the demo. Want me to walk you through it?"
    ),
    "domestic_transfer": (
        "Stuck on a NEFT/IMPS transfer? Your daily IMPS limit is \u20b92,00,000 — "
        "use NEFT/RTGS for higher amounts. Double-check the IFSC (format: RBIN0nnnnnn)."
    ),
    "deposit_open": (
        "Opening a deposit? Min amount is \u20b91,000 for FD / \u20b9100 for RD. "
        "Senior citizens get +0.50% p.a. — tick the box if eligible."
    ),
    "withdraw": (
        "Fund withdrawal taking a while? Confirm that your registered mobile number "
        "is reachable for the OTP. Daily NetBanking withdraw limit is \u20b95,00,000."
    ),
    "credit_score": (
        "On the Credit Score enquiry: scores refresh monthly. "
        "Pay existing EMIs on time & keep credit utilisation under 30% for a steady improvement."
    ),
    "loan_emi": (
        "Looks like you're stuck in the Loans tab — EMI for your Home Loan "
        "(A/c HL/2022/00541127) is due 05-Aug. Pay before the due date to avoid \u20b9500/day late fee."
    ),
    "card_manage": (
        "In the Cards section: to block a lost card instantly, call our 24x7 helpline "
        "1800-200-RBI or use the 'Hotlist Card' link. A reissue takes ~5 working days."
    ),
    "login_fail": (
        "Repeated login failures detected. Your CIF is the 11-digit number printed on "
        "your passbook. Forgot password? Use 'Forgot Login Password' on the login page."
    ),
    "branch_locator": (
        "Locating a branch? Our Connaught Place (RBIN0001234) and Karol Bagh "
        "(RBIN0001456) branches open Mon\u2013Sat, 10:00\u201316:00."
    ),
    "home": (
        "Exploring the home page? Use the mega-menu 'Loans' or 'Cards' drop-downs to "
        "jump straight to a service. Login via 'Net Banking Login' for transactions."
    ),
    "default": (
        "It looks like you're stuck. A support agent who can see your session "
        "context is ready to help — would you like to connect?"
    ),
    # ---- per-button nudges for SWIFT (most-likely stuck button) ----------
    "swift_wire#validate_swift": (
        "SWIFT validate keeps failing: SWIFT/BIC codes must be 8 or 11 chars "
        "(letters/digits only). Try CITIUS33 (Citibank NY) or BARCGB22 (Barclays UK)."
    ),
    "swift_wire#review": (
        "Check the recipient name & IBAN match exactly. "
        "Charges type 'SHA' means sender pays your bank's fee, beneficiary pays the rest."
    ),
    "swift_wire#otp": (
        "OTP not arriving? OTP for SWIFT transfers go to your registered mobile + email. "
        "Resend takes ~30s; you have 3 attempts before a 15-min lockout."
    ),
    # ---- per-button nudges for domestic wire ----------------------------
    "domestic_transfer#beneficiary_ifsc": (
        "IFSC format is 4 letters (RBI branch code 'RBIN') + 0 + 6 digits — "
        "e.g. RBIN0001234. Find it printed on your cheque book or via 'Locate Us'."
    ),
    "domestic_transfer#submit_review": (
        "Transfer review failing? Check that amount + charges stay under your "
        "available balance (\u20b97,08,457 available across your accounts)."
    ),
    # ---- per-button nudges for deposit ----------------------------------
    "deposit_open#amount": (
        "Deposit amount must be \u2265 \u20b91,000 (FD) or \u2265 \u20b9100 (RD). "
        "Tenure 7 days \u2013 10 years; premature closure costs 1% penalty."
    ),
    "deposit_open#confirm": (
        "Confirm step showing an error? Check your nomination status. "
        "On unwitnessed nominee forms, a deposit review can bounce \u2014 add or skip in the form."
    ),
    # ---- per-button nudges for loan -------------------------------------
    "loan_emi#pay": (
        "EMI payment button stuck? The due amount + \u20b9500 aggregator fee "
        "is auto-debited on 05-Aug. Use another account if balance is low."
    ),
    "loan_emi#enquiry": (
        "Loan enquiry pulling slow? Statement refresh happens at end-of-day. "
        "Try 'Last 5 transactions' for a faster snapshot."
    ),
    # ---- per-button nudges for cards ------------------------------------
    "card_manage#hotlist": (
        "Hotlisting a card? Once confirmed, debit is reversed in 1\u20133 working days. "
        "Keep your card ID handy (\u20b9 RBL-XXXX printed on the front)."
    ),
    "card_manage#limit_set": (
        "Setting card limits: minimum daily limit is \u20b91,000; max per-card \u20b93,00,000. "
        "International usage must be toggled separately in the same step."
    ),
    # ---- per-button nudges for credit score -----------------------------
    "credit_score#refresh": (
        "Credit-score refresh hitting slow? Pull the latest CIBIL pull once per 30 days. "
        "Soft pulls don't impact your score, so refresh freely."
    ),
    "credit_score#dispute": (
        "Found an error in your credit report? Raise a dispute at cibil.com or via "
        "\u2018Dispute\u2019; we forward free of charge for RBI-banked accounts."
    ),
    # ---- login -----------------------------------------------------------
    "login_fail#submit": (
        "Login submit blocked. Use your 11-digit CIF as user ID; default demo password "
        "is Demo@12345. After 3 wrong tries your account locks for 30 min."
    ),
}


def resolve_nudge(step: str) -> str:
    """Pick the most specific nudge text available for a funnel step."""
    if step in NUDGES:
        return NUDGES[step]
    if "#" in step:
        flow = step.split("#", 1)[0]
        if flow in NUDGES:
            return NUDGES[flow]
        # legacy alias: deposit_open vs. "deposit", card_manage vs. "cards"
        for prefix in ("deposit", "card"):
            if flow.startswith(prefix):
                return NUDGES.get(f"{prefix}_open", NUDGES.get(f"{prefix}_manage", NUDGES["default"]))
    return NUDGES["default"]


class SessionStore:
    def __init__(self) -> None:
        self._lock = Lock()
        # session_id -> { signal_type -> [ {ts, ...payload} ] }
        self._signals: dict[str, dict[str, list[dict[str, Any]]]] = defaultdict(
            lambda: defaultdict(list)
        )
        self._funnel_step: dict[str, str] = {}
        self._first_seen: dict[str, float] = {}

    def add_signal(self, session_id: str, kind: str, payload: dict[str, Any] | None = None) -> None:
        if kind not in SIGNAL_WEIGHTS:
            return
        with self._lock:
            self._signals[session_id][kind].append(
                {"ts": time.time(), **(payload or {})}
            )
        self._signals[session_id][kind] = self._signals[session_id][kind][-SIGNAL_CAP[kind]:]
        if session_id not in self._first_seen:
            self._first_seen[session_id] = time.time()

    def set_funnel_step(self, session_id: str, step: str) -> None:
        self._funnel_step[session_id] = step

    def get_session(self, session_id: str) -> dict[str, Any]:
        with self._lock:
            signals = {k: list(v) for k, v in self._signals[session_id].items()}
        counts = {k: len(v) for k, v in signals.items()}
        score = 0.0
        reasons: list[str] = []
        for kind, weight in SIGNAL_WEIGHTS.items():
            c = counts.get(kind, 0)
            if c:
                contrib = min(c, SIGNAL_CAP[kind]) * weight
                score += contrib
                reasons.append(f"{kind} x{c} (+{contrib:.0f})")
        score = min(score, 100.0)
        step = self._funnel_step.get(session_id, "default")
        nudge = resolve_nudge(step) if score >= RISK_THRESHOLD else None
        level = (
            "high" if score >= HIGH_RISK_THRESHOLD
            else "elevated" if score >= RISK_THRESHOLD
            else "low"
        )
        return {
            "session_id": session_id,
            "funnel_step": step,
            "risk_score": round(score, 1),
            "level": level,
            "nudge_threshold_crossed": score >= RISK_THRESHOLD,
            "nudge": nudge,
            "reasons": reasons,
            "signal_counts": counts,
            "signals": signals,
        }

    def predict_escalation_risk(self, session_id: str) -> dict[str, Any]:
        """The MCP-style tool the support agent calls."""
        return self.get_session(session_id)

    def list_sessions(self) -> list[dict[str, Any]]:
        with self._lock:
            ids = list(self._signals.keys())
        return [self.get_session(sid) for sid in ids]

    def clear(self, session_id: str) -> None:
        with self._lock:
            self._signals.pop(session_id, None)
            self._funnel_step.pop(session_id, None)
            self._first_seen.pop(session_id, None)


store = SessionStore()