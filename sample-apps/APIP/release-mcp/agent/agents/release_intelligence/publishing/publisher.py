"""Publisher component packaging and publishing Release Intelligence outputs."""

import json
from pathlib import Path
from typing import Dict, Optional, Any
from agents.release_intelligence.interfaces import IPublisher
from agents.release_intelligence.models.release_result import ReleaseResult
from agents.release_intelligence.exceptions import PublishError
from agents.release_intelligence.utils.logger import logger


class Publisher(IPublisher):
    """Packages and publishes release intelligence artifacts to local disk or remote integrations."""

    def __init__(self, default_output_dir: Path = Path("artifacts/release_intelligence")):
        self.default_output_dir = Path(default_output_dir)

    def publish(self, release_result: ReleaseResult, output_dir: Optional[Path] = None) -> Dict[str, str]:
        """Publish ReleaseResult outputs into structured JSON and Markdown files.

        Args:
            release_result: Completed ReleaseResult object.
            output_dir: Target output directory path (optional).

        Returns:
            Dictionary mapping artifact names to published file paths.
        """
        target_dir = Path(output_dir) if output_dir else self.default_output_dir
        target_dir.mkdir(parents=True, exist_ok=True)
        published_files: Dict[str, str] = {}

        logger.info(f"Publishing release outputs to directory: {target_dir.resolve()}")

        try:
            # 1. Publish Master ReleaseResult JSON
            json_path = target_dir / f"release_result_{release_result.new_version_id}.json"
            with open(json_path, "w", encoding="utf-8") as f:
                f.write(release_result.model_dump_json(indent=2))
            published_files["master_json"] = str(json_path.resolve())

            # 2. Publish Customer Release Notes (Markdown)
            cust_md_path = target_dir / f"customer_release_notes_{release_result.new_version_id}.md"
            with open(cust_md_path, "w", encoding="utf-8") as f:
                f.write(release_result.release_notes.customer_notes.raw_markdown)
            published_files["customer_release_notes"] = str(cust_md_path.resolve())

            # 3. Publish Internal Engineering Release Notes (Markdown)
            eng_md_path = target_dir / f"engineering_release_notes_{release_result.new_version_id}.md"
            with open(eng_md_path, "w", encoding="utf-8") as f:
                f.write(release_result.release_notes.internal_engineering_notes.raw_markdown)
            published_files["engineering_release_notes"] = str(eng_md_path.resolve())

            # 4. Publish Changelog (Markdown)
            cl_md_path = target_dir / f"changelog_{release_result.new_version_id}.md"
            with open(cl_md_path, "w", encoding="utf-8") as f:
                f.write(release_result.changelog.get_format("Markdown"))
            published_files["changelog_markdown"] = str(cl_md_path.resolve())

            # Update published files dictionary on release result model
            release_result.published_files = published_files
            logger.info(f"Successfully published {len(published_files)} release artifacts.")
            return published_files

        except Exception as e:
            logger.error(f"Error publishing release artifacts: {e}")
            raise PublishError(f"Failed to publish release outputs: {e}") from e

    # Future integration extension stubs
    async def publish_to_github(self, release_result: ReleaseResult, repo: str, token: str) -> bool:
        """Extension hook: Publish release notes to GitHub Releases API."""
        logger.info(f"Extension stub: Publishing release {release_result.new_version_id} to GitHub repository '{repo}'.")
        return True

    async def publish_to_notion(self, release_result: ReleaseResult, page_id: str) -> bool:
        """Extension stub: Publish release overview to Notion Workspace."""
        logger.info(f"Extension stub: Publishing to Notion page '{page_id}'.")
        return True

    async def publish_to_confluence(self, release_result: ReleaseResult, space_key: str) -> bool:
        """Extension stub: Publish technical release notes to Atlassian Confluence."""
        logger.info(f"Extension stub: Publishing to Confluence space '{space_key}'.")
        return True

    async def publish_to_event_bus(self, release_result: ReleaseResult, topic: str) -> bool:
        """Extension stub: Publish ReleaseResult payload event to ADIP Orchestrator Event Bus."""
        logger.info(f"Extension stub: Publishing release event payload to topic '{topic}'.")
        return True
