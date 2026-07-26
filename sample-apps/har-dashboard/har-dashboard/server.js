require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.json());
app.use(express.static('public'));

const HAR_DIR = path.join(__dirname, 'har-files');
const REPORTS_DIR = path.join(__dirname, 'reports');

if (!fs.existsSync(HAR_DIR)) fs.mkdirSync(HAR_DIR);
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR);

// =====================
// ANALYZE HAR FILE
// =====================
function analyzeHar(harPath) {
  const raw = fs.readFileSync(harPath, 'utf8');
  const har = JSON.parse(raw);
  const entries = har?.log?.entries || [];
  const totalRequests = entries.length;
  const rawLoadTime = har.log.pages?.[0]?.pageTimings?.onLoad;
  const pageLoadTime = har.log.pages?.[0]?.pageTimings?.onLoad;
  const requests = entries.map(e => ({
    url: e.request.url,
    method: e.request.method,
    status: e.response.status,
    statusText: e.response.statusText,
    responseTime: e.time,
    timings: e.timings,
    size: e.response.content.size || 0,
    mimeType: e.response.content.mimeType || '',
    failed: e.response.status === 0 || e.response.status >= 400,
    failureReason:
      e.response.status === 0
        ? 'Network / DNS / CORS'
        : e.response.status >= 500
        ? 'Server Error'
        : e.response.status === 404
        ? 'Resource Not Found'
        : e.response.status === 401
        ? 'Unauthorized'
        : e.response.status === 403
        ? 'Forbidden'
        : e.response.status >= 400
        ? 'Client Error'
        : ''
  }));
  const apiRequests = requests.filter(r =>
  r.mimeType?.includes('json') ||
  r.mimeType?.includes('xml') ||
  r.url.includes('/api/') ||
  r.url.includes('/graphql') ||
  r.url.includes('/auth/')
);
  console.log("TOTAL REQUESTS FOUND:", requests.length);
  const staticAssets = requests.filter(r =>
    r.mimeType?.includes('javascript') ||
    r.mimeType?.includes('css') ||
    r.url.includes('.js') ||
    r.url.includes('.css')
  );

  const fonts = requests.filter(r =>
    r.mimeType?.includes('font') ||
    r.url.includes('fonts.googleapis.com') ||
    r.url.includes('fonts.gstatic.com')
  );

  const analytics = requests.filter(r =>
    r.url.includes('clarity') ||
    r.url.includes('google-analytics') ||
    r.url.includes('googletagmanager') ||
    r.url.includes('segment') ||
    r.url.includes('mixpanel')
  );

  const safeLoadTime =
    pageLoadTime && pageLoadTime > 100
      ? pageLoadTime
      : requests.filter(r => r.responseTime > 0)
               .reduce((max, r) => Math.max(max, r.responseTime), 0);

  const failedRequests = requests.filter(r => r.failed);
  console.log(requests.map(r => ({ url: r.url, mime: r.mimeType })));

  const totalSize = requests.reduce((sum, r) => sum + r.size, 0);
  const avgResponseTime =
    requests.length
      ? requests.reduce((sum, r) => sum + r.responseTime, 0) / requests.length
      : 0;
  const slowestRequests = [...requests]
    .sort((a, b) => b.responseTime - a.responseTime)
    .slice(0, 10);

  console.log("TOTAL REQUESTS:", requests.length);
  console.log("API REQUESTS:", apiRequests.length);

  const largestAssets = [...requests].sort((a, b) => b.size - a.size).slice(0, 5);

  return {
    pageLoadTime: safeLoadTime,
    totalRequests,
    totalSize,
    avgResponseTime,
    apiRequests,
    staticAssets,
    fonts,
    analytics,
    failedRequests,
    largestAssets,
    slowestRequests,
    allRequests: requests
  };
}

// =====================
// RUN HAR RECORDING
// =====================
async function runHarRecording(url, runNumber, socketId) {
  const socket = io.sockets.sockets.get(socketId);

  const emit = (msg) => {
    if (socket) socket.emit('progress', msg);
    console.log(msg);
  };

  emit(`🔄 Run ${runNumber}/10 starting...`);

  const harPath = path.join(HAR_DIR, `run-${runNumber}.har`);

  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    storageState: 'session.json',
    recordHar: {
      path: harPath,
      mode: 'full',
      content: 'attach'
    }
  });

  const page = await context.newPage();

  try {
    emit(`🌐 Run ${runNumber}/10 — opening ${url}`);

    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForURL(url, { timeout: 15000 }).catch(() => {});
    const currentUrl = page.url();
    emit(`🌍 Final URL: ${currentUrl}`);

    if (currentUrl.includes('/login')) {
      emit(`❌ Run ${runNumber}/10 — NOT logged in`);
    } else {
      emit(`✅ Run ${runNumber}/10 — Logged in`);
    }

    emit(`✅ Run ${runNumber}/10 — page loaded`);
  } catch (e) {
    emit(`⚠️ Run ${runNumber}/10 — ${e.message.split('\n')[0]}`);
  }

  await context.close();
  await browser.close();

  emit(`💾 Run ${runNumber}/10 — HAR saved`);

  return harPath;
}

