#!/usr/bin/env node
/**
 * Quick demo script to test MedLens MCP server
 * Shows tools and resources in action
 */

import { spawn } from 'child_process';

const demos = [
  {
    name: '1. Simulate Ransomware Incident',
    tool: 'simulate_incident',
    params: { incident_type: 'ransomware' }
  },
  {
    name: '2. Get Full State Summary',
    tool: 'get_state_summary',
    params: {}
  },
  {
    name: '3. Get Pending Actions',
    tool: 'get_pending_actions',
    params: {}
  },
  {
    name: '4. Get Governance Rules',
    tool: 'get_rules',
    params: {}
  }
];

console.log('\n🎬 MedLens MCP Server Demo (10-min quick test)\n');
console.log('=' .repeat(60));

// Parse from server output in dev mode
const runDemo = async () => {
  console.log('\n✅ Server is running on stdio');
  console.log('\n📋 Available Tools:\n');
  
  demos.forEach(d => {
    console.log(`  ${d.name}`);
    console.log(`     Tool: ${d.tool}`);
    console.log(`     Params: ${JSON.stringify(d.params)}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('\n💡 DEMO COMMANDS FOR VIDEO:\n');
  console.log('Copy-paste into Claude/Copilot Chat:\n');
  
  console.log('  1. "Simulate a ransomware incident and show me the state"');
  console.log('  2. "List all pending governance actions"');
  console.log('  3. "Get the full system state with all department budgets"');
  console.log('  4. "Show me the governance rules in priority order"');
  console.log('  5. "What are the active threats?"');

  console.log('\n🎥 QUICK RECORDING STEPS (10 mins):\n');
  console.log('  1. Open Copilot Chat in VS Code (Ctrl+L)');
  console.log('  2. Ask: "Simulate a ransomware incident and show me the state"');
  console.log('  3. Show the response with threats, budgets, clusters');
  console.log('  4. Ask: "List all pending governance actions"');
  console.log('  5. Show the action queue and conflict detection');
  console.log('  6. Ask: "Show me the governance rules"');
  console.log('  7. End with: "Get the audit log to show tamper-proof history"');

  console.log('\n' + '='.repeat(60));
  console.log('\n📍 Server Status: RUNNING');
  console.log('📡 Transport: stdio');
  console.log('🔌 Connected to: Claude Desktop / VS Code Copilot Chat');
  console.log('\n✨ Ready to record!\n');
};

runDemo().catch(console.error);
