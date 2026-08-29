#!/bin/bash
# Manual smoke test for the Aegis MCP server over stdio JSON-RPC.
# Run from the project root: ./scripts/test-mcp.sh

set -e
cd "$(dirname "$0")/.."

echo "Building..."
npx tsc

echo ""
echo "Running test sequence (connect gmail+dropbox -> detect -> graph -> fix)..."
echo "----------------------------------------------------------------------"

(
  echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0"}}}'
  sleep 0.3
  echo '{"jsonrpc":"2.0","method":"notifications/initialized"}'
  sleep 0.3
  echo '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
  sleep 0.3
  echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"connect_tool","arguments":{"agentId":"support-agent","toolId":"gmail"}}}'
  sleep 0.3
  echo '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"connect_tool","arguments":{"agentId":"support-agent","toolId":"dropbox"}}}'
  sleep 0.3
  echo '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"detect_attack_paths","arguments":{"agentId":"support-agent"}}}'
  sleep 0.3
  echo '{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"get_capability_graph","arguments":{"agentId":"support-agent"}}}'
  sleep 0.3
  echo '{"jsonrpc":"2.0","id":7,"method":"tools/call","params":{"name":"apply_policy_fix","arguments":{"agentId":"support-agent","ruleId":"exfiltration"}}}'
  sleep 0.5
) | WIDGETS_DEV_MODE=true WIDGETS_DEV_PORT=3001 node dist/index.js &
SERVER_PID=$!
sleep 5
kill "$SERVER_PID" 2>/dev/null || true

echo "----------------------------------------------------------------------"
echo "Done. Look at id:5 (exfiltration path), id:7 (riskScore should be 0)."