// =====================
// RUN HAR RECORDING WITH BLOCK (hypothesis testing)
// =====================
async function runHarRecordingWithBlock(url, blockPattern, emit) {
  const harPath = path.join(HAR_DIR, `hypothesis-${Date.now()}.har`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    recordHar: { path: harPath, mode: 'full', content: 'attach' }
  });
  const page = await context.newPage();

  await page.route('**/*', (route) => {
    const reqUrl = route.request().url();
    if (reqUrl.includes(blockPattern)) {
      emit(`🚫 Blocking: ${reqUrl}`);
      return route.abort();
    }
    return route.continue();
  });

  let loadTime = 0;
  try {
    emit(`🌐 Re-testing ${url} with "${blockPattern}" blocked`);
    const start = Date.now();
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    loadTime = Date.now() - start;
  } catch (e) {
    emit(`⚠️ ${e.message.split('\n')[0]}`);
  } finally {
    await context.close();
    await browser.close();
  }
  return { loadTime, harPath };
}

// =====================
// ANALYZE WITH CLAUDE (structured, for investigation flow)
// =====================
async function analyzeWithClaudeForInvestigation(reportData) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: 'You are a web performance expert. Analyze the HAR data and identify the single most likely resource causing slowness. Give 4-5 concise findings as a numbered list, no preamble, and end with a final line in the exact format: "Suspected resource: <filename or URL substring>"',
      messages: [{ role: 'user', content: JSON.stringify(reportData) }]
    })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || `HTTP ${response.status}`);
  }
  return data.content?.[0]?.text || 'No response.';
}

