import fs from 'fs';
import path from 'path';
import os from 'os';
import PDFDocument from 'pdfkit';
import { Decision, Evidence, Conflict } from '../database/db-helpers.js';
import { RiskResult } from '../agents/risk.js';

export async function generatePdfReport(
    decision: Decision, 
    evidenceList: Evidence[], 
    conflicts: Conflict[], 
    risks: RiskResult
): Promise<string> {
    const reportDir = process.env.REPORT_DIR || 'reports';
    const cwd = process.cwd();
    const isBackendExpress = cwd.endsWith('backend-express');
    let resolvedReportDir = isBackendExpress 
        ? path.resolve(cwd, '..', reportDir) 
        : path.resolve(cwd, reportDir);

    try {
        if (!fs.existsSync(resolvedReportDir)) {
            fs.mkdirSync(resolvedReportDir, { recursive: true });
        }
    } catch (e: any) {
        resolvedReportDir = path.join(os.tmpdir(), 'reports');
        if (!fs.existsSync(resolvedReportDir)) {
            fs.mkdirSync(resolvedReportDir, { recursive: true });
        }
    }

    const filename = `verichain_report_${decision.id}.pdf`;
    const filePath = path.join(resolvedReportDir, filename);

    console.log(`Generating PDF report for Decision ID ${decision.id} at ${filePath}`);

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 40, size: 'LETTER' });
        const stream = fs.createWriteStream(filePath);
        
        doc.pipe(stream);

        // Colors
        const primaryColor = '#0d1b2a';
        const secondaryColor = '#e63946';
        const bodyTextColor = '#415a77';
        const tableHeaderBg = '#1b263b';
        
        // --- Header Tagline ---
        doc.fillColor(secondaryColor)
           .font('Helvetica-Bold')
           .fontSize(9)
           .text("VERICHAIN AI EVIDENCE PLATFORM", { paragraphGap: 2 });
           
        doc.fillColor('#778da9')
           .font('Helvetica-Oblique')
           .fontSize(9)
           .text("Trust Every AI Decision Through Verified Evidence", { paragraphGap: 10 });

        // Divider
        doc.lineWidth(2)
           .strokeColor(secondaryColor)
           .moveTo(40, doc.y)
           .lineTo(570, doc.y)
           .stroke();
        doc.moveDown(1.5);

        // --- Main Title ---
        doc.fillColor(primaryColor)
           .font('Helvetica-Bold')
           .fontSize(22)
           .text("Evidence Verification Report", { paragraphGap: 15 });

        // --- Metadata ---
        const metaY = doc.y;
        doc.font('Helvetica-Bold').fontSize(10).fillColor(primaryColor);
        doc.text("Report Date:", 40, metaY);
        doc.text("Decision ID:", 300, metaY);
        doc.text("Target Request:", 40, metaY + 18);
        doc.text("Status:", 300, metaY + 18);

        doc.font('Helvetica').fillColor(bodyTextColor);
        doc.text(new Date().toISOString().replace('T', ' ').substring(0, 19), 120, metaY);
        doc.text(String(decision.id), 380, metaY);
        doc.text(decision.query, 120, metaY + 18, { width: 170 });
        
        const status = decision.decision_status || "REVIEW";
        const statusColors: Record<string, string> = {
            "APPROVE": "#155724",
            "REJECT": "#721c24",
            "REVIEW": "#856404"
        };
        doc.font('Helvetica-Bold').fillColor(statusColors[status] || '#383d41');
        doc.text(status, 380, metaY + 18);

        doc.y = metaY + 45;
        doc.moveDown(0.5);

        // --- Recommendation Box ---
        const recBoxY = doc.y;
        const boxColors: Record<string, string> = {
            "APPROVE": "#d4edda",
            "REJECT": "#f8d7da",
            "REVIEW": "#fff3cd"
        };
        const boxBorderColors: Record<string, string> = {
            "APPROVE": "#c3e6cb",
            "REJECT": "#f5c6cb",
            "REVIEW": "#ffeeba"
        };
        
        doc.rect(40, recBoxY, 530, 50)
           .fillAndStroke(boxColors[status] || "#e2e3e5", boxBorderColors[status] || "#d6d8db");

        doc.fillColor(statusColors[status] || "#383d41")
           .font('Helvetica-Bold')
           .fontSize(12)
           .text(`RECOMMENDED ACTION: ${status}`, 55, recBoxY + 12);

        doc.font('Helvetica')
           .fontSize(9.5)
           .text(`Verification Confidence Score: ${Math.round(decision.confidence_score * 100)}% | Risk Level: ${risks.overall_risk_score || 0}%`, 55, recBoxY + 28);

        doc.y = recBoxY + 50;
        doc.moveDown(1.5);

        // --- Executive Summary ---
        doc.fillColor('#1b263b')
           .font('Helvetica-Bold')
           .fontSize(14)
           .text("Executive Summary", { paragraphGap: 8 });
           
        doc.fillColor(bodyTextColor)
           .font('Helvetica')
           .fontSize(10)
           .text("VeriChain AI has evaluated the query using a multi-agent orchestration graph designed to fetch, analyze, verify, and cross-reference records. This report contains the complete evidence lineage supporting this decision.", { paragraphGap: 10 });
           
        // Clean markdown syntax from explanation
        const cleanedExplanation = decision.explanation
            .replace(/###\s+/g, '')
            .replace(/\*\*/g, '')
            .replace(/\n\n/g, '\n');
            
        doc.fillColor(bodyTextColor)
           .fontSize(10)
           .text(cleanedExplanation, { lineGap: 3, paragraphGap: 10 });

        doc.moveDown(1);

        // Helper to draw structured grid tables
        const drawGridTable = (
            title: string, 
            headers: string[], 
            rows: string[][], 
            colWidths: number[],
            headerBg: string,
            headerTextCol: string
        ) => {
            doc.fillColor('#1b263b')
               .font('Helvetica-Bold')
               .fontSize(14)
               .text(title, { paragraphGap: 8 });

            const startX = 40;
            let currentY = doc.y;

            // Draw headers
            doc.font('Helvetica-Bold').fontSize(9);
            doc.rect(startX, currentY, colWidths.reduce((a, b) => a + b, 0), 20).fill(headerBg);
            
            let xOffset = startX;
            headers.forEach((h, idx) => {
                doc.fillColor(headerTextCol).text(h, xOffset + 6, currentY + 6, { width: colWidths[idx] - 12 });
                xOffset += colWidths[idx];
            });

            currentY += 20;

            // Draw rows
            doc.font('Helvetica').fontSize(8.5).fillColor(bodyTextColor);
            rows.forEach((row) => {
                // Determine row height by checking max text height
                let maxLines = 1;
                row.forEach((cell, idx) => {
                    const width = colWidths[idx] - 12;
                    const lines = doc.heightOfString(cell, { width }) / 11;
                    if (lines > maxLines) maxLines = lines;
                });
                
                const rowHeight = Math.ceil(maxLines) * 11 + 10;

                // Check for page overflow
                if (currentY + rowHeight > 750) {
                    doc.addPage();
                    currentY = 40;
                    // Redraw headers on new page
                    doc.font('Helvetica-Bold').fontSize(9);
                    doc.rect(startX, currentY, colWidths.reduce((a, b) => a + b, 0), 20).fill(headerBg);
                    
                    let newXOffset = startX;
                    headers.forEach((h, idx) => {
                        doc.fillColor(headerTextCol).text(h, newXOffset + 6, currentY + 6, { width: colWidths[idx] - 12 });
                        newXOffset += colWidths[idx];
                    });
                    currentY += 20;
                    doc.font('Helvetica').fontSize(8.5).fillColor(bodyTextColor);
                }

                // Alternating backgrounds (optional, lets do grid lines)
                doc.rect(startX, currentY, colWidths.reduce((a, b) => a + b, 0), rowHeight).strokeColor('#e2e3e5').stroke();

                let rowX = startX;
                row.forEach((cell, idx) => {
                    doc.fillColor(bodyTextColor).text(cell, rowX + 6, currentY + 6, { width: colWidths[idx] - 12 });
                    rowX += colWidths[idx];
                });
                
                currentY += rowHeight;
            });

            doc.y = currentY + 15;
        };

        // --- Risk Matrix Table ---
        const riskHeaders = ["Category", "Risk Level (%)", "Assessment Status"];
        const riskRows = [
            ["Financial Risk", `${risks.financial_risk || 0}%`, risks.financial_risk > 40 ? "Elevated" : "Minimal"],
            ["Compliance Risk", `${risks.compliance_risk || 0}%`, risks.compliance_risk > 40 ? "Elevated" : "Minimal"],
            ["Operational Risk", `${risks.operational_risk || 0}%`, risks.operational_risk > 40 ? "Elevated" : "Minimal"],
            ["Business Risk", `${risks.business_risk || 0}%`, risks.business_risk > 40 ? "Elevated" : "Minimal"]
        ];
        drawGridTable("Multi-Dimensional Risk Matrix", riskHeaders, riskRows, [160, 160, 210], '#f1faee', '#1d3557');
        doc.moveDown(0.5);

        // --- Evidence Table ---
        if (evidenceList.length > 0) {
            const evHeaders = ["Doc Source", "Entity", "Claim Description", "Credibility"];
            const evRows = evidenceList.map(ev => [
                ((ev as any).doc_name || `Doc ${ev.doc_id}`).substring(0, 20),
                (ev.entity || "").substring(0, 20),
                ev.claim || "",
                `${Math.round((ev.credibility_score || 0) * 100)}%`
            ]);
            drawGridTable("Verified Evidence Registry", evHeaders, evRows, [110, 110, 260, 50], tableHeaderBg, '#ffffff');
            doc.moveDown(0.5);
        }

        // --- Conflicts Table ---
        const cfHeaders = ["Conflict Type", "Severity", "Description"];
        if (conflicts.length > 0) {
            const cfRows = conflicts.map(cf => [
                (cf.conflict_type || "mismatch").toUpperCase().replace(/_/g, ' '),
                (cf.severity || "medium").toUpperCase(),
                cf.description || ""
            ]);
            drawGridTable("Detected Conflicts & Discrepancies", cfHeaders, cfRows, [130, 80, 320], '#f8d7da', '#721c24');
        } else {
            doc.fillColor('#1b263b')
               .font('Helvetica-Bold')
               .fontSize(14)
               .text("Detected Conflicts & Discrepancies", { paragraphGap: 8 });
            doc.fillColor('#155724')
               .font('Helvetica')
               .fontSize(9.5)
               .text("✓ Zero conflicts detected. Document versions and approvals align.", { paragraphGap: 10 });
        }

        doc.end();

        stream.on('finish', () => {
            console.log("PDF generation complete.");
            resolve(filePath);
        });

        stream.on('error', (err) => {
            console.error("PDF stream error:", err);
            reject(err);
        });
    });
}
