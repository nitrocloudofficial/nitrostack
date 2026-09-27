from backend.services.report_service import ReportService

def generate_pdf_document(title: str, subtitle: str, data: list[list[str]]) -> bytes:
    return ReportService.generate_pdf(title, subtitle, data)
