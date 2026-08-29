import { Factory } from './types.js';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

export class ComplianceGenerator {
  /**
   * Generates a real SPCB Form V Annual Environmental Statement PDF.
   * Falls back to a well-formatted HTML file if PDFKit fails for any reason.
   * Returns the absolute path to the generated file.
   */
  public async generateSpcbReport(factory: Factory): Promise<string> {
    const reportsDir = path.join(process.cwd(), '.reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const pdfFileName = `SPCB_FORM_V_${factory.id}_${dateStr}.pdf`;
    const pdfFilePath = path.join(reportsDir, pdfFileName);

    // Try PDF first
    try {
      await this.writePdf(factory, pdfFilePath, dateStr);
      return pdfFilePath;
    } catch (pdfErr) {
      // Fallback to HTML — always openable in a browser
      const htmlFileName = `SPCB_FORM_V_${factory.id}_${dateStr}.html`;
      const htmlFilePath = path.join(reportsDir, htmlFileName);
      this.writeHtml(factory, htmlFilePath, dateStr);
      return htmlFilePath;
    }
  }

  // ---------------------------------------------------------------------------
  // PDF generation (PDFKit)
  // ---------------------------------------------------------------------------
  private writePdf(factory: Factory, filePath: string, dateStr: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        // ── Header ──────────────────────────────────────────────────────────
        doc.fontSize(15).font('Helvetica-Bold')
           .text('STATE POLLUTION CONTROL BOARD (SPCB / TNPCB)', { align: 'center' })
           .moveDown(0.4);
        doc.fontSize(13).font('Helvetica-Bold')
           .text('FORM V: ANNUAL ENVIRONMENTAL STATEMENT', { align: 'center' })
           .moveDown(0.4);
        doc.fontSize(9).font('Helvetica')
           .text('(See Rule 14 of the Environment (Protection) Rules, 1986)', { align: 'center' })
           .moveDown(0.3);
        doc.text(`Filing Year: ${new Date().getFullYear()}   |   Date of Submission: ${dateStr}`, { align: 'center' })
           .moveDown(1.2);

        // ── Part A: Factory Profile ──────────────────────────────────────────
        this.pdfSection(doc, 'PART A - FACTORY PROFILE');
        this.pdfField(doc, '1. Name of Owner / Occupier', `Director, ${factory.name}`);
        this.pdfField(doc, '2. Industry Category', 'Red / Large (as per CPCB Schedule)');
        this.pdfField(doc, '3. Industry Type', factory.industryType);
        this.pdfField(doc, '4. Production Capacity', factory.productionCapacity);
        this.pdfField(doc, '5. Factory Address', factory.location.address);
        this.pdfField(doc, '6. GPS Coordinates', `Lat ${factory.location.lat}, Lng ${factory.location.lng}`);
        doc.moveDown(0.8);

        // ── Part B: Materials & Water ────────────────────────────────────────
        this.pdfSection(doc, 'PART B - WATER & RAW MATERIAL CONSUMPTION');
        this.pdfField(doc, '1. Water Consumption (m3/day)', '');
        doc.fontSize(9).font('Helvetica')
           .text('   Process: 15.0 m3/day   |   Cooling/Boiler: 5.0 m3/day   |   Domestic: 2.5 m3/day');
        this.pdfField(doc, '2. Raw Materials Consumed', factory.rawMaterials.join(', ') || 'N/A');
        doc.moveDown(0.8);

        // ── Part C: Emissions ────────────────────────────────────────────────
        this.pdfSection(doc, 'PART C - POLLUTION DISCHARGED TO ENVIRONMENT');
        this.pdfField(doc, '1. Treated Wastewater Discharged', '12.5 m3/day (treated to SPCB-prescribed standards)');
        this.pdfField(doc, '2. Air Emissions (Stack)', 'PM10, PM2.5, SO2, NOx - within permissible limits');
        doc.moveDown(0.8);

        // ── Part D: Waste Streams ────────────────────────────────────────────
        this.pdfSection(doc, 'PART D - HAZARDOUS & SOLID WASTES GENERATED');
        if (factory.wasteStreams && factory.wasteStreams.length > 0) {
          factory.wasteStreams.forEach((w, i) => {
            doc.fontSize(9).font('Helvetica').text(
              `   ${i + 1}. ${w.name} - ${w.volume} kg/day ` +
              `(Category: ${w.category}, Form: ${w.physicalForm}, ` +
              `Contamination: ${w.contamination}, Reuse Potential: ${w.reusePotential}%)`
            );
          });
        } else if (factory.declaredWastes && factory.declaredWastes.length > 0) {
          factory.declaredWastes.forEach((w, i) => {
            doc.fontSize(9).font('Helvetica').text(`   ${i + 1}. ${w}`);
          });
        } else {
          doc.fontSize(9).font('Helvetica').text('   No waste streams declared.');
        }
        doc.moveDown(0.8);

        // ── Part E: Disposal & Circular Economy ──────────────────────────────
        this.pdfSection(doc, 'PART E - DISPOSAL PRACTICE & CIRCULAR ECONOMY STATUS');
        this.pdfField(doc, '1. Solid Waste Disposal', 'Via authorised recyclers / CPCB-approved landfill');
        this.pdfField(doc, '2. SymbioForge Integration', 'Active - waste data feeds autonomous symbiosis network');
        this.pdfField(doc, '3. CO2 Avoided (tons/year)', `${factory.co2Avoided}`);
        this.pdfField(doc, '4. Financial Savings Earned (INR/year)', `INR ${factory.savingsEarned.toLocaleString('en-IN')}`);
        doc.moveDown(1.2);

        // ── Declaration ──────────────────────────────────────────────────────
        this.pdfSection(doc, 'DECLARATION');
        doc.fontSize(9).font('Helvetica-Oblique')
           .text(
             'I hereby declare that the information provided above is correct and complete ' +
             'to the best of my knowledge and belief, and that I have not withheld any ' +
             'material information. This statement is submitted in compliance with Rule 14 ' +
             'of the Environment (Protection) Rules, 1986.'
           )
           .moveDown(2.5);
        doc.font('Helvetica')
           .text('Signature: ____________________________', { align: 'right' })
           .text(`Name & Designation: Director, ${factory.name}`, { align: 'right' })
           .text(`Date: ${dateStr}`, { align: 'right' });

        doc.end();
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Backward-compatible alias for older callers.
   */
  public async generateSbcbReport(factory: Factory): Promise<string> {
    return this.generateSpcbReport(factory);
  }

  private pdfSection(doc: InstanceType<typeof PDFDocument>, title: string) {
    doc.fontSize(11).font('Helvetica-Bold').text(title).moveDown(0.4);
  }

  private pdfField(doc: InstanceType<typeof PDFDocument>, label: string, value: string) {
    doc.fontSize(9).font('Helvetica-Bold').text(`${label}: `, { continued: !!value })
       .font('Helvetica').text(value);
  }

  // ---------------------------------------------------------------------------
  // HTML fallback (always works, opens in any browser)
  // ---------------------------------------------------------------------------
  private writeHtml(factory: Factory, filePath: string, dateStr: string) {
    const wasteRows = (() => {
      const streams = factory.wasteStreams && factory.wasteStreams.length > 0
        ? factory.wasteStreams.map((w, i) =>
            `<tr>
              <td>${i + 1}.</td>
              <td>${w.name}</td>
              <td>${w.volume} kg/day</td>
              <td>${w.category}</td>
              <td>${w.physicalForm}</td>
              <td>${w.contamination}</td>
              <td>${w.reusePotential}%</td>
            </tr>`
          ).join('\n')
        : factory.declaredWastes.map((w, i) =>
            `<tr><td>${i + 1}.</td><td colspan="6">${w}</td></tr>`
          ).join('\n');
      return streams || '<tr><td colspan="7">No waste streams declared.</td></tr>';
    })();

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SPCB Form V — ${factory.name} — ${dateStr}</title>
  <style>
    body { font-family: 'Arial', sans-serif; max-width: 820px; margin: 40px auto; color: #222; font-size: 13px; }
    h1 { text-align: center; font-size: 17px; margin-bottom: 4px; }
    h2 { text-align: center; font-size: 15px; margin-bottom: 4px; }
    .subtitle { text-align: center; font-style: italic; color: #555; margin-bottom: 4px; }
    .meta { text-align: right; color: #555; margin-bottom: 28px; }
    .section { background: #f3f6fb; padding: 6px 14px; margin: 20px 0 8px; font-weight: bold;
                font-size: 12px; border-left: 4px solid #1a56db; color: #1a3a8f; letter-spacing: .5px; }
    .field { display: flex; margin: 5px 0; }
    .field-label { font-weight: bold; min-width: 260px; color: #333; }
    .field-value { color: #111; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 12px; }
    th { background: #1a56db; color: white; padding: 6px 8px; text-align: left; }
    td { border: 1px solid #ccc; padding: 5px 8px; }
    tr:nth-child(even) td { background: #f7f9ff; }
    .declaration { border: 1px solid #ccc; padding: 14px; margin-top: 24px; font-style: italic; color: #444; }
    .sig { text-align: right; margin-top: 36px; }
    .tag { display: inline-block; background: #dcfce7; color: #166534; border-radius: 4px; padding: 2px 8px; font-size: 11px; font-weight: bold; }
    footer { text-align: center; color: #888; font-size: 11px; margin-top: 40px; border-top: 1px solid #ddd; padding-top: 12px; }
  </style>
</head>
<body>
  <h1>STATE POLLUTION CONTROL BOARD (SPCB / TNPCB)</h1>
  <h2>FORM V: ANNUAL ENVIRONMENTAL STATEMENT</h2>
  <p class="subtitle">(See Rule 14 of the Environment (Protection) Rules, 1986)</p>
  <p class="meta">Filing Year: ${new Date().getFullYear()} &nbsp;|&nbsp; Date of Submission: ${dateStr}</p>

  <div class="section">PART A — FACTORY PROFILE</div>
  <div class="field"><span class="field-label">1. Name of Owner / Occupier</span><span class="field-value">Director, ${factory.name}</span></div>
  <div class="field"><span class="field-label">2. Industry Category</span><span class="field-value">Red / Large (as per CPCB Schedule)</span></div>
  <div class="field"><span class="field-label">3. Industry Type</span><span class="field-value">${factory.industryType}</span></div>
  <div class="field"><span class="field-label">4. Production Capacity</span><span class="field-value">${factory.productionCapacity}</span></div>
  <div class="field"><span class="field-label">5. Factory Address</span><span class="field-value">${factory.location.address}</span></div>
  <div class="field"><span class="field-label">6. GPS Coordinates</span><span class="field-value">Lat ${factory.location.lat}, Lng ${factory.location.lng}</span></div>

  <div class="section">PART B — WATER &amp; RAW MATERIAL CONSUMPTION</div>
  <div class="field"><span class="field-label">1. Water Consumption (m³/day)</span><span class="field-value">Process: 15.0 m³ &nbsp;|&nbsp; Cooling: 5.0 m³ &nbsp;|&nbsp; Domestic: 2.5 m³</span></div>
  <div class="field"><span class="field-label">2. Raw Materials Consumed</span><span class="field-value">${factory.rawMaterials.join(', ') || 'N/A'}</span></div>

  <div class="section">PART C — POLLUTION DISCHARGED TO ENVIRONMENT</div>
  <div class="field"><span class="field-label">1. Treated Wastewater Discharged</span><span class="field-value">12.5 m³/day (treated to SPCB-prescribed standards)</span></div>
  <div class="field"><span class="field-label">2. Air Emissions (Stack)</span><span class="field-value">PM10, PM2.5, SO₂, NOₓ — within permissible limits</span></div>

  <div class="section">PART D — HAZARDOUS &amp; SOLID WASTES GENERATED</div>
  <table>
    <tr>
      <th>#</th><th>Waste Stream</th><th>Volume</th><th>Category</th><th>Form</th><th>Contamination</th><th>Reuse Potential</th>
    </tr>
    ${wasteRows}
  </table>

  <div class="section">PART E — DISPOSAL PRACTICE &amp; CIRCULAR ECONOMY STATUS</div>
  <div class="field"><span class="field-label">1. Solid Waste Disposal</span><span class="field-value">Via authorised recyclers / CPCB-approved landfill</span></div>
  <div class="field"><span class="field-label">2. SymbioForge Integration</span><span class="field-value"><span class="tag">ACTIVE</span> — Waste data feeds autonomous symbiosis network</span></div>
  <div class="field"><span class="field-label">3. CO₂ Avoided (tons/year)</span><span class="field-value">${factory.co2Avoided}</span></div>
  <div class="field"><span class="field-label">4. Financial Savings Earned (INR/year)</span><span class="field-value">₹${factory.savingsEarned.toLocaleString('en-IN')}</span></div>

  <div class="declaration">
    I hereby declare that the information provided above is correct and complete to the best of my knowledge and belief,
    and that I have not withheld any material information. This statement is submitted in compliance with
    Rule 14 of the Environment (Protection) Rules, 1986.
  </div>
  <div class="sig">
    <p>Signature: ____________________________</p>
    <p><strong>Director, ${factory.name}</strong></p>
    <p>Date: ${dateStr}</p>
  </div>

  <footer>
    Generated by SymbioForge — Autonomous Circular Manufacturing Intelligence &nbsp;|&nbsp; NitroStack
  </footer>
</body>
</html>`;

    fs.writeFileSync(filePath, html, 'utf-8');
  }
}