// =====================
// GENERATE REPORT
// =====================
function generateReport(allAnalyses, url) {
  const loadTimes = allAnalyses.map(a => a.pageLoadTime);
  const validLoadTimes = loadTimes.filter(t => t && t > 100);
  const avgLoad = validLoadTimes.length
  ? validLoadTimes.reduce((a, b) => a + b, 0) / validLoadTimes.length
  : 0;
  const maxLoad = validLoadTimes.length ? Math.max(...validLoadTimes) : 0;
  const minLoad = validLoadTimes.length ? Math.min(...validLoadTimes) : 0;
  const allAssets = allAnalyses.flatMap(a => a.staticAssets);
  const allFonts = allAnalyses.flatMap(a => a.fonts);
  const allAnalytics = allAnalyses.flatMap(a => a.analytics);

  if (!allAnalyses.length) {
    throw new Error('No analyses available');
  }

  let trendDirection = 'Stable';
  if (loadTimes[loadTimes.length - 1] > loadTimes[0] * 1.05) {
    trendDirection = 'Getting Slower';
  } else if (loadTimes[loadTimes.length - 1] < loadTimes[0] * 0.95) {
    trendDirection = 'Getting Faster';
  }

  const allApis = allAnalyses.flatMap(a => a.apiRequests);
  const uniqueApis = [...new Map(allApis.map(a => [a.url, a])).values()];

  const allFailed = allAnalyses.flatMap(a => a.failedRequests);
  const uniqueFailed = [...new Map(allFailed.map(a => [a.url, a])).values()];

  const allSlowest = allAnalyses
    .flatMap(a => a.slowestRequests)
    .sort((a, b) => b.responseTime - a.responseTime)
    .slice(0, 10);

  const runs = allAnalyses.map(a => ({
    runNumber: a.runNumber,
    pageLoadTime: a.pageLoadTime,
    totalRequests: a.totalRequests,
    totalSize: a.totalSize,
    avgResponseTime: a.avgResponseTime,
    apiRequests: a.apiRequests,
    staticAssets: a.staticAssets,
    fonts: a.fonts,
    analytics: a.analytics,
    failedRequests: a.failedRequests,
    slowestRequests: a.slowestRequests
  }));

  const report = {
    url,
    generatedAt: new Date().toISOString(),
    runs,
    summary: {
      totalRuns: allAnalyses.length,
      trendDirection,
      avgPageLoadTime: avgLoad.toFixed(2),
      fastestRun: minLoad.toFixed(2),
      slowestRun: maxLoad.toFixed(2),
      avgTotalRequests: (
        allAnalyses.reduce((s, a) => s + a.totalRequests, 0) / allAnalyses.length
      ).toFixed(0),
      avgDataTransferred: (
        allAnalyses.reduce((s, a) => s + a.totalSize, 0) / allAnalyses.length / 1024 / 1024
      ).toFixed(2) + ' MB',
      totalDataTransferred: (
        allAnalyses.reduce((s, a) => s + a.totalSize, 0) / 1024 / 1024
      ).toFixed(2) + ' MB',
      totalFailedRequests: uniqueFailed.length
    },
    loadTimeTrend: loadTimes,
    apiRequests: uniqueApis,
    staticAssets: [...new Map(allAssets.map(a => [a.url, a])).values()],
    fonts: [...new Map(allFonts.map(a => [a.url, a])).values()],
    analytics: [...new Map(allAnalytics.map(a => [a.url, a])).values()],
    failedRequests: uniqueFailed,
    slowestRequests: allSlowest
  };

  const reportPath = path.join(REPORTS_DIR, `report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  report.fileName = path.basename(reportPath);
  console.log("REPORT GENERATED");
  console.log("apiRequests =", report.apiRequests.length);
  console.log("staticAssets =", report.staticAssets.length);
  console.log("fonts =", report.fonts.length);
  console.log("analytics =", report.analytics.length);
  return report;
}

// =====================
// SOCKET
// =====================
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('start-analysis', async ({ url }) => {
    if (!url) {
      socket.emit('error', 'No URL provided');
      return;
    }

    socket.emit('progress', `Starting 10-run analysis for: ${url}`);
    socket.emit('status', 'running');

    const analyses = [];

    for (let i = 1; i <= 10; i++) {
      try {
        const harPath = await runHarRecording(url, i, socket.id);
        console.log('HAR PATH:', harPath);

        const analysis = { runNumber: i, ...analyzeHar(harPath) };
        console.log('ANALYSIS OK');

        analyses.push(analysis);

        socket.emit('run-complete', {
          runNumber: i,
          pageLoadTime: analysis.pageLoadTime,
          totalRequests: analysis.totalRequests,
          failedCount: analysis.failedRequests.length,
          apiCount: analysis.apiRequests.length,
          dataTransferred: (analysis.totalSize / 1024 / 1024).toFixed(2)
        });
      } catch (err) {
        console.error(`RUN ${i} FAILED:`, err);
      }
    }

    socket.emit('progress', 'All runs complete. Generating report...');

    const report = generateReport(analyses, url);

    socket.emit('report', report);
    socket.emit('status', 'done');
    socket.emit('progress', 'Report ready.');

    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });

  // =====================
  // NEW: AUTONOMOUS INVESTIGATION
  // =====================
  socket.on('start-investigation', async ({ url }) => {
    if (!url) {
      socket.emit('inv-error', 'No URL provided');
      return;
    }

    try {
      socket.emit('inv-progress', { stage: 'capture', status: 'running' });
      const harPath = await runHarRecording(url, 1, socket.id);
      const captureResult = analyzeHar(harPath);
      socket.emit('inv-progress', { stage: 'capture', status: 'done', data: captureResult });

      socket.emit('inv-progress', { stage: 'analysis', status: 'running' });
      const analysis = await analyzeWithClaudeForInvestigation(captureResult);
      socket.emit('inv-progress', { stage: 'analysis', status: 'done', data: analysis });

      const match = analysis.match(/Suspected resource:\s*(\S+)/i);
      const pattern = match ? match[1] : null;

      let testResult = null;
      if (pattern) {
        socket.emit('inv-progress', { stage: 'hypothesis', status: 'running' });
        const { loadTime } = await runHarRecordingWithBlock(url, pattern, (m) => socket.emit('progress', m));
        const improvement = captureResult.pageLoadTime - loadTime;
        const improvementPercent = ((improvement / captureResult.pageLoadTime) * 100).toFixed(1);
        testResult = {
          pattern,
          confirmed: improvement > captureResult.pageLoadTime * 0.1,
          baselineLoadTime: captureResult.pageLoadTime,
          testLoadTime: loadTime,
          improvementPercent: `${improvementPercent}%`
        };
        socket.emit('inv-progress', { stage: 'hypothesis', status: 'done', data: testResult });
      } else {
        socket.emit('inv-progress', { stage: 'hypothesis', status: 'skipped' });
      }

      socket.emit('inv-complete', { captureResult, analysis, testResult });
    } catch (err) {
      console.error('Investigation failed:', err);
      socket.emit('inv-error', err.message);
    }
  });
});

// =====================
// ROUTES
// =====================
app.get('/reports', (req, res) => {
  const files = fs.readdirSync(REPORTS_DIR).filter(f => f.endsWith('.json'));
  res.json(files);
});

const { spawn } = require('child_process');

app.post('/create-session', (req, res) => {
  spawn('node', ['saveSession.js'], { shell: true, detached: true });
  res.json({ success: true });
});
app.post('/ai-analyze', async (req, res) => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: 'You are a web performance expert. Analyze why requests are failing and why some are slow — use HTTP status codes to reason about root causes. Look for patterns in the load time trend. Give 4-5 concise actionable findings. Numbered list, no preamble.',
      messages: [{ role: 'user', content: JSON.stringify(req.body) }]
    })
  });
  const data = await response.json();
  const text = data.content?.[0]?.text || 'No response.';
  res.json({ result: text });
});
app.get('/reports/:file', (req, res) => {
  const filePath = path.join(REPORTS_DIR, req.params.file);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
  res.json(JSON.parse(fs.readFileSync(filePath, 'utf8')));
});
app.delete('/reports/:file', (req, res) => {
  const filePath = path.join(REPORTS_DIR, req.params.file);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
  fs.unlinkSync(filePath);
  res.json({ success: true });
});
server.listen(3002, () => {
  console.log('HAR Dashboard running at http://localhost:3002');
});