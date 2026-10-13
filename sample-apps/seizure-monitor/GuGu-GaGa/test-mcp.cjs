const { spawn } = require('child_process');

const child = spawn('node', ['dist/index.js'], { stdio: ['pipe', 'pipe', 'pipe'] });

let stdoutData = '';

child.stdout.on('data', (data) => {
  stdoutData += data.toString();
});

child.stderr.on('data', (data) => {
  console.log('STDERR:', data.toString());
});

// Step 1: Initialize
setTimeout(() => {
  child.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test-client', version: '1.0.0' } }
  }) + '\n');
}, 1000);

// Step 2: List Resources
setTimeout(() => {
  child.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    id: 2,
    method: 'resources/list',
    params: {}
  }) + '\n');
}, 2500);

// Step 3: List Prompts
setTimeout(() => {
  child.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    id: 3,
    method: 'prompts/list',
    params: {}
  }) + '\n');
}, 3500);

// Step 4: Call Tool evaluate_applicant
setTimeout(() => {
  child.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: {
      name: 'evaluate_applicant',
      arguments: {
        creditScore: 610,
        dtiRatio: 49,
        annualIncome: 42000,
        liquidSavings: 1500,
        creditHistoryYears: 3,
        monthlyDebtPayment: 1715
      }
    }
  }) + '\n');
}, 4500);

setTimeout(() => {
  console.log('\n--- MCP Response ---');
  console.log(stdoutData);
  child.kill();
  process.exit(0);
}, 6500);

