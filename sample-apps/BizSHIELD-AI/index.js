/**
 * BizShield AI — Express API, Web Server & SSE MCP Host
 * 
 * Serves the static web dashboard, handles REST endpoints for
 * onboarding and chat assistant, and implements the Model Context Protocol (MCP)
 * over Server-Sent Events (SSE) for Nitrocloud deployment.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Manually load .env file if it exists in project root or home directory (credentials skill compatibility)
const loadEnv = (p) => {
  if (fs.existsSync(p)) {
    const envContent = fs.readFileSync(p, 'utf8');
    envContent.split('\n').forEach(line => {
      const parts = line.trim().split('=');
      if (parts.length >= 2 && !line.startsWith('#')) {
        const key = parts[0].trim();
        const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
        process.env[key] = val;
      }
    });
  }
};
loadEnv(path.join(__dirname, '.env'));
loadEnv(path.join(os.homedir(), '.env'));

const engine = require('./bizshield_engine');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Serve static dashboard files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------------------
// Email OTP Verification (Sign-up / Login)
// ---------------------------------------------------------------------------
//
// Configure real email delivery via SMTP env vars (works with Gmail app
// passwords, SendGrid/Mailgun SMTP relay, AWS SES, Mailtrap, etc.):
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM (optional, defaults to SMTP_USER)
//   SMTP_SECURE=true            (optional, set true for port 465)
//
// If SMTP_HOST/SMTP_USER/SMTP_PASS aren't set, the server runs in "dev mode":
// it logs the OTP to the console and echoes it back in the API response so
// the flow is testable without a real mailbox. Dev mode is clearly labeled
// and is never used once SMTP is configured.

let mailTransporter = null;
const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

if (smtpConfigured) {
  mailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  console.log(`[OTP] SMTP configured (${process.env.SMTP_HOST}) — verification emails will be sent for real.`);
} else {
  console.warn('[OTP] SMTP_HOST/SMTP_USER/SMTP_PASS not set — running in DEV MODE. OTPs will be logged to the console and echoed in the API response instead of emailed. Set the SMTP_* env vars to send real emails.');
}

// email -> { otp, expiresAt, attempts, lastSentAt }
const otpStore = new Map();

const OTP_TTL_MS = 5 * 60 * 1000;      // codes expire after 5 minutes
const OTP_RESEND_COOLDOWN_MS = 30 * 1000; // 30s between resend requests
const OTP_MAX_ATTEMPTS = 5;             // lock out after 5 wrong guesses

// Periodically sweep expired/unused codes so the in-memory store doesn't grow forever.
setInterval(() => {
  const now = Date.now();
  for (const [email, entry] of otpStore.entries()) {
    if (now > entry.expiresAt) otpStore.delete(email);
  }
}, 60 * 1000).unref();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function generateOtp() {
  return crypto.randomInt(1000, 10000).toString(); // always 4 digits, 1000-9999
}

async function sendOtpEmail(email, otp) {
  if (!mailTransporter) {
    console.log(`[OTP] DEV MODE — verification code for ${email}: ${otp}`);
    return;
  }
  await mailTransporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Your BizShield AI verification code',
    text: `Your BizShield AI verification code is ${otp}. It expires in 5 minutes. If you didn't request this, you can ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:420px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:8px;">
      <h2 style="color:#006d77;margin:0 0 8px;">BizShield AI</h2>
      <p style="color:#2d3748;font-size:14px;">Use the code below to verify your email address:</p>
      <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#006d77;text-align:center;padding:16px 0;">${otp}</div>
      <p style="color:#718096;font-size:12px;">This code expires in 5 minutes. If you didn't request it, you can safely ignore this email.</p>
    </div>`
  });
}

/**
 * Request an OTP for a given email address.
 */
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const existing = otpStore.get(email);
    if (existing && Date.now() - existing.lastSentAt < OTP_RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - (Date.now() - existing.lastSentAt)) / 1000);
      return res.status(429).json({ error: `Please wait ${waitSeconds}s before requesting another code.` });
    }

    const otp = generateOtp();
    otpStore.set(email, {
      otp,
      expiresAt: Date.now() + OTP_TTL_MS,
      attempts: 0,
      lastSentAt: Date.now()
    });

    await sendOtpEmail(email, otp);

    const response = { sent: true, expiresInSeconds: OTP_TTL_MS / 1000, devMode: !smtpConfigured };
    if (!smtpConfigured) {
      // Only echoed when no real mailbox is configured, so local/dev testing works out of the box.
      response.devOtp = otp;
    }
    res.json(response);
  } catch (err) {
    console.error('send-otp error:', err);
    res.status(500).json({ error: 'Could not send verification email. Please try again in a moment.' });
  }
});

