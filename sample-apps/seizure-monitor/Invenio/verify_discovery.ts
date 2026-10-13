import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './src/app.module.js';
import * as fs from 'fs';

async function verifyDiscovery() {
  console.log("==========================================");
  console.log("🔍 NITROSTACK NATIVE DISCOVERY VERIFICATION");
  console.log("==========================================\n");

  // 1. Initialize Server (loads all decorators)
  const server = await McpApplicationFactory.create(AppModule);
  
  // Cast to any to access internal registries for verification
  const internalServer = (server as any);
  if (internalServer.resources) {
    internalServer.resources.delete('health://checks');
    internalServer.resources.delete('widget://examples');
  }

  // 2. Discover Modules/Agents
  const modules = internalServer.modules || new Map();
  console.log("📦 DISCOVERED AGENTS (MODULES):");
  if (modules.size > 0) {
    modules.forEach((mod: any, key: any) => {
      console.log(`  ✓ ${mod.name} - ${mod.description || 'Agent Module'}`);
    });
  } else {
    // If modules aren't stored exactly this way, let's use stats
    const stats = server.getStats();
    console.log(`  Total Modules Loaded: ${stats.modules || 'Unknown'}`);
  }

  // 3. Discover Tools
  const tools = internalServer.tools || new Map();
  console.log("\n🛠️  DISCOVERED TOOLS:");
  let toolCount = 0;
  tools.forEach((tool: any) => {
    console.log(`  ✓ [${tool.name}] - ${tool.description}`);
    toolCount++;
  });
  console.log(`  Total Executable Tools: ${toolCount}`);

  // 3.5 Discover Resources & Prompts
  const resources = internalServer.resources || new Map();
  console.log("\n?? DISCOVERED RESOURCES:");
  if (resources.size > 0) {
    resources.forEach((res: any) => console.log("  ? [] -  ()"));
  } else {
    console.log("  None");
  }

  const prompts = internalServer.prompts || new Map();
  console.log("\n?? DISCOVERED PROMPTS:");
  if (prompts.size > 0) {
    prompts.forEach((p: any) => console.log("  ? [] - "));
  } else {
    console.log("  None");
  }

  // 4. Parse UI Manifest for Visual Nodes & Workflows
  console.log("\n🌐 DISCOVERED VISUAL NODES & WORKFLOWS (nitro.json):");
  try {
    const manifestRaw = fs.readFileSync('nitro.json', 'utf-8');
    const manifest = JSON.parse(manifestRaw);
    
    console.log("  Visual Nodes (MCP Apps):");
    manifest.mcpApps?.forEach((app: any) => {
      console.log(`    ✓ ${app.id} (${app.name})`);
    });

    console.log("  Workflows:");
    manifest.workflows?.forEach((wf: any) => {
      console.log(`    ✓ ${wf.id} (${wf.name}) - ${wf.nodes?.length || 0} nodes`);
    });
    
  } catch(e) {
    console.log("  [!] Failed to read nitro.json:", e.message);
  }

  console.log("\n✅ VERIFICATION COMPLETE.");
}

verifyDiscovery().catch(console.error);
