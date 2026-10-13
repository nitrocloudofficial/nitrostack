import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 11 * inch - 36, "AGENT NEXUS — TECHNICAL SPECIFICATION & SOLUTION BRIEF")
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.5)
            self.line(54, 11 * inch - 42, 8.5 * inch - 54, 11 * inch - 42)
            
        # Footer
        footer_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(8.5 * inch - 54, 36, footer_text)
        self.drawString(54, 36, "CONFIDENTIAL & PROPRIETARY — METAMINDZ HACKATHON 2026")
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(54, 48, 8.5 * inch - 54, 48)
        
        self.restoreState()

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    # Custom Palette
    c_primary = colors.HexColor("#0F172A")   # Dark Slate
    c_accent = colors.HexColor("#0284C7")    # Cyan / Electric Blue
    c_sub = colors.HexColor("#475569")       # Muted Slate
    c_bg_light = colors.HexColor("#F8FAFC")  # Light Slate BG
    c_border = colors.HexColor("#CBD5E1")

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Title'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=c_primary,
        alignment=0,
        spaceAfter=6
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=c_accent,
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=c_primary,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=c_accent,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=c_primary,
        spaceAfter=8
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=body_style,
        leftIndent=15,
        spaceAfter=4
    )

    tech_term_style = ParagraphStyle(
        'TechTerm',
        parent=body_style,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor("#0369A1")
    )

    story = []

    # --- COVER / TITLE BLOCK ---
    story.append(Paragraph("AGENT NEXUS", title_style))
    story.append(Paragraph("Autonomous Manufacturing Decision Twin & Multi-Agent AI OS | Technical Solution Brief", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=c_accent, spaceBefore=0, spaceAfter=12))

    # --- SECTION 1: PROBLEM STATEMENT & EXECUTIVE SUMMARY ---
    story.append(Paragraph("1. Executive Summary & Problem Statement", h1_style))
    story.append(Paragraph(
        "<b>The Industrial Challenge:</b> Global manufacturing enterprises lose over <b>$50 Billion annually</b> due to unplanned machine downtime. In high-throughput factories, a single CNC milling machine or hydraulic spindle breakdown costs an average of <b>$12,500 per hour</b> in lost production, idle labor, and customer SLA delivery penalties.",
        body_style
    ))
    story.append(Paragraph(
        "<b>The Flaw in Traditional Dashboards:</b> Current Industry 4.0 monitoring systems suffer from three critical bottlenecks:",
        body_style
    ))
    story.append(Paragraph("• <b>Static Data Without Autonomous Action:</b> Standard SCADA systems alert engineers when temperature or vibration spikes, but do not calculate financial tradeoffs or automatically trigger repair strategies.", bullet_style))
    story.append(Paragraph("• <b>Siloed Decision-Making:</b> Maintenance, Production, Inventory, Finance, and Safety teams operate in isolation, delaying consensus by hours or days.", bullet_style))
    story.append(Paragraph("• <b>Hallucination & Risk in LLMs:</b> Generic LLM chatbots lack deterministic physical telemetry constraints and risk generating unsafe operational advice.", bullet_style))
    
    story.append(Spacer(1, 8))

    # --- SECTION 2: THE AGENT NEXUS SOLUTION ---
    story.append(Paragraph("2. The Agent Nexus Solution", h1_style))
    story.append(Paragraph(
        "<b>Agent Nexus</b> transforms industrial decision-making from passive dashboards into an <b>Autonomous Decision Twin AI OS</b> powered by <b>10 specialized AI agents</b> collaborating via the official <b>NitroStack MCP (Model Context Protocol) framework</b>.",
        body_style
    ))

    # Table of 10 Agents
    agent_data = [
        [Paragraph("<b>Agent Name</b>", body_style), Paragraph("<b>Domain Role</b>", body_style), Paragraph("<b>Core Responsibility & MCP Tool Integration</b>", body_style)],
        [Paragraph("<b>SensorAgent</b>", body_style), Paragraph("Telemetry", body_style), Paragraph("Fetches real-time sensor streams via <code>get_sensor_data</code>; flags thermal & vibration anomalies.", body_style)],
        [Paragraph("<b>MaintenanceAgent</b>", body_style), Paragraph("Asset Health", body_style), Paragraph("Evaluates component wear % and calculates health scores via <code>check_machine_health</code>.", body_style)],
        [Paragraph("<b>ProductionAgent</b>", body_style), Paragraph("Operations", body_style), Paragraph("Analyzes active order throughput (3 orders) and capacity rerouting options.", body_style)],
        [Paragraph("<b>InventoryAgent</b>", body_style), Paragraph("Supply Chain", body_style), Paragraph("Queries spare part stock levels (P4 spindle bearings) via <code>check_inventory</code>.", body_style)],
        [Paragraph("<b>FinanceAgent</b>", body_style), Paragraph("Cost Optimization", body_style), Paragraph("Calculates downtime financial projections ($95k vs $485k) via <code>estimate_downtime_cost</code>.", body_style)],
        [Paragraph("<b>DevilsAdvocateAgent</b>", body_style), Paragraph("Reflection Layer", body_style), Paragraph("Challenges initial proposals for lack of evidence; calculates dissent risk scores (0.0 to 1.0).", body_style)],
        [Paragraph("<b>SafetyAgent</b>", body_style), Paragraph("SOP Compliance", body_style), Paragraph("Verifies compliance with OSHA & plant ISO 45001 safety standard operating procedures.", body_style)],
        [Paragraph("<b>HistoricalMemoryAgent</b>", body_style), Paragraph("RAG Incident Memory", body_style), Paragraph("Performs vector similarity search across historical incidents via <code>search_incident_history</code>.", body_style)],
        [Paragraph("<b>RenegotiateAgent</b>", body_style), Paragraph("Debate Resolution", body_style), Paragraph("Synthesizes multi-agent challenges and updates proposals with required telemetry evidence.", body_style)],
        [Paragraph("<b>PlantManager / JARVIS</b>", body_style), Paragraph("Supervisor", body_style), Paragraph("Converges multi-agent proposals into final actionable work orders and notifies operators.", body_style)],
    ]
    t_agents = Table(agent_data, colWidths=[1.4*inch, 1.1*inch, 4.5*inch])
    t_agents.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_bg_light),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_agents)

    story.append(Spacer(1, 10))

    # --- SECTION 3: KEY TECHNICAL TERMINOLOGY ---
    story.append(Paragraph("3. Technical Architecture & Core Terminology", h1_style))

    tech_terms = [
        ("NitroStack MCP Framework", "The official Model Context Protocol (MCP) TypeScript framework using NestJS-style decorators (<code>@McpApp</code>, <code>@Module</code>, <code>@Controller</code>, <code>@Tool</code>) for modular tool, resource, and prompt registration."),
        ("Deterministic Physics Telemetry Engine", "A physics-based mathematical model deriving operational severity: <code>Severity = max(1.0, (Vibration / 5.0) * (Temp / 80.0))</code>. Ensures non-hallucinatory evaluation."),
        ("3-Strategy Quantitative Optimization", "Real-time cost/risk comparison across 3 operational states: <i>Continue Normal Operation</i> ($0 cost), <i>Operate at Reduced Capacity</i> (de-rated stress), and <i>Immediate Repair Required</i> ($95k vs $485k deferral risk)."),
        ("Reflection & Consensus Layer", "A two-round debate protocol where <code>DevilsAdvocateAgent</code> inspects evidence, issues vetoes/challenges, and mandates resolution before final decision convergence."),
        ("RAG (Retrieval-Augmented Generation)", "Vector similarity indexing over historical incident reports (e.g. <code>INC-2024-089</code> with 0.406 match) to ground agent recommendations in past factory precedents."),
        ("Streamable HTTP / SSE Transport", "Dual transport architecture serving live MCP tool streams over HTTP (<code>http://0.0.0.0:3000/mcp</code>) and SSE (<code>/sse</code>) compatible with Claude Desktop, Cursor, and NitroStudio."),
        ("Palantir & Tesla SCADA Interface", "High-contrast enterprise UI featuring dynamic 2D SVG factory twin maps, live telemetry sliders, animated KPI counters, and real-time agent execution visualizers.")
    ]

    for term, desc in tech_terms:
        story.append(Paragraph(f"• <b>{term}:</b> {desc}", bullet_style))

    story.append(Spacer(1, 10))

    # --- SECTION 4: DEMO VERIFICATION & RESULTS ---
    story.append(Paragraph("4. Empirical Test Case Matrix", h1_style))

    test_matrix = [
        [Paragraph("<b>Scenario</b>", body_style), Paragraph("<b>SCADA Telemetry Input</b>", body_style), Paragraph("<b>Engine Decision Output</b>", body_style), Paragraph("<b>Failure Risk</b>", body_style), Paragraph("<b>Net Savings vs Delay</b>", body_style)],
        [Paragraph("<b>Case 1: Healthy</b>", body_style), Paragraph("48.2°C, 1.2 mm/s, 1.2 bar", body_style), Paragraph("<font color='#16A34A'><b>Continue Normal Operation</b></font>", body_style), Paragraph("0.5%", body_style), Paragraph("$0", body_style)],
        [Paragraph("<b>Case 2: Moderate</b>", body_style), Paragraph("72.0°C, 4.5 mm/s, 2.1 bar", body_style), Paragraph("<font color='#D97706'><b>Operate at Reduced Capacity</b></font>", body_style), Paragraph("12.5%", body_style), Paragraph("+$42,100", body_style)],
        [Paragraph("<b>Case 3: Critical</b>", body_style), Paragraph("108.5°C, 14.2 mm/s, 3.8 bar", body_style), Paragraph("<font color='#DC2626'><b>Immediate Repair Required</b></font>", body_style), Paragraph("68.5%", body_style), Paragraph("<font color='#16A34A'><b>+$390,200</b></font>", body_style)],
    ]
    t_matrix = Table(test_matrix, colWidths=[1.3*inch, 1.8*inch, 2.2*inch, 0.8*inch, 0.9*inch])
    t_matrix.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_bg_light),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_matrix)

    story.append(Spacer(1, 14))
    story.append(HRFlowable(width="100%", thickness=1, color=c_border, spaceBefore=0, spaceAfter=8))
    story.append(Paragraph("<b>Submitted for MetaMindz Hackathon 2026</b> | Repository: <code>https://github.com/vishnu-murukan/Agenticai_metamindz</code>", ParagraphStyle('SubFoot', parent=body_style, fontName='Helvetica-Oblique', textColor=c_sub, alignment=1)))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[SUCCESS] Generated PDF successfully: {filename}")

if __name__ == '__main__':
    pdf_path = os.path.join(os.getcwd(), 'Agent_Nexus_Technical_Proposal.pdf')
    build_pdf(pdf_path)