/**
 * Verify a submitted OTP for a given email address.
 */
app.post('/api/auth/verify-otp', (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const code = (req.body.code || '').trim();

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required.' });
  }

  const entry = otpStore.get(email);
  if (!entry) {
    return res.status(400).json({ error: 'No verification code was requested for this email, or it already expired. Please request a new one.' });
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(email);
    return res.status(400).json({ error: 'That code has expired. Please request a new one.' });
  }

  if (entry.attempts >= OTP_MAX_ATTEMPTS) {
    otpStore.delete(email);
    return res.status(429).json({ error: 'Too many incorrect attempts. Please request a new code.' });
  }

  if (code !== entry.otp) {
    entry.attempts += 1;
    const remaining = OTP_MAX_ATTEMPTS - entry.attempts;
    if (remaining <= 0) {
      otpStore.delete(email);
      return res.status(429).json({ error: 'Too many incorrect attempts. Please request a new code.' });
    }
    return res.status(400).json({ error: `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` });
  }

  // Success — one-time use, remove it so it can't be replayed.
  otpStore.delete(email);
  res.json({ verified: true, email });
});

// ---------------------------------------------------------------------------
// REST API Endpoints (Dashboard UI support)
// ---------------------------------------------------------------------------

/**
 * Get all registered businesses
 */
app.get('/api/businesses', (req, res) => {
  res.json({
    count: engine.seededBusinesses.length,
    businesses: engine.seededBusinesses.map(b => ({
      id: b.id,
      name: b.name,
      owner: b.owner,
      udyam_category: b.udyam_category,
      business_category: b.business_category,
      state: b.state
    }))
  });
});

/**
 * Get specific business profile
 */
app.get('/api/business/:id', (req, res) => {
  const biz = engine.seededBusinesses.find(b => b.id === req.params.id);
  if (!biz) {
    return res.status(404).json({ error: `Business ID ${req.params.id} not found.` });
  }
  res.json(biz);
});

/**
 * Register a new business context (Onboarding)
 */
app.post('/api/business', (req, res) => {
  const profile = req.body;
  
  if (!profile.name || !profile.annual_turnover_inr || !profile.investment_inr) {
    return res.status(400).json({ error: "Missing required onboarding parameters: name, annual_turnover_inr, investment_inr." });
  }

  try {
    const newBiz = engine.registerBusiness(profile);
    res.status(201).json(newBiz);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Run calculation engine for all 10 features
 */
app.get('/api/analyze/:id', (req, res) => {
  const results = engine.analyzeBusiness(req.params.id);
  if (!results) {
    return res.status(404).json({ error: `Business ID ${req.params.id} not found.` });
  }
  res.json(results);
});

// Helper for AI Chat: Rule-based intent classifier
function matchRoute(question) {
  const q = question.toLowerCase();
  const routes = [
    {
      keywords: ["market", "opportunity", "location", "site", "should i open", "catchment", "footfall", "competition", "saturation"],
      tool: "market"
    },
    {
      keywords: ["insurance", "insure", "premium", "cover", "policy", "should i buy"],
      tool: "insurance"
    },
    {
      keywords: ["risk", "flood", "loss", "damage", "expected loss", "extreme rain", "monsoon"],
      tool: "risk"
    },
    {
      keywords: ["scheme", "government", "subsidy", "loan", "eligibility", "cgtmse", "mudra", "udyam", "benefit"],
      tool: "schemes"
    },
    {
      keywords: ["financial", "health", "cash", "runway", "profit", "margin", "scorecard", "dscr", "operating"],
      tool: "financial"
    },
    {
      keywords: ["business profile", "company profile", "about my business", "about our business", "about your business", "tell me about", "our details", "company details", "entity type", "udyam category"],
      tool: "profile"
    },
    {
      keywords: ["supply", "supplier", "chain", "delay", "alternative"],
      tool: "supply"
    },
    {
      keywords: ["emergency", "disaster", "evacuate", "contact", "helpline", "playbook"],
      tool: "emergency"
    },
    {
      keywords: ["weather", "forecast", "rain", "temperature", "temp"],
      tool: "weather"
    }
  ];

  let best = null;
  for (const r of routes) {
    const hits = r.keywords.filter(k => q.includes(k)).length;
    if (hits > 0 && (!best || hits > best.hits)) {
      best = { hits, tool: r.tool };
    }
  }
  return best ? best.tool : null;
}

const https = require('https');

function requestOpenRouter(apiKey, systemPrompt, question) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: 'inclusionai/ling-3.0-flash:free',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }
      ]
    });

    const options = {
      hostname: 'openrouter.ai',
      port: 443,
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'BizShield AI'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            return;
          }
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          reject(new Error('JSON parse error: ' + e.message + ' | Raw data: ' + data));
        }
      });
    });

    req.on('error', (err) => { reject(err); });
    req.write(payload);
    req.end();
  });
}

