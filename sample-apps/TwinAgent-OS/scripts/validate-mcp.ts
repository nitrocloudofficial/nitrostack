import { spawn } from 'child_process';
import path from 'path';

async function validateMCP() {
  console.log('=====================================================');
  console.log('  TwinAgent OS Official MCP Server Compatibility Audit');
  console.log('=====================================================\n');

  const cliPath = path.resolve(process.cwd(), 'src/mcp/cli.ts');
  const child = spawn('npx', ['tsx', cliPath], {
    env: { ...process.env, NODE_ENV: 'production' },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let stdoutPolluted = false;
  let toolsCount = 0;
  let resourcesCount = 0;
  let promptsCount = 0;
  let initialized = false;

  child.stderr.on('data', (data) => {
    const errText = data.toString().trim();
    if (errText) {
      console.log(`[STDERR LOG] ${errText}`);
    }
  });

  child.stdout.on('data', (chunk) => {
    const lines = chunk.toString().split('\n').filter((l: string) => l.trim().length > 0);
    for (const line of lines) {
      try {
        const json = JSON.parse(line);
        if (json.id === 1 && json.result) {
          initialized = true;
          console.log('✓ JSON-RPC Protocol Handshake (initialize): PASSED');
        } else if (json.id === 2 && json.result?.tools) {
          toolsCount = json.result.tools.length;
          console.log(`✓ Discovery Request (tools/list): PASSED (${toolsCount} tools registered)`);
        } else if (json.id === 3 && json.result?.resources) {
          resourcesCount = json.result.resources.length;
          console.log(`✓ Discovery Request (resources/list): PASSED (${resourcesCount} resources registered)`);
        } else if (json.id === 4 && json.result?.prompts) {
          promptsCount = json.result.prompts.length;
          console.log(`✓ Discovery Request (prompts/list): PASSED (${promptsCount} prompts registered)`);
        }
      } catch (err) {
        stdoutPolluted = true;
        console.error(`❌ STDOUT POLLUTION DETECTED: "${line}"`);
      }
    }
  });

  // Step 1. Send initialize
  const initReq = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'NitroStudio-Validator', version: '1.0.0' },
    },
  }) + '\n';

  child.stdin.write(initReq);

  // Step 2. Send initialized notification & discovery requests
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const initNotif = JSON.stringify({
    jsonrpc: '2.0',
    method: 'notifications/initialized',
  }) + '\n';
  child.stdin.write(initNotif);

  const toolsReq = JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }) + '\n';
  child.stdin.write(toolsReq);

  const resourcesReq = JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'resources/list' }) + '\n';
  child.stdin.write(resourcesReq);

  const promptsReq = JSON.stringify({ jsonrpc: '2.0', id: 4, method: 'prompts/list' }) + '\n';
  child.stdin.write(promptsReq);

  await new Promise((resolve) => setTimeout(resolve, 1500));

  child.kill('SIGTERM');

  console.log('\n-----------------------------------------------------');
  console.log('Final Validation Checklist Results:');
  console.log(`• Stdio Stream Purity (Zero stdout pollution): ${stdoutPolluted ? 'FAIL' : 'PASS'}`);
  console.log(`• MCP Server Handshake: ${initialized ? 'PASS' : 'FAIL'}`);
  console.log(`• Tools Discovery: ${toolsCount === 15 ? 'PASS (15/15)' : `FAIL (${toolsCount}/15)`}`);
  console.log(`• Resources Discovery: ${resourcesCount === 4 ? 'PASS (4/4)' : `FAIL (${resourcesCount}/4)`}`);
  console.log(`• Prompts Discovery: ${promptsCount === 3 ? 'PASS (3/3)' : `FAIL (${promptsCount}/3)`}`);
  console.log('-----------------------------------------------------\n');

  if (!stdoutPolluted && initialized && toolsCount === 15 && resourcesCount === 4 && promptsCount === 3) {
    console.log('✅ OVERALL STATUS: 100% NITROSTUDIO & OFFICIAL MCP COMPLIANT\n');
    process.exit(0);
  } else {
    console.error('❌ OVERALL STATUS: COMPATIBILITY VALIDATION FAILED\n');
    process.exit(1);
  }
}

validateMCP();
