import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load from .env — look up one directory since server.js is in /frontend
// Always override so stale values in shell env don't interfere
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (key) process.env[key] = val; // always override
      }
    }
  }
  console.log(`📂 Loaded .env from: ${envPath}`);
} else {
  console.warn(`⚠️  .env not found at: ${envPath}`);
}

const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
// Use the JWT anon key (starts with eyJ...) — publishable key prefix won't work with REST API
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const MODEL_NAME = 'llama-3.3-70b-versatile';

console.log('═══════════════════════════════════════════════════');
console.log('  🏥  NitroProj Agno Health Expert Triage Server');
console.log('═══════════════════════════════════════════════════');
console.log(`  🔑 GROQ API:    ${GROQ_API_KEY ? '✅ Configured' : '❌ Missing (set GROQ_API_KEY in .env)'}`);
console.log(`  🗄️  Supabase:   ${SUPABASE_URL ? '✅ Configured' : '❌ Missing (set SUPABASE_URL in .env)'}`);
console.log(`  🔐 Supabase Key: ${SUPABASE_KEY
    ? (SUPABASE_KEY.startsWith('eyJ') ? '✅ JWT anon key (valid)' : SUPABASE_KEY.startsWith('sb_') ? '⚠️  Publishable key — needs JWT eyJ... key' : '⚠️  Unknown format')
    : '❌ Missing'}`,);
console.log('═══════════════════════════════════════════════════');

/* ── Groq LLM Helper ── */
async function callGroqLLM(systemPrompt, userPrompt) {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not set in .env');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL_NAME,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices?.[0]?.message?.content || '{}');
}

/* ── Supabase REST Helper ── */
async function supabaseQuery(method, table, body = null, query = '', extraHeaders = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=representation',
        ...extraHeaders
      }
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    const text = await res.text();
    if (!res.ok) {
      console.warn(`⚠️  Supabase ${method} ${table} → ${res.status}: ${text}`);
      return null;
    }
    return text ? JSON.parse(text) : null;
  } catch (err) {
    console.error('❌ Supabase error:', err.message);
    return null;
  }
}

/* ── CORS Headers ── */
function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');
}

/* ── Parse JSON Body ── */
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); }
      catch (e) { reject(new Error('Invalid JSON body')); }
    });
  });
}

/* ── Email Utility ── */
async function sendEmail({ to, subject, html }) {
  const provider = process.env.NITRO_EMAIL_PROVIDER || 'console';
  const from = process.env.NITRO_EMAIL_FROM || 'noreply@directtriage.local';
  
  if (provider === 'resend') {
    const resendKey = process.env.NITRO_RESEND_API_KEY;
    if (!resendKey) throw new Error('NITRO_RESEND_API_KEY not configured');
    
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, html })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Resend Error: ${res.status} ${err}`);
    }
    console.log(`[Nitro Mail] 📧 Sent via Resend to ${to}`);
    
  } else if (provider === 'sendgrid') {
    const sgKey = process.env.NITRO_SENDGRID_API_KEY;
    if (!sgKey) throw new Error('NITRO_SENDGRID_API_KEY not configured');
    
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${sgKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: from },
        subject,
        content: [{ type: 'text/html', value: html }]
      })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`SendGrid Error: ${res.status} ${err}`);
    }
    console.log(`[Nitro Mail] 📧 Sent via SendGrid to ${to}`);
    
  } else if (provider === 'smtp') {
    const transporter = nodemailer.createTransport({
      host: process.env.NITRO_SMTP_HOST,
      port: Number(process.env.NITRO_SMTP_PORT) || 587,
      secure: process.env.NITRO_SMTP_PORT === '465',
      auth: {
        user: process.env.NITRO_SMTP_USER,
        pass: process.env.NITRO_SMTP_PASS
      }
    });
    await transporter.sendMail({ from, to, subject, html });
    console.log(`[Nitro Mail] 📧 Sent via SMTP to ${to}`);
    
  } else {
    // Console provider (dev)
    console.log(`\n================== [CONSOLE EMAIL] ==================`);
    console.log(`To: ${to}\nFrom: ${from}\nSubject: ${subject}\n\n${html.replace(/<[^>]+>/g, '')}`);
    console.log(`=====================================================\n`);
  }
}

/* ── HTTP Server ── */
const server = http.createServer(async (req, res) => {
  setCORS(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204); res.end(); return;
  }

  const url = req.url.split('?')[0];

  /* ═══════════════════════════════════════
     API: POST /api/triage/step
     Dynamic LLM question generation
  ═══════════════════════════════════════ */
  if (req.method === 'POST' && url === '/api/triage/step') {
    try {
      const body = await parseBody(req);
      const { symptoms, history = [], userProfile = null, userId = null, sessionId = null } = body;
      const stepNumber = history.length + 1;

      const patientName = userProfile?.full_name || 'the patient';
      let profileCtx = `\nPatient Name: ${patientName}` + (userProfile
        ? `\nPatient Profile (Tier 1): Age ${userProfile.age || 'Unknown'}, Allergies: ${(userProfile.allergies || []).join(', ') || 'None'}, Chronic Conditions: ${(userProfile.chronic_conditions || []).join(', ') || 'None'}`
        : '');

      if (userId) {
        const episodes = await supabaseQuery('GET', 'health_episodes', null, `?user_id=eq.${userId}&order=created_at.desc&limit=3`);
        if (episodes && episodes.length > 0) {
          profileCtx += `\n\nPast Medical Episodes (Context):\n` + episodes.map((e, i) => `[Prior Episode ${i+1}] Symptoms: ${(e.symptoms || []).join(', ')}. Summary: ${e.clinical_summary}`).join('\n');
        }
        
        if (sessionId) {
          await supabaseQuery('POST', 'sessions', {
            id: sessionId,
            patient_id: userId,
            message_history: history,
            updated_at: new Date().toISOString()
          }, '', { 'Prefer': 'return=representation,resolution=merge-duplicates' });
        }
      }

      const systemPrompt = `You are the Agno AI Health Expert Agent — a senior autonomous medical triage specialist powered by Groq Llama 3.3.
