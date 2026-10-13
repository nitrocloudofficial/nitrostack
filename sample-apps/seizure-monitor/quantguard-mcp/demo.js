import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper for colored console outputs
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m'
};

console.log(`${colors.bold}${colors.cyan}====================================================${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}       QUANTGUARD MCP - LIVE DEMO SIMULATION        ${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}====================================================${colors.reset}`);
console.log(`Starting QuantGuard server in ${colors.yellow}DEMO_MODE=true${colors.reset}...`);
console.log(`Replaying BTCUSDT orderbook feed and scheduling spoofing injection.`);
console.log(`${colors.gray}Timeline:${colors.reset}`);
console.log(`- 0s to 120s: Normal market conditions (VWAP/MARKET recommended)`);
console.log(`- 120s to 180s: Spoofing wall injected (VPIN toxicity spikes, triggers WAIT)`);
console.log(`- 180s onwards: Spoofing wall cancelled (recovers to VWAP)`);
console.log(`Press Ctrl+C to terminate simulation at any time.\n`);

// Start the server in a subprocess with DEMO_MODE=true
const serverPath = path.join(__dirname, 'dist', 'index.js');
const serverProcess = spawn('node', [serverPath], {
  env: {
    ...process.env,
    DEMO_MODE: 'true',
    PORT: '3000'
  }
});

let msgId = 1;
const pendingRequests = new Map();

// Helper to send JSON-RPC message to server stdin
function sendRequest(method, params) {
  const id = msgId++;
  const request = {
    jsonrpc: '2.0',
    id,
    method,
    params
  };
  serverProcess.stdin.write(JSON.stringify(request) + '\n');
  return new Promise((resolve) => {
    pendingRequests.set(id, resolve);
  });
}

// Buffer to store stdout lines
let stdoutBuffer = '';

serverProcess.stdout.on('data', (data) => {
  stdoutBuffer += data.toString();
  const lines = stdoutBuffer.split('\n');
  stdoutBuffer = lines.pop() || '';

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const response = JSON.parse(line);
      if (response.id && pendingRequests.has(response.id)) {
        const resolve = pendingRequests.get(response.id);
        pendingRequests.delete(response.id);
        resolve(response);
      }
    } catch (e) {
      // Print non-JSON server output (like logs) to console
      if (line.includes('[SIMULATOR]') || line.includes('QUANTGUARD:')) {
        console.log(`${colors.gray}[SERVER] ${line}${colors.reset}`);
      }
    }
  }
});

serverProcess.stderr.on('data', (data) => {
  // Suppress verbose logs to keep CLI tidy, but print warnings/errors
  const errText = data.toString();
  if (errText.includes('error') || errText.includes('Fail')) {
    console.error(`${colors.red}[SERVER ERROR] ${errText}${colors.reset}`);
  }
});

// Main simulation script runner
async function run() {
  // Wait for server to boot
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Initialize client protocol
  await sendRequest('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'QuantGuardDemoClient', version: '1.0.0' }
  });

  console.log(`${colors.green}✔ QuantGuard MCP Server connected successfully.${colors.reset}\n`);

  let elapsed = 0;
  
  const pollInterval = setInterval(async () => {
    elapsed += 5;
    
    try {
      const response = await sendRequest('tools/call', {
        name: 'generate_trading_memo',
        arguments: { ticker: 'BTCUSDT', account: 'ACCT-DEMO-99' }
      });

      if (response.result && response.result.content) {
        const memo = JSON.parse(response.result.content[0].text);
        
        // Print the dashboard in terminal
        renderCliDashboard(memo, elapsed);
      } else if (response.error) {
        console.error(`${colors.red}Error calling generate_trading_memo: ${response.error.message}${colors.reset}`);
      }
    } catch (error) {
      console.error(`${colors.red}Failed simulation step: ${error}${colors.reset}`);
    }
  }, 5000);

  serverProcess.on('close', () => {
    clearInterval(pollInterval);
    console.log('\nQuantGuard server process exited.');
  });
}

// Clean console screen and render the dashboard layout
function renderCliDashboard(memo, elapsed) {
  // Clear screen
  console.clear();
  
  console.log(`${colors.bold}${colors.cyan}================================================================================${colors.reset}`);
  console.log(`🛡️  ${colors.bold}${colors.cyan}QUANTGUARD MICROSTRUCTURE SECURITY DASHBOARD${colors.reset}       | Elapsed: ${colors.bold}${colors.yellow}${elapsed}s${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}================================================================================${colors.reset}`);
  
  // Format recommendation badge
  const rec = memo.recommendation;
  let badge = '';
  if (rec === 'WAIT') badge = `${colors.bgRed}${colors.bold}   WAIT / SUSPEND   ${colors.reset}`;
  else if (rec === 'TWAP') badge = `${colors.bgYellow}${colors.bold}     TWAP ORDER     ${colors.reset}`;
  else if (rec === 'VWAP') badge = `${colors.blue}${colors.bold}     VWAP ORDER     ${colors.reset}`;
  else if (rec === 'MARKET') badge = `${colors.bgGreen}${colors.bold}    MARKET ORDER    ${colors.reset}`;
  else badge = `${colors.magenta}${colors.bold}   ${rec}   ${colors.reset}`;

  console.log(`Ticker: ${colors.bold}BTCUSDT${colors.reset} | Execution Strategy Recommendation: ${badge} (Conf: ${colors.green}${(memo.confidence * 100).toFixed(0)}%${colors.reset})`);
  console.log(`${colors.gray}--------------------------------------------------------------------------------${colors.reset}`);

  // Print metrics grid
  console.log(`${colors.bold}Metrics Overview:${colors.reset}`);
  console.log(`- Volatility: ${colors.cyan}${memo.volatility.volatility.toFixed(6)}${colors.reset}`);
  
  const vpinColor = memo.toxicity.status === 'HIGH' ? colors.red : (memo.toxicity.status === 'MEDIUM' ? colors.yellow : colors.green);
  console.log(`- Flow Toxicity (VPIN): ${vpinColor}${memo.toxicity.vpin} (${memo.toxicity.status} TOXICITY)${colors.reset}`);
  
  const spoofColor = memo.spoofing.detected ? colors.red : colors.green;
  console.log(`- Spoofing Detected: ${spoofColor}${memo.spoofing.detected ? 'YES 🚨' : 'NO'}${colors.reset}`);
  if (memo.spoofing.detected) {
    console.log(`  └ Details: ${colors.red}${memo.spoofing.details}${colors.reset}`);
  }

  const riskColor = memo.risk.riskApproved ? colors.green : colors.red;
  console.log(`- Risk Pre-Approval: ${riskColor}${memo.risk.riskApproved ? 'APPROVED ✅' : 'REJECTED ❌'}${colors.reset}`);
  console.log(`  └ VaR (95%): $${memo.risk.var95.toLocaleString()} | CVaR: $${memo.risk.expectedShortfall.toLocaleString()}`);

  console.log(`${colors.gray}--------------------------------------------------------------------------------${colors.reset}`);
  console.log(`${colors.bold}Chief Strategy Agent Memo:${colors.reset}`);
  
  // Wrap reasoning text roughly
  const text = memo.reasoning;
  const wrapped = text.match(/.{1,80}(\s|$)/g) || [text];
  wrapped.forEach(line => console.log(`  ${colors.gray}${line.trim()}${colors.reset}`));
  console.log(`${colors.bold}${colors.cyan}================================================================================${colors.reset}`);
}

// Handle termination
process.on('SIGINT', () => {
  serverProcess.kill();
  process.exit();
});

run();
