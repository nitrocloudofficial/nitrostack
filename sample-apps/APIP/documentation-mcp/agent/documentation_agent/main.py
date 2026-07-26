"""FastAPI entry point for the Documentation Agent."""

import logging

from fastapi import FastAPI, HTTPException, Response
from pydantic import BaseModel

from agent import DocumentationAgent
from config import Settings
from generator import DocumentGenerator
from models import ProductKnowledgeGraph, ValidationReport
from prompts import PromptLibrary
from updater import DocumentUpdater


class GenerateRequest(BaseModel):
    graph: ProductKnowledgeGraph
    output_dir: str = "outputs"
    use_llm: bool = True


class DocumentRequest(BaseModel):
    graph: ProductKnowledgeGraph
    use_llm: bool = True


class ExportRequest(BaseModel):
    markdown: str
    output_path: str = "outputs/user_guide.pdf"


class UpdateRequest(BaseModel):
    old_documentation: str
    graph: ProductKnowledgeGraph
    use_llm: bool = True


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""

    settings = Settings()

    logging.basicConfig(
        level=getattr(
            logging,
            settings.log_level.upper(),
            logging.INFO,
        )
    )

    documentation_agent = DocumentationAgent(settings)

    updater = DocumentUpdater(
        DocumentGenerator(
            settings=settings,
            prompts=PromptLibrary(),
        )
    )

    app = FastAPI(
        title="Documentation Agent",
        description=(
            "Generate User Guides, FAQs, Release Notes, "
            "and PDF documentation from a Product Knowledge Graph."
        ),
        version="1.0.0",
    )

    @app.get("/")
    async def home() -> dict[str, str]:
        """Return a simple service status response."""
        return {
            "message": "Documentation Agent is running.",
            "docs_url": "http://127.0.0.1:8000/docs",
            "health_url": "http://127.0.0.1:8000/health",
        }

    @app.get("/health")
    async def health() -> dict[str, str]:
        """Return application health status."""
        return {"status": "healthy"}

    @app.get("/favicon.ico", status_code=204)
    async def favicon() -> Response:
        """Avoid unnecessary browser favicon 404 messages."""
        return Response(status_code=204)

    @app.post("/generate")
    async def generate_all(request: GenerateRequest) -> dict:
        """Generate and save all Markdown documents and attempt PDF export."""

        documents = await documentation_agent.generate_all(
            graph=request.graph,
            use_llm=request.use_llm,
        )

        published = documentation_agent.publish(
            documents=documents,
            folder=request.output_dir,
        )

        response = {
            "documents": documents.model_dump(),
            "files": published.files,
            "pdf_path": None,
            "pdf_error": None,
        }

        try:
            response["pdf_path"] = documentation_agent.export_pdf(
                markdown_text=documents.user_guide,
                output_path=f"{request.output_dir}/user_guide.pdf",
            )
        except RuntimeError as exc:
            response["pdf_error"] = str(exc)

        return response

    @app.post("/user-guide")
    async def generate_user_guide(
        request: DocumentRequest,
    ) -> dict[str, str]:
        """Generate a User Guide in Markdown."""

        markdown = await documentation_agent.generate_user_guide(
            graph=request.graph,
            use_llm=request.use_llm,
        )

        return {"markdown": markdown}

    @app.post("/faq")
    async def generate_faq(
        request: DocumentRequest,
    ) -> dict[str, str]:
        """Generate an FAQ in Markdown."""

        markdown = await documentation_agent.generate_faq(
            graph=request.graph,
            use_llm=request.use_llm,
        )

        return {"markdown": markdown}

    @app.post("/release-notes")
    async def generate_release_notes(
        request: DocumentRequest,
    ) -> dict[str, str]:
        """Generate Release Notes in Markdown."""

        markdown = await documentation_agent.generate_release_notes(
            graph=request.graph,
            use_llm=request.use_llm,
        )

        return {"markdown": markdown}

    @app.post("/validate", response_model=ValidationReport)
    async def validate_document(
        request: ExportRequest,
    ) -> ValidationReport:
        """Validate a Markdown document."""

        return documentation_agent.validate(request.markdown)

    @app.post("/export/pdf")
    async def export_pdf(
        request: ExportRequest,
    ) -> dict[str, str]:
        """Export Markdown as PDF."""

        try:
            pdf_path = documentation_agent.export_pdf(
                markdown_text=request.markdown,
                output_path=request.output_path,
            )
            return {"pdf_path": pdf_path}

        except RuntimeError as exc:
            raise HTTPException(
                status_code=503,
                detail=str(exc),
            ) from exc

    @app.post("/update/user-guide")
    async def update_user_guide(
        request: UpdateRequest,
    ) -> dict[str, str]:
        """Regenerate workflows marked as changed."""

        markdown = await updater.update_user_guide(
            old_documentation=request.old_documentation,
            graph=request.graph,
            use_llm=request.use_llm,
        )

        return {"markdown": markdown}

    return app


app = create_app()