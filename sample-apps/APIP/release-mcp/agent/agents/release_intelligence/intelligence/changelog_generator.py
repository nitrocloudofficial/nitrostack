"""Changelog Generator module producing multi-format changelogs deterministically."""

import json
from typing import List, Dict
from agents.release_intelligence.interfaces import IChangelogGenerator
from agents.release_intelligence.models.change import Change
from agents.release_intelligence.models.changelog import (
    Changelog, ChangelogSection, ChangelogEntry
)
from agents.release_intelligence.utils.constants import ChangelogFormat, ChangeCategory
from agents.release_intelligence.utils.logger import logger


class ChangelogGenerator(IChangelogGenerator):
    """Generates structured changelogs in Markdown, JSON, Plain Text, and HTML formats without LLM overhead."""

    def generate(self, changes: List[Change], version: str = "2.0.0", format_type: str = "Markdown") -> Changelog:
        """Generate structured Changelog in multiple target formats.

        Supported sections:
        - Added
        - Changed
        - Fixed
        - Removed
        - Deprecated

        Args:
            changes: List of Change records.
            version: Version string.
            format_type: Requested primary format type.

        Returns:
            Changelog Pydantic model with formatted content map.
        """
        logger.info(f"Generating multi-format Changelog for version {version}...")

        added_entries: List[ChangelogEntry] = []
        changed_entries: List[ChangelogEntry] = []
        fixed_entries: List[ChangelogEntry] = []
        removed_entries: List[ChangelogEntry] = []
        deprecated_entries: List[ChangelogEntry] = []

        for chg in changes:
            entry = ChangelogEntry(
                category=chg.category.value,
                description=chg.title,
                component_name=chg.affected_component.name
            )

            if chg.category == ChangeCategory.ADDED:
                added_entries.append(entry)
            elif chg.category in [ChangeCategory.MODIFIED, ChangeCategory.RENAMED, ChangeCategory.MOVED, ChangeCategory.WORKFLOW_CHANGED, ChangeCategory.RELATIONSHIP_CHANGED]:
                changed_entries.append(entry)
            elif chg.category == ChangeCategory.REMOVED:
                removed_entries.append(entry)
            elif chg.category == ChangeCategory.DEPRECATED:
                deprecated_entries.append(entry)
            else:
                changed_entries.append(entry)

        sections = [
            ChangelogSection(category="Added", entries=added_entries),
            ChangelogSection(category="Changed", entries=changed_entries),
            ChangelogSection(category="Fixed", entries=fixed_entries),
            ChangelogSection(category="Removed", entries=removed_entries),
            ChangelogSection(category="Deprecated", entries=deprecated_entries),
        ]

        # Render formats
        md_text = self._render_markdown(version, sections)
        json_text = self._render_json(version, sections)
        txt_text = self._render_plain_text(version, sections)
        html_text = self._render_html(version, sections)

        formatted_content = {
            ChangelogFormat.MARKDOWN.value: md_text,
            ChangelogFormat.JSON.value: json_text,
            ChangelogFormat.PLAIN_TEXT.value: txt_text,
            ChangelogFormat.HTML.value: html_text,
        }

        return Changelog(
            version=version,
            sections=sections,
            formatted_content=formatted_content
        )

    def _render_markdown(self, version: str, sections: List[ChangelogSection]) -> str:
        md = f"# Changelog - Version {version}\n\n"
        for sec in sections:
            if sec.entries:
                md += f"## {sec.category}\n"
                for entry in sec.entries:
                    md += f"- **{entry.component_name}**: {entry.description}\n"
                md += "\n"
        return md

    def _render_json(self, version: str, sections: List[ChangelogSection]) -> str:
        data = {
            "version": version,
            "sections": [sec.model_dump() for sec in sections if sec.entries]
        }
        return json.dumps(data, indent=2)

    def _render_plain_text(self, version: str, sections: List[ChangelogSection]) -> str:
        txt = f"CHANGELOG - VERSION {version}\n"
        txt += "=" * 40 + "\n\n"
        for sec in sections:
            if sec.entries:
                txt += f"[{sec.category.upper()}]\n"
                for entry in sec.entries:
                    txt += f"  * {entry.component_name}: {entry.description}\n"
                txt += "\n"
        return txt

    def _render_html(self, version: str, sections: List[ChangelogSection]) -> str:
        html = f"<h1>Changelog - Version {version}</h1>\n"
        for sec in sections:
            if sec.entries:
                html += f"<h2>{sec.category}</h2>\n<ul>\n"
                for entry in sec.entries:
                    html += f"  <li><strong>{entry.component_name}</strong>: {entry.description}</li>\n"
                html += "</ul>\n"
        return html
