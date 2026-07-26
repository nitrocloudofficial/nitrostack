"""Release Notes Generator formatting tailored release notes for multiple target audiences."""

from typing import List, Dict
from agents.release_intelligence.interfaces import IReleaseNotesGenerator
from agents.release_intelligence.models.change import Change
from agents.release_intelligence.models.impact import ImpactAnalysis
from agents.release_intelligence.models.release_note import (
    ReleaseNote, ReleaseNoteSection, MultiAudienceReleaseNotes
)
from agents.release_intelligence.utils.constants import TargetAudience, ChangeCategory
from agents.release_intelligence.utils.logger import logger


class ReleaseNotesGenerator(IReleaseNotesGenerator):
    """Generates professional, audience-tailored Release Notes."""

    def generate(self, changes: List[Change], impact: ImpactAnalysis, version: str = "2.0.0") -> MultiAudienceReleaseNotes:
        """Generate Release Notes model containing multi-audience sections.

        Args:
            changes: Categorized list of Change items.
            impact: Calculated ImpactAnalysis.
            version: Target release version identifier.

        Returns:
            MultiAudienceReleaseNotes model containing tailored release notes for Customer, Engineering, Executive, Technical.
        """
        logger.info(f"Generating Multi-Audience Release Notes for version {version}...")

        customer = self._generate_customer_notes(changes, impact, version)
        engineering = self._generate_engineering_notes(changes, impact, version)
        executive = self._generate_executive_notes(changes, impact, version)
        technical = self._generate_technical_notes(changes, impact, version)

        return MultiAudienceReleaseNotes(
            customer_notes=customer,
            internal_engineering_notes=engineering,
            executive_summary_notes=executive,
            technical_notes=technical
        )

    def _generate_customer_notes(self, changes: List[Change], impact: ImpactAnalysis, version: str) -> ReleaseNote:
        features = [chg.title for chg in changes if chg.category == ChangeCategory.ADDED]
        improvements = [chg.title for chg in changes if chg.category in [ChangeCategory.MODIFIED, ChangeCategory.WORKFLOW_CHANGED]]
        fixes = [chg.title for chg in changes if "Fix" in chg.title or "Validation" in chg.title]

        sections = [
            ReleaseNoteSection(heading="🚀 New Features", bullet_points=features or ["General performance optimizations."]),
            ReleaseNoteSection(heading="✨ Enhancements & Improvements", bullet_points=improvements or ["Usability refinements across core workflows."]),
            ReleaseNoteSection(heading="🛠️ Bug Fixes & Stability", bullet_points=fixes or ["Resolved edge cases in navigation and state management."]),
        ]

        md = f"# Release Notes v{version} (Customer)\n\n"
        md += f"**Overview**: {impact.user_impact.summary}\n\n"
        for sec in sections:
            md += f"### {sec.heading}\n"
            for pt in sec.bullet_points:
                md += f"- {pt}\n"
            md += "\n"

        return ReleaseNote(
            audience=TargetAudience.CUSTOMER,
            title=f"Customer Release Notes v{version}",
            version=version,
            summary=impact.user_impact.summary,
            sections=sections,
            raw_markdown=md
        )

    def _generate_engineering_notes(self, changes: List[Change], impact: ImpactAnalysis, version: str) -> ReleaseNote:
        added = [f"{chg.title} ({chg.affected_component.id})" for chg in changes if chg.category == ChangeCategory.ADDED]
        modified = [f"{chg.title} - Delta: {list(chg.metadata.keys())}" for chg in changes if chg.category == ChangeCategory.MODIFIED]
        removed = [f"{chg.title}" for chg in changes if chg.category == ChangeCategory.REMOVED]

        sections = [
            ReleaseNoteSection(heading="Added Components", bullet_points=added or ["None"]),
            ReleaseNoteSection(heading="Modified Entities & Contracts", bullet_points=modified or ["None"]),
            ReleaseNoteSection(heading="Deprecations & Removals", bullet_points=removed or ["None"]),
        ]

        md = f"# Engineering Release Notes v{version}\n\n"
        md += f"**Technical Impact Summary**: {impact.developer_impact.summary}\n\n"
        for sec in sections:
            md += f"### {sec.heading}\n"
            for pt in sec.bullet_points:
                md += f"- {pt}\n"
            md += "\n"

        return ReleaseNote(
            audience=TargetAudience.INTERNAL_ENGINEERING,
            title=f"Internal Engineering Release Notes v{version}",
            version=version,
            summary=impact.developer_impact.summary,
            sections=sections,
            raw_markdown=md
        )

    def _generate_executive_notes(self, changes: List[Change], impact: ImpactAnalysis, version: str) -> ReleaseNote:
        summary = f"Release {version} introduces {len([c for c in changes if c.category == ChangeCategory.ADDED])} new capability modules and updates {len(changes)} total system components."
        sections = [
            ReleaseNoteSection(
                heading="Executive Summary",
                bullet_points=[
                    summary,
                    f"User Experience Impact: {impact.user_impact.summary}",
                    f"System Stability & Architecture: {impact.developer_impact.summary}"
                ]
            )
        ]

        md = f"# Executive Briefing v{version}\n\n{summary}\n"

        return ReleaseNote(
            audience=TargetAudience.EXECUTIVE,
            title=f"Executive Release Briefing v{version}",
            version=version,
            summary=summary,
            sections=sections,
            raw_markdown=md
        )

    def _generate_technical_notes(self, changes: List[Change], impact: ImpactAnalysis, version: str) -> ReleaseNote:
        api_changes = impact.developer_impact.api_changes
        schema_changes = impact.developer_impact.schema_changes

        sections = [
            ReleaseNoteSection(heading="API Endpoints & Contracts", bullet_points=api_changes),
            ReleaseNoteSection(heading="Graph & Schema Changes", bullet_points=schema_changes),
        ]

        md = f"# Technical Integration Release Notes v{version}\n\n"
        for sec in sections:
            md += f"### {sec.heading}\n"
            for pt in sec.bullet_points:
                md += f"- {pt}\n"
            md += "\n"

        return ReleaseNote(
            audience=TargetAudience.TECHNICAL,
            title=f"Technical Release Notes v{version}",
            version=version,
            summary=impact.developer_impact.summary,
            sections=sections,
            raw_markdown=md
        )
