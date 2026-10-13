/**
 * Enterprise Agentic Bridge — MCP server entry point.
 *
 * Four things happen here beyond the standard NitroStack bootstrap:
 *
 *   1. The HTTP JSON body limit is raised to 50mb before the transport is built.
 *      This has to happen here, not in a module: NitroStack constructs its
 *      Express app during `start()` and the parser closes over its options at
 *      construction, so any later configuration is too late. See
 *      `HttpHardeningService` for why the default 100kb is disqualifying.
 *   2. The live server instance is stashed in the server registry. That is what
 *      lets `generate_custom_skill` register a brand-new MCP tool on the running
 *      server and have it appear in the client's tool list without a restart.
 *   3. Previously generated skills are rehydrated from the durable registry, so
 *      a restart does not lose the swarm's work.
 *   4. The effective security posture is logged, because "auth is configured"
 *      is not something an operator should have to infer from a failed request.
 */
import 'dotenv/config';
import { McpApplicationFactory, DIContainer } from '@nitrostack/core';
import { AppModule } from './app.module.js';
import { setServer } from './shared/services/server-registry.js';
import { ensureWidgetsBuilt } from './shared/ensure-widgets.js';
import { SkillRuntimeService } from './modules/skills/skill-runtime.service.js';
import { AuthService } from './shared/services/auth.service.js';
import { LlmService } from './shared/services/llm.service.js';
import { applyTransportEnv } from './shared/transport.js';
import { applyJsonBodyLimit, hardeningState } from './shared/services/http-hardening.service.js';

// Compile-time build stamp: if this string doesn't appear in the boot banner,
// Studio is running stale code and needs its server restarted.
const BUILD_STAMP = '2026-07-26T06:05-eacces-fallback+manifest-writable';

async function bootstrap() {
  // NitroStack picks its transport from MCP_TRANSPORT_TYPE and its listen
  // address from PORT/HOST, ignoring the @McpApp transport block. Translate this
  // project's BRIDGE_TRANSPORT into those before anything reads them, or
  // BRIDGE_TRANSPORT=http silently starts a stdio server.
  const transport = applyTransportEnv();

  // Must run before create(): the factory resolves every @Widget route to a
  // static export while building the tool list, and throws if one is missing.
  ensureWidgetsBuilt();

  // Must run before start(): the Express json parser is built during start().
  const hardening = await applyJsonBodyLimit();
  if (hardening.jsonBodyLimitVia === 'failed') {
    console.error(
      `[bridge] Could not raise the HTTP JSON body limit ahead of transport construction ` +
        `(${hardening.jsonBodyLimitError}). Falling back to in-place router patching at bootstrap.`
    );
  }

  const server = await McpApplicationFactory.create(AppModule);

  // Must happen before start(): a client can call tools the moment we are up.
  setServer(server);

  await server.start();

  try {
    const auth = DIContainer.getInstance().resolve(AuthService) as AuthService;
    const state = hardeningState();
    console.error(`[bridge] Build stamp: ${BUILD_STAMP}`);
    console.error(
      `[bridge] Transport: ${transport.type}` +
        (transport.type === 'stdio' ? '' : ` on ${transport.host}:${transport.port}/mcp`)
    );
    console.error(
      `[bridge] Security: auth ${auth.description}; scope=${state.authScope}; ` +
        `JSON body limit ${state.jsonBodyLimit} (via ${state.jsonBodyLimitVia})` +
        (state.httpEdgeInstalled ? '; HTTP auth edge installed' : '')
    );
    if (transport.type !== 'stdio') {
      // Printed explicitly because "the platform says the deploy failed but the
      // app is clearly up" is almost always a probe hitting a path that 404s.
      console.error(
        `[bridge] Liveness probes: ${
          state.probePathsMounted.length ? state.probePathsMounted.join(', ') : 'NONE MOUNTED'
        } (framework health: /mcp/health)`
      );
    }

    const llm = DIContainer.getInstance().resolve(LlmService) as LlmService;
    console.error(
      `[bridge] LLM reasoning: ${llm.available ? 'ON' : 'OFF'} (${llm.description})` +
        (llm.available
          ? ''
          : ' — set OPENROUTER_API_KEY (or call the configure_llm tool) to enable persona reasoning and the master orchestrator.')
    );
  } catch {
    // Diagnostics only — never a reason to fail a boot that otherwise succeeded.
  }

  // Re-register skills the swarm minted in a previous session.
  try {
    const runtime = DIContainer.getInstance().resolve(SkillRuntimeService) as SkillRuntimeService;
    const { restored, failed } = runtime.rehydrate();
    if (restored.length) {
      console.error(`[bridge] Rehydrated ${restored.length} generated skill(s): ${restored.join(', ')}`);
    }
    for (const f of failed) {
      console.error(`[bridge] Could not rehydrate skill "${f.name}": ${f.error}`);
    }
  } catch (error) {
    // Never let skill rehydration take the server down — the core tools still work.
    console.error(
      '[bridge] Skill rehydration skipped:',
      error instanceof Error ? error.message : String(error)
    );
  }
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start the Enterprise Agentic Bridge:', error);
  process.exit(1);
});
