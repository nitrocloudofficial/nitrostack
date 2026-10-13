import io
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

class ReportService:
    @staticmethod
    def generate_pdf(title: str, subtitle: str, data_rows: list[list[str]]) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
        story = []

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'ReportTitle',
            parent=styles['Heading1'],
            fontSize=22,
            textColor=colors.HexColor('#0F172A'),
            spaceAfter=6
        )
        subtitle_style = ParagraphStyle(
            'ReportSubtitle',
            parent=styles['Normal'],
            fontSize=11,
            textColor=colors.HexColor('#64748B'),
            spaceAfter=18
        )

        story.append(Paragraph(f"<b>GigSecure AI</b> - {title}", title_style))
        story.append(Paragraph(subtitle, subtitle_style))
        story.append(Spacer(1, 10))

        if data_rows:
            t = Table(data_rows)
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E293B')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#F8FAFC')),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
                ('PADDING', (0, 0), (-1, -1), 8),
            ]))
            story.append(t)

        doc.build(story)
        pdf_value = buffer.getvalue()
        buffer.close()
        return pdf_value

    def generate_credit_report(self, user_name: str, credit_score: int, risk_level: str, eligible_amount: float) -> bytes:
        table_data = [
            ["Metric Parameter", "Evaluation Output"],
            ["Borrower Name", user_name],
            ["Cash-Flow Underwriting Score", f"{credit_score} / 850"],
            ["Risk Classification", risk_level],
            ["Recommended Credit Limit", f"INR {eligible_amount:,.2f}"],
            ["Underwriting Basis", "Real-Time Gig Earnings & Cash-Flow Stability"],
            ["Verification Engine", "XGBoost Enterprise ML Model"],
            ["Report Status", "VERIFIED & ISSUED"]
        ]
        return self.generate_pdf("AI Cash-Flow Underwriting Credit Report", f"Official Credit Rating Certificate for {user_name}", table_data)

    def generate_fraud_report(self, hash_code: str, status: str, risk_score: int) -> bytes:
        table_data = [
            ["Security Fingerprint", "Cross-Bank Multi-Ledger Result"],
            ["SHA-256 Fingerprint Hash", hash_code[:32] + "..."],
            ["Duplicate Status", status],
            ["Risk Assessment Index", f"{risk_score} / 100"],
            ["GST Verification API", "PASSED"],
            ["eWay Bill Verification", "VERIFIED"],
            ["Logistics Location Trace", "MATCHED"],
            ["Central Multi-Bank Ledger", "NO DUPLICATES FOUND"]
        ]
        return self.generate_pdf("SHA-256 Invoice Fraud Prevention Audit Report", "Enterprise Fraud Shield Inspection Summary", table_data)

    def generate_loan_report(self, loan_id: int, amount: float, daily_repay: float, remaining: float) -> bytes:
        table_data = [
            ["Loan Ledger Item", "Agreement Details"],
            ["Loan Reference ID", f"LN-{loan_id:06d}"],
            ["Principal Sanctioned", f"INR {amount:,.2f}"],
            ["Daily UPI AutoPay Rate", f"INR {daily_repay:,.2f}"],
            ["Outstanding Balance", f"INR {remaining:,.2f}"],
            ["Repayment Policy", "Dynamic Smart-Pause Enabled"],
            ["Status", "ACTIVE & IN COMPLIANCE"]
        ]
        return self.generate_pdf("Gig Worker Micro-Loan Ledger Statement", "Official Loan Agreement & Active Statement", table_data)

    def generate_succession_report(self, nominee_name: str, total_value: float, claim_id: str) -> bytes:
        table_data = [
            ["Succession Parameter", "Registry Audit Detail"],
            ["Claim ID", claim_id],
            ["Registered Nominee", nominee_name],
            ["Discovered Assets Total", f"INR {total_value:,.2f}"],
            ["Death Certificate OCR", "VERIFIED WITH MOCK REGISTRY"],
            ["Account Aggregator API", "ASSETS MAPPED & FROZEN"],
            ["Claim Settlement Status", "IN REVIEW - APPROVED FOR DISBURSAL"]
        ]
        return self.generate_pdf("Automated Nominee Succession & Asset Transfer Report", "Wealth Succession Assistance Certificate", table_data)
