from app.workspace.models import WorkspaceSession, ExportFormat

class ExportService:
    @staticmethod
    def export(workspace: WorkspaceSession, format: ExportFormat) -> str:
        if format == 'markdown':
            return ExportService._to_markdown(workspace)
        elif format == 'html':
            return ExportService._to_html(workspace)
        elif format == 'bibtex':
            return ExportService._to_bibtex(workspace)
        else:
            raise ValueError(f"Unsupported format {format}")

    @staticmethod
    def _to_markdown(workspace: WorkspaceSession) -> str:
        lines = [f"# Research Report: {workspace.query}", ""]
        
        for section in workspace.sections:
            lines.append(f"## {section.title}")
            lines.append(section.content)
            lines.append("")
            
            if section.insights:
                for idx, insight in enumerate(section.insights, 1):
                    lines.append(f"### Insight {idx}: {insight.title} (Confidence: {insight.confidence:.0%})")
                    lines.append(f"**Description**: {insight.description}")
                    lines.append(f"**Reasoning**: {insight.reasoning}")
                    lines.append("")
                    
        return "\n".join(lines)

    @staticmethod
    def _to_html(workspace: WorkspaceSession) -> str:
        html = [
            "<!DOCTYPE html>",
            "<html>",
            "<head>",
            f"<title>{workspace.query} - Invenio Report</title>",
            "<style>body{font-family:sans-serif; line-height:1.6; max-width:800px; margin:0 auto; padding:2rem;}</style>",
            "</head>",
            "<body>",
            f"<h1>Research Report: {workspace.query}</h1>"
        ]
        
        for section in workspace.sections:
            html.append(f"<h2>{section.title}</h2>")
            html.append(f"<p>{section.content}</p>")
            
            if section.insights:
                for insight in section.insights:
                    html.append("<div style='background:#f4f4f4; padding:1rem; margin-bottom:1rem; border-radius:8px;'>")
                    html.append(f"<h3>{insight.title} <small>(Conf: {insight.confidence:.0%})</small></h3>")
                    html.append(f"<p><strong>Description:</strong> {insight.description}</p>")
                    html.append(f"<p><strong>Reasoning:</strong> {insight.reasoning}</p>")
                    html.append("</div>")
                    
        html.append("</body></html>")
        return "\n".join(html)

    @staticmethod
    def _to_bibtex(workspace: WorkspaceSession) -> str:
        # Mock BibTeX export
        return f"% Auto-generated BibTeX for {workspace.query}\n% Invenio AI Research Copilot\n"
