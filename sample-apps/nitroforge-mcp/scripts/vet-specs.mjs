#!/usr/bin/env node
/**
 * scripts/vet-specs.mjs
 *
 * P0 checklist item: "Vet both specs WITH A SCRIPT, not by reading them
 * into an AI context." Runs the real, tested ParserService
 * (src/modules/ingest/parser.service.ts, unmodified) against every file in
 * fixtures/specs/ and reports pass/fail + a structural summary. Exits
 * non-zero if any spec fails to parse, so this is CI-usable, not just a
 * manual check.
 *
 * HONESTY NOTE: the team brief's "2-3 pre-vetted specs" is aspirational —
 * this repo currently only ships fixtures/specs/demo.yaml. This script
 * vets whatever is actually present rather than assuming a second file
 * exists; the moment a second spec lands, running this script again is the
 * whole story.
 *
 * Usage: node scripts/vet-specs.mjs   (run after `npm run build`)
 */
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ParserService } from '../dist/modules/ingest/parser.service.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SPECS_DIR = join(__dirname, '..', 'fixtures', 'specs');

function summarizeGraph(graph) {
  const methodCounts = {};
  for (const e of graph.endpoints) {
    methodCounts[e.method] = (methodCounts[e.method] ?? 0) + 1;
  }
  const tags = [...new Set(graph.endpoints.flatMap((e) => e.tags))];
  const authTypes = [...new Set(Object.values(graph.securitySchemes).map((s) => s.type))];
  return {
    title: graph.source.title,
    version: graph.source.version,
    endpointCount: graph.endpoints.length,
    methodCounts,
    resourceGroups: tags,
    authTypes,
  };
}

async function main() {
  const files = (await readdir(SPECS_DIR)).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml') || f.endsWith('.json'));

  if (files.length === 0) {
    console.error(`No spec files found in ${SPECS_DIR}`);
    process.exit(1);
  }

  console.log(`Vetting ${files.length} spec file(s) in fixtures/specs/ against the real ParserService...\n`);

  const parser = new ParserService();
  let failures = 0;

  for (const file of files) {
    const path = join(SPECS_DIR, file);
    const raw = await readFile(path, 'utf-8');
    process.stdout.write(`  ${file} ... `);
    try {
      const graph = await parser.parseSpecBody(raw);
      const summary = summarizeGraph(graph);
      console.log('OK');
      console.log(`    title:           ${summary.title} v${summary.version}`);
      console.log(`    endpoints:       ${summary.endpointCount}`);
      console.log(`    methods:         ${JSON.stringify(summary.methodCounts)}`);
      console.log(`    resource groups: ${summary.resourceGroups.join(', ')}`);
      console.log(`    auth types:      ${summary.authTypes.join(', ') || '(none)'}`);
    } catch (err) {
      failures += 1;
      console.log('FAILED');
      console.log(`    ${err instanceof Error ? err.constructor.name + ': ' + err.message : String(err)}`);
    }
    console.log('');
  }

  if (files.length < 2) {
    console.log(
      `NOTE: only ${files.length} spec present (team brief targets 2-3 pinned specs). ` +
        `Add more .yaml/.json files to fixtures/specs/ and re-run this script — no other change needed.`,
    );
  }

  if (failures > 0) {
    console.error(`\n${failures}/${files.length} spec(s) failed to parse.`);
    process.exit(1);
  }
  console.log(`All ${files.length} spec(s) parsed successfully.`);
  // Something in the ParserService dependency chain keeps a handle open
  // (same "doesn't exit cleanly" pattern seen with EmitterService — not
  // yet root-caused). Force exit rather than let CI hang on a script that
  // already did its job correctly.
  process.exit(0);
}

main().catch((err) => {
  console.error('vet-specs.mjs crashed:', err);
  process.exit(1);
});
