"""
Free-text PHI redaction for the clinical decision pipeline -- Phase 2,
item 1 (Strategic_Startup_Roadmap.pdf: "Replace regex PHI redaction with
a proper de-identifier").

redact_phi() runs Microsoft Presidio (spaCy-backed NER + Presidio's
built-in pattern recognizers for SSNs, phone numbers, etc., plus a
custom recognizer for medical record numbers) instead of a fixed regex
list -- catching names, dates, phone numbers, and institution/location
mentions a regex pattern can't generalize to, at the cost of a heavier
one-time model load per process (spaCy's en_core_web_lg, cached after
first use via _get_analyzer()).

Called by security/audit_logger.py to scrub the one free-text field
(`notes`) an audit record can carry before it is written to disk. This
module used to own audit-log writing itself; Phase 2 item 3 replaced
that with the hash-chained logger, leaving this module responsible for
exactly one thing: turning text that may contain PHI into text that
does not.
"""
from __future__ import annotations

import logging
from functools import lru_cache

from presidio_analyzer import Pattern, PatternRecognizer

logger = logging.getLogger("medagent.privacy")

# Entities Presidio's own default config disables (see its
# conf/default.yaml: `labels_to_ignore: [ORGANIZATION, ...]`, commented
# "Has many false positives") that this project deliberately
# re-enables: over-redacting a stray word in a clinician's free-text
# feedback is free; under-redacting a real hospital/institution name is
# not -- recall over precision, the same priority this project's
# diagnosis logic already follows (see diagnosis_agent.py).
_ENABLED_ENTITIES = ["PERSON", "LOCATION", "DATE_TIME", "NRP", "ORGANIZATION"]

# Presidio's built-in recognizers cover SSNs, phone numbers, emails,
# driver's licenses, etc. but have no "medical record number" concept --
# MRNs are institution-specific free-text IDs, so a custom pattern
# recognizer (Presidio's own extension mechanism for exactly this) fills
# the gap rather than bolting on a second, separate regex pass outside
# Presidio's pipeline.
_MRN_RECOGNIZER = PatternRecognizer(
    supported_entity="MEDICAL_RECORD_NUMBER",
    patterns=[Pattern(name="mrn_pattern", regex=r"\bMRN[-:\s]*\d{6,10}\b", score=0.85)],
)


@lru_cache(maxsize=1)
def _get_analyzer():
    """
    Builds (once per process -- this loads a full spaCy NER model,
    expensive enough to cache) the Presidio analyzer with ORGANIZATION
    detection re-enabled and the custom MRN recognizer added.
    """
    from presidio_analyzer import AnalyzerEngine
    from presidio_analyzer.nlp_engine import NlpEngineProvider
    from presidio_analyzer.predefined_recognizers import SpacyRecognizer

    nlp_configuration = {
        "nlp_engine_name": "spacy",
        "models": [{"lang_code": "en", "model_name": "en_core_web_lg"}],
        "ner_model_configuration": {
            "model_to_presidio_entity_mapping": {
                "PER": "PERSON", "PERSON": "PERSON", "NORP": "NRP",
                "FAC": "LOCATION", "LOC": "LOCATION", "GPE": "LOCATION", "LOCATION": "LOCATION",
                "ORG": "ORGANIZATION", "ORGANIZATION": "ORGANIZATION",
                "DATE": "DATE_TIME", "TIME": "DATE_TIME",
            },
            "low_confidence_score_multiplier": 0.4,
            "low_score_entity_names": [],
            # Deliberately does NOT include ORGANIZATION here, unlike
            # Presidio's own default.yaml -- see module docstring.
            "labels_to_ignore": [
                "CARDINAL", "EVENT", "LANGUAGE", "LAW", "MONEY",
                "ORDINAL", "PERCENT", "PRODUCT", "QUANTITY", "WORK_OF_ART",
            ],
        },
    }
    engine = NlpEngineProvider(nlp_configuration=nlp_configuration).create_engine()

    analyzer = AnalyzerEngine(nlp_engine=engine)
    # The registry's default SpacyRecognizer is built with ORGANIZATION
    # excluded regardless of the NLP engine config above -- replace it
    # with one that actually uses the entities this project wants.
    analyzer.registry.remove_recognizer("SpacyRecognizer")
    analyzer.registry.add_recognizer(SpacyRecognizer(supported_entities=_ENABLED_ENTITIES))
    analyzer.registry.add_recognizer(_MRN_RECOGNIZER)
    return analyzer


@lru_cache(maxsize=1)
def _get_anonymizer():
    from presidio_anonymizer import AnonymizerEngine

    return AnonymizerEngine()


def redact_phi(text: str) -> str:
    """
    Detects and masks PII/PHI in free text using Presidio (spaCy-backed
    NER + pattern recognizers for SSNs/phone numbers/MRNs/etc.),
    replacing each detected span with a `<ENTITY_TYPE>` placeholder.

    This is a general-purpose NLP de-identifier, not a guarantee: it can
    still miss PHI in unusual shapes it's never seen (a misspelled name,
    a non-US ID format) and can over-redact look-alike text. Treat it as
    a strong floor, not a certainty -- exactly like the regex version
    this replaces, just with real language understanding behind it
    instead of fixed patterns.
    """
    if not text:
        return text

    analyzer = _get_analyzer()
    anonymizer = _get_anonymizer()

    results = analyzer.analyze(text=text, language="en")
    anonymized = anonymizer.anonymize(text=text, analyzer_results=results)
    return anonymized.text


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    sample = (
        "Patient John Smith, DOB 04/12/1985, MRN 1029384, phone 555-123-4567, "
        "seen at Mercy General Hospital in Springfield on 2026-07-29."
    )
    print("input:    ", sample)
    print("redacted: ", redact_phi(sample))
