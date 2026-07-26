"""Export Markdown documentation to PDF."""

from pathlib import Path

import markdown


class Exporter:
    """Converts Markdown into a styled PDF."""

    def export_pdf(self, markdown_text: str, output_path: str) -> Path:
        """Generate a PDF from Markdown."""

        try:
            from xhtml2pdf import pisa
        except ImportError as exc:
            raise RuntimeError(
                "PDF export is unavailable because xhtml2pdf is not "
                "installed. Run: pip install xhtml2pdf"
            ) from exc

        target = Path(output_path)
        target.parent.mkdir(parents=True, exist_ok=True)

        html_body = markdown.markdown(
            markdown_text,
            extensions=["extra", "sane_lists"],
        )

        html_document = f"""\
<html>
<head>
<style>
  @page {{
    size: a4;
    margin: 2cm;
  }}
  body {{
    font-family: Helvetica, Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.5;
    color: #333;
  }}
  h1 {{
    font-size: 18pt;
    color: #17365d;
    margin-top: 1.5em;
    border-bottom: 2px solid #17365d;
    padding-bottom: 4px;
  }}
  h2 {{
    font-size: 14pt;
    color: #17365d;
    margin-top: 1.2em;
  }}
  h3 {{
    font-size: 12pt;
    color: #17365d;
    margin-top: 1em;
  }}
  p {{
    margin: 0.5em 0;
  }}
  img {{
    max-width: 100%;
    height: auto;
  }}
  blockquote {{
    margin: 0.5em 0;
    padding: 0.5em 1em;
    border-left: 4px solid #ccc;
    background: #f9f9f9;
    font-style: italic;
  }}
  code {{
    font-family: "Courier New", monospace;
    font-size: 10pt;
    background: #f4f4f4;
    padding: 1px 4px;
  }}
  pre {{
    background: #f4f4f4;
    padding: 0.8em;
    font-size: 10pt;
    border: 1px solid #ddd;
  }}
  li {{
    margin: 0.3em 0;
  }}
</style>
</head>
<body>
{html_body}
</body>
</html>"""

        with target.open("wb") as pdf_buffer:
          result = pisa.CreatePDF(
          src=html_document,
          dest=pdf_buffer,
          encoding="utf-8",
    )

        if result.err:
            raise RuntimeError(
                f"PDF generation failed: {result.err}"
            )

        return target
