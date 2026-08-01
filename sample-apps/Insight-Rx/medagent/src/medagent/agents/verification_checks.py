"""
Deterministic safety checks for the Verification Layer -- Phase 2, item 4
(Strategic_Startup_Roadmap.pdf: "upgrade the Verifier from a passive LLM
reviewer into a deterministic safety firewall").

Every function here is pure Python: no LLM, no network, no randomness.
That is the entire point. An LLM asked "is this report consistent?" can
itself hallucinate a "yes" -- which makes it a reviewer, not a
safeguard. These checks either pass or fail for reasons that can be
stated exactly, reproduced from the same inputs forever, and unit-tested
without a model server. verifier_agent.py runs these FIRST and treats a
deterministic failure as authoritative: it does not ask the LLM for a
second opinion about a fact that has already been settled arithmetically.

The checks are deliberately biased toward over-flagging. Every failure
mode here routes a case to a rewrite and ultimately to a human, so a
false positive costs one regeneration cycle while a false negative can
let an unsupported claim reach a clinician -- the same recall-over-
precision priority the rest of this pipeline follows (PRD 2.3).
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass

from pydantic import BaseModel, ValidationError

logger = logging.getLogger("medagent.agents.verification_checks")

# Below this calibrated confidence (evaluation/calibration.py's
# temperature-scaled output, Phase 1 item 3) the vision layer is not
# trustworthy enough for any downstream reasoning to be worth checking.
MIN_VISION_CONFIDENCE = 0.60
LOW_CONFIDENCE_NOTE = "Escalated: Low vision model confidence."


@dataclass(frozen=True)
class CheckOutcome:
    """One deterministic check's verdict. `reason` is written to be read
    by the Report Agent on a regeneration pass, so it states what was
    wrong specifically enough to act on -- not just that something was."""

    check: str
    passed: bool
    reason: str = ""


class CorrectionPrompt(BaseModel):
    """
    The exact correction text handed back to report_agent when
    deterministic verification fails.

    Carries every failure found in one pass rather than the first one:
    fixing an ungrounded citation only to be told on the next cycle that
    the anatomy also contradicts the detector would burn a regeneration
    attempt per defect, and there are only two.
    """

    failures: list[str]

    def to_note(self) -> str:
        numbered = "\n".join(f"{i}. {failure}" for i, failure in enumerate(self.failures, start=1))
        return (
            "The previous draft failed deterministic verification and MUST be corrected. "
            f"Fix all {len(self.failures)} issue(s) below exactly:\n{numbered}"
        )


# ─────────────────────────────────────────────────────────────────────
# Text analysis helpers (negation-aware, so "no consolidation" is not
# read as a claim of consolidation)
# ─────────────────────────────────────────────────────────────────────

_ABNORMALITY_TERMS = frozenset({
    "opacity", "opacities", "consolidation", "consolidations",
    "infiltrate", "infiltrates", "effusion", "effusions",
    "pneumonia", "nodule", "nodules", "mass", "masses",
    "pneumothorax", "cardiomegaly", "edema", "atelectasis",
    "fracture", "fractures", "lesion", "lesions",
    "abnormality", "abnormalities",
})

# A term is read as negated when one of these appears shortly before it
# in the same clause.
_NEGATION_WORDS = frozenset({"no", "not", "without", "absent", "denies", "negative"})
_NEGATION_PHRASES = ("free of", "absence of", "ruled out", "rule out", "clear of")

# Radiology prose negates after the noun at least as often as before it
# ("Consolidation has been ruled out", "Effusion is absent"). Scanning
# only backwards would read every one of those as a positive finding and
# burn a regeneration cycle on a correct report.
_POSTPOSED_NEGATION_PHRASES = (
    "ruled out", "is absent", "are absent", "was excluded", "is excluded",
    "not identified", "not seen", "not present", "not visualized", "not appreciated",
    "not demonstrated",
)

# How far back to look for a negation cue. Wide enough to cover negated
# lists ("no consolidation, effusion, or pneumothorax"), short enough
# that a negation in an unrelated earlier phrase doesn't bleed forward.
_NEGATION_WINDOW = 6

# Clause boundaries. Contrastive conjunctions are included because they
# genuinely reset negation scope: in "no effusion but there is
# consolidation", the consolidation is asserted, not negated.
_CLAUSE_SPLIT_RE = re.compile(r"[.;:!?]|\b(?:but|however|although|though|whereas)\b")
_WORD_RE = re.compile(r"[a-z]+")


def find_abnormality_mentions(text: str) -> tuple[list[str], list[str]]:
    """
    Splits the abnormality terms mentioned in `text` into (affirmed,
    negated).

    "Focal consolidation in the right lower lobe."  -> affirmed
    "No focal consolidation."                       -> negated
    "Consolidation has been ruled out."             -> negated
    "No effusion but consolidation is present."     -> consolidation affirmed

    This is a bounded lexical heuristic, not clinical NLP -- it cannot
    parse arbitrary hedging ("consolidation cannot be excluded"). It is
    used only in directions where being wrong escalates the case rather
    than releasing it; see check_region_box_consistency.
    """
    affirmed: list[str] = []
    negated: list[str] = []

    for clause in _CLAUSE_SPLIT_RE.split(text or ""):
        tokens = _WORD_RE.findall(clause.lower())
        for index, token in enumerate(tokens):
            if token not in _ABNORMALITY_TERMS:
                continue

            preceding = tokens[max(0, index - _NEGATION_WINDOW):index]
            is_negated = bool(_NEGATION_WORDS.intersection(preceding)) or any(
                phrase in " ".join(preceding) for phrase in _NEGATION_PHRASES
            )

            if not is_negated:
                # Scan forward for post-posed negation, stopping at the
                # next abnormality term so that each term only sees the
                # words that belong to it: in "consolidation is present,
                # effusion is absent", the "is absent" must not reach
                # back and negate the consolidation.
                following: list[str] = []
                for next_token in tokens[index + 1:index + 1 + _NEGATION_WINDOW]:
                    if next_token in _ABNORMALITY_TERMS:
                        break
                    following.append(next_token)
                is_negated = any(
                    phrase in " ".join(following) for phrase in _POSTPOSED_NEGATION_PHRASES
                )

            (negated if is_negated else affirmed).append(token)

    return affirmed, negated


# ─────────────────────────────────────────────────────────────────────
# The checks
# ─────────────────────────────────────────────────────────────────────

def check_schema_compliance(diagnosis_findings: object) -> CheckOutcome:
    """
    Asserts the Diagnosis Agent's finding still matches DiagnosisOutput
    exactly -- every required field present, correct types, and
    `severity` one of the permitted enum values.

    This guards the seam where a structured-output contract can silently
    rot: `.with_structured_output()` constrains the LLM, but the finding
    reaches this point as a plain dict on graph state, having survived a
    checkpoint round-trip and any node that touched it in between.
    """
    from medagent.agents.diagnosis_agent import DiagnosisOutput

    if not isinstance(diagnosis_findings, dict):
        return CheckOutcome(
            check="schema_compliance", passed=False,
            reason=(
                f"diagnosis_findings must be an object matching the DiagnosisOutput schema, "
                f"got {type(diagnosis_findings).__name__}."
            ),
        )

    try:
        DiagnosisOutput(**diagnosis_findings)
    except ValidationError as exc:
        problems = "; ".join(
            f"field '{'.'.join(str(p) for p in error['loc'])}': {error['msg']}"
            for error in exc.errors()
        )
        return CheckOutcome(
            check="schema_compliance", passed=False,
            reason=f"diagnosis_findings does not satisfy the required schema -- {problems}.",
        )

    return CheckOutcome(check="schema_compliance", passed=True)


def check_region_box_consistency(
    classification: object, detections: object, draft_report: str
) -> CheckOutcome:
    """
    Cross-checks the drafted prose against what the vision layer
    actually saw, in both directions:

      - The detector localized one or more boxes, so the report must
        assert SOME abnormality. A draft that reads as a clean study
        while the detector is pointing at something contradicts the
        evidence it was given.
      - The detector found nothing AND the classifier said "Normal", so
        the report must not assert a focal abnormality. This is the
        hallucination case: prose inventing an opacity that no part of
        the perception layer reported.

    Both directions fail toward escalation, which is why the bounded
    negation heuristic behind them is acceptable here: a
    misclassification of the prose costs a regeneration cycle and
    ultimately a human read, never a silently released report.
    """
    boxes = detections if isinstance(detections, list) else []
    affirmed, negated = find_abnormality_mentions(draft_report)

    if boxes and not affirmed:
        return CheckOutcome(
            check="region_box_consistency", passed=False,
            reason=(
                f"The detector localized {len(boxes)} abnormality region(s), but the report does not "
                f"assert any abnormality"
                + (f" (it only negates: {sorted(set(negated))})" if negated else "")
                + ". The report must describe the localized finding rather than reading as a normal study."
            ),
        )

    predicted_class = (
        classification.get("predicted_class") if isinstance(classification, dict) else None
    )
    if not boxes and predicted_class == "Normal" and affirmed:
        return CheckOutcome(
            check="region_box_consistency", passed=False,
            reason=(
                f"The report asserts {sorted(set(affirmed))} but the classifier predicted 'Normal' and "
                f"the detector localized zero regions. Do not describe a focal abnormality that no part "
                f"of the perception layer reported."
            ),
        )

    return CheckOutcome(check="region_box_consistency", passed=True)


# A citation marker anywhere in prose: "[1]", "[12]".
_CITATION_RE = re.compile(r"\[(\d+)\]")
# The anchored form evidence_agent.py emits: "[1] Source: ...".
_EVIDENCE_MARKER_RE = re.compile(r"\[(\d+)\]\s*Source:", re.IGNORECASE)


def available_citation_indices(retrieved_evidence: str) -> set[int]:
    """
    The citation indices the Evidence Agent actually supplied.

    Prefers the anchored "[n] Source:" form evidence_agent.py emits,
    because guideline prose can itself contain bracketed numbers that
    are not citation slots -- counting those would inflate what looks
    grounded, which is the wrong direction to be wrong in. Falls back to
    any "[n]" only when the anchored form finds nothing, so a differently
    formatted evidence string degrades to a permissive check rather than
    failing every citation outright.
    """
    evidence = retrieved_evidence or ""
    anchored = {int(match) for match in _EVIDENCE_MARKER_RE.findall(evidence)}
    if anchored:
        return anchored
    return {int(match) for match in _CITATION_RE.findall(evidence)}


def check_citation_grounding(draft_report: str, retrieved_evidence: str) -> CheckOutcome:
    """
    Every "[n]" the report cites must correspond to a guideline chunk the
    Evidence Agent actually retrieved.

    This is the RAG-grounding firewall: a fabricated "[3]" reads to a
    clinician as a specific guideline reference backing a specific
    recommendation, which is the most dangerous kind of hallucination
    this system can emit -- it does not look like an error, it looks
    like a source.
    """
    cited = {int(match) for match in _CITATION_RE.findall(draft_report or "")}
    if not cited:
        return CheckOutcome(check="citation_grounding", passed=True)

    available = available_citation_indices(retrieved_evidence)
    ungrounded = sorted(cited - available)

    if ungrounded:
        return CheckOutcome(
            check="citation_grounding", passed=False,
            reason=(
                f"The report cites {[f'[{i}]' for i in ungrounded]}, which do not exist in the "
                f"retrieved evidence (available: "
                f"{[f'[{i}]' for i in sorted(available)] or 'none -- no guidelines were retrieved'}). "
                f"Cite only the numbered evidence provided, or make the statement without a citation."
            ),
        )

    return CheckOutcome(check="citation_grounding", passed=True)


def run_deterministic_checks(state: dict) -> list[CheckOutcome]:
    """
    Runs every deterministic check against the current graph state and
    returns all outcomes, passed and failed alike.

    Returns the full list rather than short-circuiting on the first
    failure so verifier_agent.py can report every defect in one
    correction prompt -- see CorrectionPrompt.
    """
    draft_report = state.get("draft_report") or ""
    return [
        check_schema_compliance(state.get("diagnosis_findings")),
        check_region_box_consistency(
            state.get("classification"), state.get("detections"), draft_report
        ),
        check_citation_grounding(draft_report, state.get("retrieved_evidence") or ""),
    ]


def is_low_confidence(
    classification: object, threshold: float = MIN_VISION_CONFIDENCE
) -> bool:
    """
    True when the vision layer's calibrated confidence is below the
    abstention threshold.

    A missing or malformed classification also counts as low confidence:
    "we could not establish confidence" and "confidence was too low" both
    mean the same thing to a safety gate that is deciding whether to
    trust downstream reasoning.
    """
    if not isinstance(classification, dict):
        return True

    confidence = classification.get("calibrated_confidence")
    if not isinstance(confidence, (int, float)) or isinstance(confidence, bool):
        return True

    return float(confidence) < threshold