Your objective: Conduct a dynamic, focused medical triage evaluation for ${patientName}.

SAFETY OVERRIDE (checked FIRST before anything else):
If symptoms include chest pain, severe uncontrolled bleeding, sudden numbness/paralysis, acute severe shortness of breath → set "isEmergency": true immediately. This is non-negotiable.

PHASE 1 — RIGOROUS DYNAMIC TRIAGE (max 10 questions):
- Ask exactly ONE focused, clinically relevant follow-up question based on the patient's prior answers.
- Do NOT ask the same type of question twice.
- You MUST rigorously investigate the following areas before concluding the triage:
  1. Past medical history (prior conditions, family history, etc.).
  2. Sedentary lifestyle and daily activity levels.
  3. Bad eating habits, diet, and general lifestyle choices.
- In addition, focus on the primary complaint: onset/duration, severity (1-10), location/radiation, associated symptoms, aggravating/relieving factors.
- Address the patient by their name (${patientName}) occasionally to maintain a personalized tone, but do NOT start every single response with a greeting like "Hello ${patientName}". Keep the conversation natural and fluid.
- EARLY EXIT: Set "isComplete": true ONLY if you have a thorough, high-confidence clinical picture of both the acute symptoms AND the patient's lifestyle/history. 10 is a ceiling, not a target.

Return ONLY valid JSON with this schema:
{
  "isEmergency": boolean,
  "emergencyReason": string | null,
  "isComplete": boolean,
  "nextQuestion": string | null,
  "reasoning": string
}`;

      const historyText = history.length > 0
        ? '\nPrevious Q&A:\n' + history.map((h, i) => `Q${i + 1}: ${h.question}\nA${i + 1}: ${h.answer}`).join('\n')
        : '';

      const userPrompt = `Step ${stepNumber}/10${profileCtx}\nInitial Symptoms: "${symptoms}"${historyText}`;
      const result = await callGroqLLM(systemPrompt, userPrompt);

      if (stepNumber >= 10 && !result.isEmergency) {
        result.isComplete = true;
        result.nextQuestion = null;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        stepNumber,
        isEmergency: !!result.isEmergency,
        emergencyReason: result.emergencyReason || null,
        isComplete: !!result.isComplete,
        nextQuestion: result.nextQuestion || null,
        reasoning: result.reasoning || 'Agno Agent analyzing symptoms...'
      }));
    } catch (err) {
      console.error('❌ /api/triage/step error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  /* ═══════════════════════════════════════
     API: POST /api/triage/summary
     Clinical post-assessment + Supabase save
  ═══════════════════════════════════════ */
  if (req.method === 'POST' && url === '/api/triage/summary') {
    try {
      const body = await parseBody(req);
      const { symptoms, history = [], userId = null } = body;

      const systemPrompt = `You are the Agno AI Health Expert Agent.
Generate a comprehensive expert clinical triage post-assessment.

