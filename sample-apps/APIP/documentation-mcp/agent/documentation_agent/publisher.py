"""Publish generated documentation locally."""

from pathlib import Path

from models import GeneratedDocuments, PublishResult


class Publisher:
    """Publishes documents locally and exposes future MCP extension points."""

    def publish_to_folder(
        self,
        documents: GeneratedDocuments,
        folder: str,
    ) -> PublishResult:
        """Save generated Markdown files to a local folder."""
        target_folder = Path(folder)
        target_folder.mkdir(parents=True, exist_ok=True)

        content_by_name = {
            "user_guide.md": documents.user_guide,
            "faq.md": documents.faq,
            "release_notes.md": documents.release_notes,
        }

        saved_files: dict[str, str] = {}

        for file_name, content in content_by_name.items():
            path = target_folder / file_name
            path.write_text(content, encoding="utf-8")
            saved_files[file_name] = str(path.resolve())

        return PublishResult(files=saved_files)

    async def publish_to_notion(self, *args: object, **kwargs: object) -> None:
        """Future Notion MCP integration."""
        raise NotImplementedError("Notion publishing is not configured.")

    async def publish_to_confluence(
        self,
        *args: object,
        **kwargs: object,
    ) -> None:
        """Future Confluence MCP integration."""
        raise NotImplementedError("Confluence publishing is not configured.")