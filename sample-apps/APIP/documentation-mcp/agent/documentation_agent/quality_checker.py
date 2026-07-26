"""Validate generated Markdown documentation."""

import re
from pathlib import Path

from models import ValidationReport


class QualityChecker:
    """Checks headings, empty sections, and local image paths."""

    def validate(self, markdown_text: str) -> ValidationReport:
        """Return a quality report for Markdown content."""
        headings = re.findall(
            r"^(#{1,6})\s+(.+?)\s*$",
            markdown_text,
            re.MULTILINE,
        )

        heading_names = [title.lower() for _, title in headings]

        duplicate_headings = sorted(
            {
                title
                for title in heading_names
                if heading_names.count(title) > 1
            }
        )

        image_paths = re.findall(
            r"!\[[^\]]*\]\(([^)]+)\)",
            markdown_text,
        )

        broken_screenshots = [
            path
            for path in image_paths
            if not path.startswith(("http://", "https://"))
            and not Path(path).exists()
        ]

        section_bodies = re.split(
            r"^#{1,6}\s+.+$",
            markdown_text,
            flags=re.MULTILINE,
        )[1:]

        empty_sections = [
            headings[index][1]
            for index, body in enumerate(section_bodies)
            if not body.strip()
        ]

        missing_headings = []
        if not any(level == "#" for level, _ in headings):
            missing_headings.append("H1 document title")

        return ValidationReport(
            valid=not (
                missing_headings
                or duplicate_headings
                or broken_screenshots
                or empty_sections
            ),
            missing_headings=missing_headings,
            duplicate_headings=duplicate_headings,
            broken_screenshots=broken_screenshots,
            empty_sections=empty_sections,
            grammar_score=None,
        )