/**
 * AI Assistant Chat Interface
 */
app.post('/api/chat', async (req, res) => {
 try {
  const { question, businessId } = req.body;
  if (!question) {
    return res.status(400).json({ error: "Missing parameter: question" });
  }

  let bizId = businessId || "biz_priya_textiles";
  let biz = engine.seededBusinesses.find(b => b.id === bizId);
  let fallbackNotice = '';
  if (!biz) {
    biz = engine.seededBusinesses[0];
    if (!biz) {
      return res.status(404).json({ error: "No businesses are currently registered on this server." });
    }
    fallbackNotice = `_Note: the business profile "${bizId}" could not be found (it may have been reset or removed), so this answer is for **${biz.name}** instead. You may want to re-onboard your business._\n\n`;
    bizId = biz.id;
  }

  // Check for live API Key (Gemini or OpenRouter)
  const api_key = process.env.GEMINI_API_KEY || req.headers['x-gemini-key'];

  if (api_key) {
    const analysis = engine.analyzeBusiness(bizId);
    const systemPrompt = `
You are BizShield AI, a highly specialized virtual business advisor for Indian MSMEs (micro, small, and medium enterprises).
Your expertise is strictly limited to the following 7 business intelligence domains for the user's business:
1. Market Intelligence & Location Analysis (capturable footfall, saturation indices, POIs, catchment areas, weekly activity curve peak times).
2. Expected Annual Loss (EAL) & Climate Risk (evaluating rain/flood vulnerabilities at different floor levels and simulating asset exposure).
3. MSME Insurance Advisory (identifying commercial coverage priorities like Shopkeepers Package and Fire & Allied Perils, and estimating premiums).
4. Statutory Compliance Calendars (tracking deadlines for GST, income tax, audits, and insurance renewals to avoid penalties).
5. Government MSME Scheme Eligibility (matching Udyam parameters to loan subsidies like CGTMSE, Mudra, PMEGP, etc.).
6. B2B MSME Collaboration (consolidating cargo shipments to save transit fees).
7. Tax and Financial Health Calculations (cash runway, EBITDA, WCC days, operating margins, GST and Income Tax liabilities).

Here is the pre-calculated, structured analytical context for the user's active business:
${JSON.stringify(analysis, null, 2)}

Strict Guidelines:
- Only answer queries related to the 7 domains above.
- If the user asks general-knowledge questions, coding tasks, or requests unrelated to these business analytics (e.g., writing a script, telling a general story, recipes, history, general chat, etc.), politely decline and explain that your specialization is restricted strictly to BizShield MSME intelligence.
- Never make up or guess any numbers, percentages, or data points. If a value is not in the active business context above, state that the metric is unavailable.
- Always present the standard disclaimer for insurance and scheme qualification assessments (insurance analysis is informational, scheme eligibility is indicative).
- Explain calculations clearly using variables in the context (e.g. explain that the flood expected annual loss is calculated by summing P(event)*exposure*damage across heights).
- Respond in professional, clean, structured markdown with bullet points and bolding.
`;

    if (api_key.startsWith('sk-or-')) {
      // Route to OpenRouter using native HTTPS module
      try {
        const data = await requestOpenRouter(api_key, systemPrompt, question);
        if (data.choices && data.choices[0] && data.choices[0].message) {
          return res.json({ answer: fallbackNotice + data.choices[0].message.content });
        } else if (data.error) {
          console.error("OpenRouter API error, falling back to deterministic agent:", data.error);
        } else {
          console.error("Unexpected OpenRouter API response format, falling back to deterministic agent:", data);
        }
      } catch (err) {
        // Network/DNS/allowlist failures land here (e.g. openrouter.ai blocked on some hosts).
        // Don't dead-end the user - fall through to the deterministic rule-based agent below.
        console.error("OpenRouter request failed, falling back to deterministic agent:", err.message);
      }
    } else {
      // Route to Gemini
      try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(api_key);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: systemPrompt }, { text: question }] }]
        });
        const responseText = result.response.text();
        return res.json({ answer: fallbackNotice + responseText });
      } catch (err) {
        console.error("Gemini API error, falling back to deterministic agent:", err);
      }
    }
  }

  // Deterministic Route Narrator
  const intent = matchRoute(question);

  if (!intent) {
    return res.json({
      answer: fallbackNotice + `I can help you with specific business analytics. Try asking one of these:
- **"What is the market opportunity for ${biz.name}?"**
- **"Should I buy flood insurance for my shop?"**
- **"What is our expected annual loss from heavy rainfall?"**
- **"Which government schemes do we qualify for?"**
- **"Tell me about our cash runway and financial health score."**
- **"Are there any risks affecting my supply chain?"**
- **"What should I do in case of a flood emergency?"**`
    });
  }

  let answer = "";
  if (intent === "market") {
    const result = engine.computeMarketIntelligence(bizId);
    const top = result.top_generators[0];
    const saturation = result.saturation_index;
    const satLabel = saturation > 1.0 ? 'oversupplied' : (saturation < 0.6 ? 'gap exists' : 'balanced');
    
    answer = `### 📊 Market Opportunity: **${biz.name}**
- **Opportunity Score:** \`${result.opportunity_score}/100\`
- **Dominant Customer Profile:** \`${result.dominant_archetype.replace('_', ' ').toUpperCase()}\`
- **Dominant Footfall Generator:** \`${top.category.replace('_', ' ')}\` at \`${top.distance_m}m\` (footprint: \`${top.footprint_sqm} sqm\`).
- **Saturation Index:** \`${saturation}\` (indicating a **${satLabel}** market).
- **Recommended Ticket Size:** \`₹${result.recommended_pricing.low} - ₹${result.recommended_pricing.high}\` (Confidence: \`${result.recommended_pricing.confidence}\`).
- **Peak Traffic Window:** \`${result.peak_summary.peak_day}s at ${result.peak_summary.peak_window}\`.`;
  } 
  else if (intent === "insurance") {
    const result = engine.insuranceAdvisor(bizId);
    let lines = [`### 🛡️ Smart Insurance Advice for **${biz.name}**`,
                 `- **Recommended Sum Insured:** \`₹${result.recommended_sum_insured_inr.toLocaleString('en-IN')}\` (based on peak seasonal asset valuation).`,
                 `\n**Product Comparisons:**`];
                 
    result.comparisons.forEach(c => {
      lines.push(`- **${c.product_name}** (${c.product_key.toUpperCase()}):`);
      lines.push(`  - *Indicative Premium:* \`₹${c.indicative_premium_low_inr.toLocaleString('en-IN')} - ₹${c.indicative_premium_high_inr.toLocaleString('en-IN')}/yr\``);
      lines.push(`  - *Modelled Expected Loss:* \`₹${c.modelled_expected_annual_loss_inr.toLocaleString('en-IN')}/yr\``);
      lines.push(`  - *Advisor Signal:* \`${c.decision_signal.replace('_', ' ').toUpperCase()}\` — *${c.recommendation}*`);
    });
    lines.push(`\n⚠️ *Disclaimer: ${result.disclaimer}*`);
    answer = lines.join('\n');
  } 
  else if (intent === "risk") {
    const loss = engine.computeExpectedLoss(bizId, "flood");
    const cross = engine.crossRiskInsight(bizId, "flood");
    
    let listLines = loss.events.map(e => `  - **${e.intensity}**: Probability: \`${(e.probability * 100).toFixed(1)}%\`, Expected Loss: \`₹${e.expected_loss_inr.toLocaleString('en-IN')}\``);
    
    answer = `### 🌧️ Weather Risk & Expected Loss: **${biz.name}**
- **Expected Annual Flood Loss:** \`₹${loss.expected_annual_loss_inr.toLocaleString('en-IN')}\` (\`₹${loss.expected_annual_loss_lakhs}L\`).

**Calculated Flood Intensity Scenarios:**
${listLines.join('\n')}

**Cross-Risk Financial Insight:**
- ${cross.insight}`;
  } 
  else if (intent === "schemes") {
    const result = engine.checkEligibility(bizId);
    let lines = [`### 📜 Government Scheme Eligibility: **${biz.name}**`,
                 `MSME Classification: **${result.udyam_category.toUpperCase()}** enterprise.`,
                 `\n**Eligible Schemes (Verified):**`];
    
    if (result.eligible.length === 0) {
      lines.push("  - None identified matching the core criteria.");
    } else {
      result.eligible.forEach(s => {
        lines.push(`  - **${s.name}** (${s.focus_area || s.ministry})`);
        lines.push(`    *Benefit:* ${s.benefit}`);
      });
    }
    
    if (result.likely_eligible.length > 0) {
      lines.push(`\n**Likely Eligible (Verification recommended):**`);
      result.likely_eligible.forEach(s => {
        lines.push(`  - **${s.name}**`);
        lines.push(`    *Note:* ${s.verify_note}`);
      });
    }
    
    lines.push(`\n**Exempt/Not Eligible:**`);
    result.not_eligible.slice(0, 2).forEach(s => {
      lines.push(`  - *${s.name}*: Reasons: ${s.reasons.join(', ')}`);
    });
    
    lines.push(`\n⚠️ *Disclaimer: ${result.disclaimer}*`);
    answer = lines.join('\n');
  } 
  else if (intent === "financial") {
    const result = engine.financialHealth(bizId);
    let lines = [`### 💳 Financial Health Scorecard: **${biz.name}**`,
                 `- **Overall Health Score:** \`${result.overall_score}/100\` (${result.health_band.toUpperCase()})`,
                 `\n**Core Cash-flow Metrics:**`];
                 
    for (const [key, m] of Object.entries(result.metrics)) {
      lines.push(`- **${key.replace(/_/g, ' ').toUpperCase()}:**`);
      lines.push(`  - Score: \`${m.score}/100\` | Status: \`${m.signal.toUpperCase()}\``);
      if (key === 'cash_runway') {
        lines.push(`  - Current Value: \`${m.value_months} months runway\``);
      } else if (key === 'operating_margin') {
        lines.push(`  - Current Value: \`${(m.value * 100).toFixed(1)}%\` (Sector Benchmark: \`${(m.sector_benchmark * 100).toFixed(1)}%\`)`);
      } else if (key === 'working_capital_cycle') {
        lines.push(`  - Current Value: \`${m.value_days} days cycle\``);
      } else if (key === 'revenue_concentration') {
        lines.push(`  - Current Share of Top Customer: \`${(m.top_customer_share * 100).toFixed(1)}%\``);
      } else if (key === 'debt_service_coverage') {
        lines.push(`  - DSCR: \`${m.dscr}x\``);
      }
    }
    answer = lines.join('\n');
  } 
  else if (intent === "profile") {
    const assetsVal = biz.assets.reduce((sum, a) => sum + a.declared_value_inr, 0);
    answer = `### 🏢 Business Context Profile: **${biz.name}**
- **Owner / Director:** \`${biz.owner}\`
- **Entity Legal Type:** \`${biz.entity_type.toUpperCase()}\`
- **Udyam Category:** \`${biz.udyam_category.toUpperCase()}\`
- **Annual Turnover:** \`₹${biz.annual_turnover_inr.toLocaleString('en-IN')}\`
- **Investment (Capital):** \`₹${biz.investment_inr.toLocaleString('en-IN')}\`
- **Active Employees:** \`${biz.employee_count} personnel\`
- **Declared Assets:** \`${biz.assets.length} items\` (Total book value: \`₹${assetsVal.toLocaleString('en-IN')}\`)
- **Geographic Coordinates:** \`[${biz.latitude}, ${biz.longitude}]\` (${biz.state})`;
  }
  else if (intent === "supply") {
    const result = engine.getSupplyChainRisk(bizId);
    let lines = [`### ⛓️ Supply Chain Risk Assessment: **${biz.name}**`,
                 `- **Overall Sourcing Risk:** \`${result.risk_band.toUpperCase()}\` (${Math.round(result.overall_risk_score * 100)}%)`,
                 `- **At Risk Suppliers:** \`${result.at_risk_supplier_count}\` out of \`${result.suppliers.length}\``,
                 `\n**Supplier Details:**`];
                 
    result.suppliers.forEach(s => {
      lines.push(`- **${s.supplier_name}** (Supply share: \`${Math.round(s.share_of_supply * 100)}%\`) in \`${s.region}\`:`);
      lines.push(`  - Material: \`${s.material}\``);
      lines.push(`  - Risk Score: \`${Math.round(s.composite_risk * 100)}%\` (At Risk: \`${s.at_risk ? 'YES' : 'NO'}\`)`);
      lines.push(`  - Lead time: \`${s.lead_time_days} days\`, Reorder Point: \`${s.reorder_point_days} days\``);
      lines.push(`  - *Key Recommendations:* ${s.recommendations.join(' ')}`);
    });
    answer = lines.join('\n');
  }
  else if (intent === "emergency") {
    const result = engine.getEmergencySupport(bizId, "flood");
    answer = `### 🚨 Emergency Action & Disaster Playbook for **${biz.name}**
- **Disaster Context:** Flood / Heavy Monsoon Inundation

**Immediate Defensive Checklist:**
${result.immediate_actions.map(a => `- [ ] ${a}`).join('\n')}

**Insurance Claim Instructions:**
${result.insurance_guidance.map(g => `- ${g}`).join('\n')}

**Applicable Policies (Your Profile):**
${result.relevant_insurance_policies.map(p => `- ${p}`).join('\n')}

**Government Assistance Framework:**
${result.government_assistance.map(ga => `- ${ga}`).join('\n')}

**Emergency Helpline Contact:**
- ${result.helpline_numbers.join(' | ')}`;
  }
  else if (intent === "weather") {
    const result = engine.getWeatherIntelligence(bizId);
    let lines = [`### 🌦️ 7-Day Weather Intelligence Forecast for **${biz.name}**`,
                 `Status: **${result.overall_risk.toUpperCase()} RISK WEEK** — *${result.overall_summary}*`,
                 `Weekly Financial Impact Proxy: \`₹${result.estimated_weekly_impact_inr.toLocaleString('en-IN')}\` (estimated sales dip)`,
                 `\n**Timeline:**`];
                 
    result.forecast.forEach(d => {
      lines.push(`- **${d.day_name} (${d.date}):** ${d.icon} **${d.condition_label}** (\`${d.temp_c}°C\`, \`${d.humidity_pct}%\` Humidity). Risk: \`${d.risk_level.toUpperCase()}\`.`);
    });
    
    lines.push(`\n**Top Suggested Operational Precautions:**`);
    result.top_recommendations.forEach(r => {
      lines.push(`- ${r}`);
    });
    answer = lines.join('\n');
  }

  res.json({ answer: fallbackNotice + answer });
 } catch (err) {
  console.error("Unhandled /api/chat error:", err);
  res.status(500).json({ error: "The assistant hit an internal error processing that question. Please try rephrasing it or ask about a different topic (schemes, insurance, weather risk, financial health, market opportunity, supply chain, compliance, or emergency support)." });
 }
});


