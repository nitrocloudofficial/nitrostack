var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ToolDecorator as Tool, z } from '@nitrostack/core';
import { db } from '../../db/database.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
function decodeBase64File(content) {
    const matches = content.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    const base64Data = matches && matches.length === 3 ? matches[2] : content;
    return Buffer.from(base64Data, 'base64').toString('utf8');
}
export class TranscriptTools {
    async analyzeTranscript(input, ctx) {
        let text = input.transcriptText || '';
        // If a base64 file is uploaded
        if (input.file_content) {
            try {
                text = decodeBase64File(input.file_content);
                ctx.logger.info(`Successfully decoded uploaded transcript file: ${input.file_name}`);
            }
            catch (err) {
                return { success: false, error: 'Failed to decode base64 file content', details: err.message };
            }
        }
        if (!text.trim()) {
            return { success: false, error: 'No transcript text provided or file was empty.' };
        }
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return { success: false, error: 'GEMINI_API_KEY not found in environment' };
        }
        ctx.logger.info('Analyzing transcript using Gemini...');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-pro-latest" });
        const prompt = `
You are an expert AI meeting analyst. Analyze the following meeting transcript.
Extract all actions, events, risks, and progress status items mentioned.

Transcript:
"""
${text}
"""

Please categorize them exactly into these lists. For each item, extract the exact arguments needed:
1. **Tasks**:
   - title (string)
   - owner (string - name or role)
   - deadline (string - e.g. "Friday", "July 28")
2. **Calendar Events**:
   - summary (string - event title)
   - description (string)
   - startTime (ISO datetime e.g. "2026-07-28T10:00:00")
   - endTime (ISO datetime e.g. "2026-07-28T11:00:00")
3. **Risks**:
   - dependency (string - task or module name)
   - status (string - why it is delayed or blocked)
4. **Progress Checks**:
   - taskName (string)
   - status (string - "overdue" or "on_track")
   - action (string - mitigation action taken)
   - suggestion (string - reassignment or splitting suggestion)

Respond with ONLY a JSON object in this exact format:
{
  "tasks": [
    { "title": "...", "owner": "...", "deadline": "..." }
  ],
  "events": [
    { "summary": "...", "description": "...", "startTime": "...", "endTime": "..." }
  ],
  "risks": [
    { "dependency": "...", "status": "..." }
  ],
  "progress": [
    { "taskName": "...", "status": "...", "action": "...", "suggestion": "..." }
  ]
}

No markdown wrappers or backticks. Output raw JSON only. If a list has no items, return an empty array.
`;
        let resultJson;
        try {
            const response = await model.generateContent(prompt);
            const cleanedText = response.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
            resultJson = JSON.parse(cleanedText);
        }
        catch (e) {
            ctx.logger.warn('Gemini parsing error, using heuristic fallback parser: ' + e.message);
            // Fallback keyword/heuristic parser to protect demo during API outages
            resultJson = { tasks: [], events: [], risks: [], progress: [] };
            const lines = text.split(/[.!?\n]/);
            for (const line of lines) {
                const lower = line.toLowerCase();
                // 1. Heuristic Task Match
                if (lower.includes('task') || lower.includes('todo') || lower.includes('complete') || lower.includes('assign') || lower.includes('finish')) {
                    let owner = 'Team';
                    if (lower.includes('aksha'))
                        owner = 'Aksha';
                    else if (lower.includes('punith'))
                        owner = 'Punith';
                    else if (lower.includes('developer'))
                        owner = 'Developer';
                    let deadline = 'End of hackathon';
                    if (lower.includes('tomorrow'))
                        deadline = 'Tomorrow';
                    else if (lower.includes('friday'))
                        deadline = 'Friday';
                    else if (lower.includes('wednesday'))
                        deadline = 'Wednesday';
                    resultJson.tasks.push({
                        title: line.trim().substring(0, 100),
                        owner,
                        deadline
                    });
                }
                // 2. Heuristic Calendar Event Match
                if (lower.includes('schedule') || lower.includes('meeting') || lower.includes('calendar') || lower.includes('review') || lower.includes('call')) {
                    resultJson.events.push({
                        summary: line.trim().substring(0, 80),
                        description: 'Extracted automatically from transcript',
                        startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
                        endTime: new Date(Date.now() + 86400000 + 3600000).toISOString()
                    });
                }
                // 3. Heuristic Risk Match
                if (lower.includes('delay') || lower.includes('risk') || lower.includes('block') || lower.includes('stuck') || lower.includes('sick')) {
                    resultJson.risks.push({
                        dependency: line.trim().substring(0, 80),
                        status: 'Delayed or blocked task detected in dialogue.'
                    });
                }
                // 4. Heuristic Progress Match
                if (lower.includes('progress') || lower.includes('overdue') || lower.includes('track') || lower.includes('status')) {
                    resultJson.progress.push({
                        taskName: line.trim().substring(0, 80),
                        status: lower.includes('overdue') || lower.includes('behind') ? 'overdue' : 'on_track',
                        action: 'Heuristic check logged.',
                        suggestion: 'Evaluate team load.'
                    });
                }
            }
        }
        const report = [];
        // Save Tasks
        if (resultJson.tasks && resultJson.tasks.length > 0) {
            for (const t of resultJson.tasks) {
                await new Promise((resolve) => {
                    db.run(`INSERT INTO tasks (title, owner, deadline, status) VALUES (?, ?, ?, ?)`, [t.title, t.owner, t.deadline, 'active'], () => resolve());
                });
                report.push(`Task created: "${t.title}" for ${t.owner}`);
            }
        }
        // Save Calendar Events
        if (resultJson.events && resultJson.events.length > 0) {
            for (const ev of resultJson.events) {
                await new Promise((resolve) => {
                    db.run(`INSERT INTO calendar_events (summary, description, start_time, end_time, status) VALUES (?, ?, ?, ?, ?)`, [ev.summary, ev.description, ev.startTime, ev.endTime, 'upcoming'], () => resolve());
                });
                report.push(`Calendar event saved: "${ev.summary}"`);
            }
        }
        // Save Risks
        if (resultJson.risks && resultJson.risks.length > 0) {
            for (const r of resultJson.risks) {
                const isHigh = /delay|block|stuck|miss|late/i.test(r.status);
                const riskLevel = isHigh ? 'High' : 'Low';
                const suggestion = isHigh
                    ? `Suggest immediate reassignment or paired development.`
                    : 'Continue monitoring.';
                await new Promise((resolve) => {
                    db.run(`INSERT INTO risk_logs (dependency, status, risk_level, analysis, suggestion) VALUES (?, ?, ?, ?, ?)`, [r.dependency, r.status, riskLevel, `Risk analysis on ${r.dependency}: ${r.status}`, suggestion], () => resolve());
                });
                report.push(`Risk logged: "${r.dependency}" (${riskLevel} Risk)`);
            }
        }
        // Save Progress Checks
        if (resultJson.progress && resultJson.progress.length > 0) {
            for (const p of resultJson.progress) {
                await new Promise((resolve) => {
                    db.run(`INSERT INTO progress_logs (task_name, status, message, action, suggestion) VALUES (?, ?, ?, ?, ?)`, [p.taskName, p.status, `Progress check: ${p.status}`, p.action, p.suggestion], () => resolve());
                });
                report.push(`Progress check saved: "${p.taskName}" (${p.status})`);
            }
        }
        return {
            success: true,
            message: `Transcript analysis completed successfully!\n\n${report.join('\n') || 'No items extracted.'}\n\n— Haul makes life easier 🚀`,
            extracted: resultJson
        };
    }
    async exportTasksPdf(_input, ctx) {
        return new Promise((resolve) => {
            db.all(`SELECT * FROM tasks ORDER BY created_at DESC`, (err, rows) => {
                if (err) {
                    return resolve({ success: false, error: 'Database read error', details: err.message });
                }
                try {
                    const doc = new PDFDocument({ margin: 50 });
                    const fileName = 'tasks_summary.pdf';
                    const filePath = path.join(process.cwd(), fileName);
                    const stream = fs.createWriteStream(filePath);
                    doc.pipe(stream);
                    // Header
                    doc.fillColor('#0f172a').fontSize(26).text('Meeting 2 Mission — Haul', { align: 'center' });
                    doc.fontSize(12).fillColor('#64748b').text('Project Tasks Summary & Actions Report', { align: 'center' });
                    doc.moveDown(2);
                    // Divider Line
                    doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
                    doc.moveDown(1.5);
                    if (!rows || rows.length === 0) {
                        doc.fillColor('#64748b').fontSize(14).text('No tasks recorded in the database.', { align: 'center' });
                    }
                    else {
                        rows.forEach((task, idx) => {
                            doc.fillColor('#1e293b').fontSize(14).text(`${idx + 1}. ${task.title}`, { underline: true });
                            doc.fontSize(11).fillColor('#475569');
                            doc.text(`   👤 Owner: ${task.owner}`);
                            doc.text(`   📅 Deadline: ${task.deadline}`);
                            doc.text(`   ⚡ Status: ${task.status === 'completed' ? '✅ Completed' : '⏳ Active/Pending'}`);
                            doc.text(`   🕒 Created: ${task.created_at}`);
                            doc.moveDown(1);
                        });
                    }
                    // Footer
                    doc.moveDown(3);
                    doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
                    doc.moveDown(1);
                    doc.fontSize(10).fillColor('#94a3b8').text('Report generated automatically by Haul Assistant.', { align: 'center' });
                    doc.fontSize(12).fillColor('#3b82f6').text('— Haul makes life easier 🚀', { align: 'center' });
                    doc.end();
                    stream.on('finish', () => {
                        resolve({
                            success: true,
                            message: `📄 Tasks summary PDF generated successfully!\nSaved to: ${filePath}\n\n— Haul makes life easier 🚀`,
                            filePath: filePath,
                            fileName: fileName
                        });
                    });
                    stream.on('error', (streamErr) => {
                        resolve({ success: false, error: 'Failed to write PDF file stream', details: streamErr.message });
                    });
                }
                catch (pdfErr) {
                    resolve({ success: false, error: 'Failed to construct PDF document', details: pdfErr.message });
                }
            });
        });
    }
}
__decorate([
    Tool({
        name: 'analyze_transcript',
        description: `Analyzes a Google Meet meeting transcript (uploaded as a file or passed as text). 
Splits the content into tasks, calendar events, risks, and progress checks, and automatically saves them into the respective agent databases.`,
        inputSchema: z.object({
            transcriptText: z.string().optional().describe('Raw transcript text if pasted directly'),
            file_name: z.string().optional().describe('Name of the uploaded transcript file'),
            file_type: z.string().optional().describe('MIME type of the uploaded file'),
            file_content: z.string().optional().describe('Base64 encoded file content of the transcript')
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], TranscriptTools.prototype, "analyzeTranscript", null);
__decorate([
    Tool({
        name: 'export_tasks_pdf',
        description: 'Generates a beautifully styled PDF of all tasks currently in the project database and saves it to the workspace.',
        inputSchema: z.object({})
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], TranscriptTools.prototype, "exportTasksPdf", null);
