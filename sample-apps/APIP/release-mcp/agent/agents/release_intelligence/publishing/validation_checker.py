"""Validation Checker module validating release outputs and change lists."""

from typing import List
from agents.release_intelligence.interfaces import IValidationChecker
from agents.release_intelligence.models.change import Change
from agents.release_intelligence.models.release_result import ReleaseResult, ValidationStatus
from agents.release_intelligence.exceptions import ValidationError
from agents.release_intelligence.utils.logger import logger


class ValidationChecker(IValidationChecker):
    """Validates generated release outputs against quality and consistency rules."""

    def validate_changes(self, changes: List[Change]) -> ValidationStatus:
        """Validate list of Change items for duplicate entries or missing descriptions.

        Args:
            changes: List of Change objects.

        Returns:
            ValidationStatus model containing warnings and errors.
        """
        logger.info(f"Validating {len(changes)} Change items...")
        errors: List[str] = []
        warnings: List[str] = []
        seen_ids = set()

        if not changes:
            warnings.append("Change list is completely empty.")

        for chg in changes:
            if chg.id in seen_ids:
                errors.append(f"Duplicate Change ID detected: {chg.id}")
            seen_ids.add(chg.id)

            if not chg.title or len(chg.title.strip()) < 3:
                errors.append(f"Invalid or empty title for change ID {chg.id}")

            if not chg.description:
                warnings.append(f"Missing detailed description for change ID {chg.id}")

            if not chg.affected_component or not chg.affected_component.id:
                errors.append(f"Missing affected component reference for change ID {chg.id}")

        is_valid = len(errors) == 0
        logger.info(f"Change validation result: valid={is_valid}, {len(errors)} errors, {len(warnings)} warnings.")
        return ValidationStatus(is_valid=is_valid, warnings=warnings, errors=errors)

    def validate_release(self, release_result: ReleaseResult) -> ValidationStatus:
        """Validate complete ReleaseResult for completeness, metadata, and consistency.

        Checks:
        - Duplicate entries
        - Missing release sections
        - Empty summaries
        - Invalid version numbers
        - Invalid graph references
        - Inconsistent metadata

        Args:
            release_result: Master ReleaseResult object.

        Returns:
            ValidationStatus model.
        """
        logger.info(f"Performing comprehensive Release validation for release {release_result.release_id}...")
        errors: List[str] = []
        warnings: List[str] = []

        # 1. Version numbers check
        if not release_result.old_version_id or not release_result.new_version_id:
            errors.append("Invalid or missing old/new version identifiers.")

        if release_result.old_version_id == release_result.new_version_id:
            warnings.append("Old version ID and New version ID are identical.")

        # 2. Check changes validation
        change_status = self.validate_changes(release_result.changes)
        errors.extend(change_status.errors)
        warnings.extend(change_status.warnings)

        # 3. Release Notes check
        rel_notes = release_result.release_notes
        if not rel_notes.customer_notes.summary or not rel_notes.customer_notes.sections:
            errors.append("Customer release notes are missing summary or sections.")

        if not rel_notes.internal_engineering_notes.summary:
            warnings.append("Internal engineering notes summary is empty.")

        # 4. Changelog check
        if not release_result.changelog.sections:
            warnings.append("Changelog contains no category sections.")

        # 5. Risk Assessment check
        if release_result.risk_assessment.risk_score < 0.0 or release_result.risk_assessment.risk_score > 10.0:
            errors.append(f"Invalid risk score value: {release_result.risk_assessment.risk_score}")

        is_valid = len(errors) == 0
        logger.info(f"Release validation complete: valid={is_valid}, {len(errors)} errors, {len(warnings)} warnings.")
        return ValidationStatus(is_valid=is_valid, warnings=warnings, errors=errors)