Return ONLY valid JSON:
{
  "specialty": string (be specific: "Orthopedic Surgeon" not "Orthopedics"),
  "severity": "low" | "moderate" | "high" | "emergency",
  "summary": string (2-sentence clinical summary, NO disclaimer),
  "expertPost": string (Markdown: ## Clinical Analysis\\n## Diagnostic Directives\\n## Next Action Steps\\n## Specialist Referral),
  "disclaimer": "This is an AI triage estimation and does not constitute professional medical advice."
}`;

      const ctx = `Initial Symptoms: "${symptoms}"\nComplete Interview:\n` +
        history.map((h, i) => `Q${i + 1}: ${h.question}\nA${i + 1}: ${h.answer}`).join('\n');

      const result = await callGroqLLM(systemPrompt, ctx);

      // Save clinical dossier to Supabase health_episodes
      const episodeRecord = {
        symptoms: [symptoms, ...history.map(h => h.answer)].filter(Boolean),
        clinical_summary: result.summary || '',
        expert_post: result.expertPost || '',
        recommended_specialty: result.specialty || 'General Practice',
        severity: result.severity || 'moderate',
        session_data: { symptoms, history },
        created_at: new Date().toISOString()
      };
      if (userId) episodeRecord.user_id = userId;

      const saved = await supabaseQuery('POST', 'health_episodes', episodeRecord);
      console.log(`📋 Clinical episode saved: ${saved ? '✅' : '⚠️ (offline mode)'}`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, summary: result }));
    } catch (err) {
      console.error('❌ /api/triage/summary error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  /* ═══════════════════════════════════════
     API: GET /api/doctors?specialty=X
     Fetch matching doctors from Supabase
  ═══════════════════════════════════════ */
  if (req.method === 'GET' && url === '/api/doctors') {
    try {
      const urlObj = new URL(req.url, `http://localhost:${PORT}`);
      const specialty = urlObj.searchParams.get('specialty') || '';

      let doctors = null;
      if (SUPABASE_URL && SUPABASE_KEY) {
        // Try exact specialty match first, then partial, then all
        const encoded = encodeURIComponent(specialty);
        doctors = await supabaseQuery('GET', 'doctors', null, `?specialty=ilike.*${encoded}*&order=rating.desc&limit=4`);
        if (!doctors || doctors.length === 0) {
          doctors = await supabaseQuery('GET', 'doctors', null, '?order=rating.desc&limit=4');
        }
      }

      // Fallback static data if Supabase unavailable
      if (!doctors || doctors.length === 0) {
        doctors = [
          { id: '1', name: 'Dr. Sarah Jenkins, MD', specialty, clinic: 'Metropolitan Health Center', rating: 4.9, available_slots: ['Tomorrow, 9:00 AM', 'Tomorrow, 11:30 AM', 'In 2 days, 2:00 PM'] },
          { id: '2', name: 'Dr. Robert Chen, DO', specialty, clinic: 'Apex Specialist Clinic', rating: 4.8, available_slots: ['In 2 days, 10:00 AM', 'In 2 days, 3:30 PM'] },
          { id: '3', name: 'Dr. Elena Rostova, MD', specialty, clinic: 'St. Jude Community Care', rating: 4.95, available_slots: ['In 3 days, 8:30 AM', 'In 3 days, 1:00 PM'] }
        ];
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, doctors }));
    } catch (err) {
      console.error('❌ /api/doctors error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  /* ═══════════════════════════════════════
     API: POST /api/book
     Simulate booking confirmation & Nitro mail
  ═══════════════════════════════════════ */
  if (req.method === 'POST' && url === '/api/book') {
    try {
      const body = await parseBody(req);
      const { doctorId, doctorName, slot, userId, userEmail } = body;
      
      const emailHtml = `
        <h2>Booking Confirmation</h2>
        <p>Your appointment with <strong>${doctorName}</strong> has been confirmed.</p>
        <p><strong>Time:</strong> ${slot}</p>
        <br>
        <p>Thank you for using DocNet!</p>
      `;
      
      await sendEmail({
        to: userEmail,
        subject: `Appointment Confirmed: ${doctorName}`,
        html: emailHtml
      });
      
      console.log(`[Nitro Mail] 📧 Triggering email to ${userEmail} for booking with ${doctorName} at ${slot}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Booking confirmed and Nitro mail triggered' }));
    } catch (err) {
      console.error('❌ /api/book error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  /* ═══════════════════════════════════════
     Static file serving for frontend
  ═══════════════════════════════════════ */
  let reqPath = req.url === '/' ? '/index.html' : req.url;
  // Strip /frontend/ prefix if present
  reqPath = reqPath.replace(/^\/frontend\//, '/');
  let filePath = path.join(__dirname, reqPath.split('?')[0]);

  // Default to index.html for SPA routing
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(__dirname, 'index.html');
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`404 — File not found: ${reqPath}`);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon'
    };
    res.writeHead(200, { 'Content-Type': mimeMap[ext] || 'application/octet-stream' });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀  Server ready → http://localhost:${PORT}/`);
  console.log(`📄  Frontend     → http://localhost:${PORT}/index.html`);
  console.log(`🔗  API triage   → http://localhost:${PORT}/api/triage/step`);
  console.log(`👨‍⚕️  API doctors   → http://localhost:${PORT}/api/doctors\n`);
});