// ---------------------------------------------------------------------------
// Model Context Protocol (MCP) over Server-Sent Events (SSE) Transport
// ---------------------------------------------------------------------------

const mcpSessions = new Map();

/**
 * GET /sse
 * Establishes an SSE event-stream for remote MCP client integrations
 */
app.get('/sse', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const sessionId = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  mcpSessions.set(sessionId, res);

  console.log(`[MCP SSE] New client session connected: ${sessionId}`);

  // Expose the messages endpoint for this session (relative to host root)
  res.write(`event: endpoint\ndata: /message?session=${sessionId}\n\n`);

  req.on('close', () => {
    console.log(`[MCP SSE] Client session closed: ${sessionId}`);
    mcpSessions.delete(sessionId);
  });
});

/**
 * POST /message
 * Handles incoming JSON-RPC calls from remote MCP clients and forwards results via SSE
 */
app.post('/message', (req, res) => {
  const sessionId = req.query.session;
  const sseResponse = mcpSessions.get(sessionId);

  if (!sseResponse) {
    return res.status(404).json({ error: `MCP Session ${sessionId} not found.` });
  }

  const jsonRpcRequest = req.body;
  const { method, id, params } = jsonRpcRequest;

  console.log(`[MCP JSON-RPC] Received method: ${method} for session: ${sessionId}`);

  // HTTP response is 202 Accepted, result is written to SSE channel
  res.status(202).send("Accepted");

  // Handle initialization
  if (method === "initialize") {
    sseResponse.write(`event: message\ndata: ${JSON.stringify({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "bizshield-ai-nitro", version: "1.0.0" }
      }
    })}\n\n`);
    return;
  }

  // Handle listing tools
  if (method === "tools/list") {
    const listResponse = {
      jsonrpc: "2.0",
      id,
      result: {
        tools: [
          {
            name: "list_available_businesses",
            description: "List all preseeded MSME businesses in the system.",
            inputSchema: { type: "object", properties: {} }
          },
          {
            name: "get_business_profile",
            description: "Get full Udyam, financial snapshot, and assets schedules for a business ID.",
            inputSchema: {
              type: "object",
              properties: { business_id: { type: "string" } },
              required: ["business_id"]
            }
          },
          {
            name: "get_financial_health",
            description: "Get runway, operating margins, working capital cycle, and debt calculations.",
            inputSchema: {
              type: "object",
              properties: { business_id: { type: "string" } },
              required: ["business_id"]
            }
          },
          {
            name: "compute_expected_loss",
            description: "Calculate expected annual losses (INR) based on asset exposures.",
            inputSchema: {
              type: "object",
              properties: { business_id: { type: "string" }, hazard_type: { type: "string" } },
              required: ["business_id"]
            }
          }
        ]
      }
    };
    sseResponse.write(`event: message\ndata: ${JSON.stringify(listResponse)}\n\n`);
    return;
  }

  // Handle tool execution calls
  if (method === "tools/call") {
    const { name, arguments: args } = params;
    const bizId = args.business_id || args.businessId;
    let toolResult = null;

    try {
      switch (name) {
        case "list_available_businesses":
          toolResult = engine.seededBusinesses.map(b => ({ id: b.id, name: b.name }));
          break;
        case "get_business_profile":
          toolResult = engine.seededBusinesses.find(b => b.id === bizId) || { error: "Unknown ID" };
          break;
        case "get_financial_health":
          toolResult = engine.financialHealth(bizId);
          break;
        case "compute_expected_loss":
          toolResult = engine.computeExpectedLoss(bizId, args.hazard_type || 'flood');
          break;
        default:
          toolResult = { error: `Tool ${name} not supported on web transport.` };
      }
    } catch (err) {
      toolResult = { error: err.message };
    }

    const callResponse = {
      jsonrpc: "2.0",
      id,
      result: {
        content: [
          {
            type: "text",
            text: JSON.stringify(toolResult, null, 2)
          }
        ]
      }
    };
    sseResponse.write(`event: message\ndata: ${JSON.stringify(callResponse)}\n\n`);
    return;
  }

  // Fallback for unknown methods
  sseResponse.write(`event: message\ndata: ${JSON.stringify({
    jsonrpc: "2.0",
    id,
    error: { code: -32601, message: `Method ${method} not found.` }
  })}\n\n`);
});

// Safety net: log unexpected errors instead of letting them crash the whole server.
// (Express does not auto-catch throws inside async route handlers - an uncaught one
// becomes an unhandled promise rejection, which Node terminates the process for by
// default. Every route above is now defensively wrapped, but this is a last resort.)
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection (server kept running):', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception (server kept running):', err);
});

// Start listening
app.listen(PORT, () => {
  console.log(`BizShield AI Web & MCP SSE App is running at http://localhost:${PORT}`);
});
