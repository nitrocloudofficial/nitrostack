import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { MentorModule } from './modules/mentor/mentor.module.js';
import { VerifyModule } from './modules/verify/verify.module.js';
import { SystemHealthCheck } from './health/system.health.js';

// ── MCP-2 of three. One stage of the loop, not the whole of it ────────────────
//
// MENTOR is three deployed MCP applications, and this one is the middle of them:
//
//   MCP-1  roster    role → the projects that role exists on → the brief → the
//                    checkpoint spec. Lives in `mcp-roster/`.
//   MCP-2  sentinel  ← this app. Verifies each gate against the build, finds the
//                    drift, files the verdict — and refuses to write the fix.
//   MCP-3  profile   the student record, and the flashcards made from the drift
//                    this app found. Lives in `mcp-profile/`.
//
// REGISTRAR, ROSTER and COACH used to be registered here, when this was one server.
// They moved to MCP-1 and MCP-3 in the three-way split and their imports here were
// left behind, which is what broke this build. They are gone rather than commented
// out: the modules no longer exist in this package, so there is nothing to re-enable.
//
// The split is not filing cabinetry. MCP-3 is the only process that ever holds a
// flashcard *answer*, so a bug anywhere in this app — a tool echoing its input, a
// log line, a widget rendering a raw artifact — cannot leak the thing the student is
// supposed to earn. Not having the data protects against more than a flag does
// (`shared/README.md`). Adding a tool here that needs an answer is the signal that
// it belongs in MCP-3.
//
// Gap 11 is the record of why the surface stays this narrow: in an MCP app the tool
// list *is* the interface, and the test each tool has to pass is not "is it useful"
// but "is it the same story".

// ── The other five commanders — built, tested, and deliberately NOT registered ──
//
// SENTINEL·DevOps, LEDGER·FinOps, VERDICT·Legal, RELAY·Civic, AEGIS·Trust and the
// COMMAND coordinator all still live in `modules/` with their tests green. They are
// unregistered rather than deleted, because in an MCP app the tool list *is* the
// interface: the client's model picks from it. Twenty extra tools next to MENTOR's
// three cost us three ways —
//
//   1. SENTINEL's `self_heal` runs on the *same* bundled pricing service and the
//      *same* `tax-before-discount` bug as MENTOR's fixture, and its description
//      promises to patch, prove and deploy. Ask a model "the pricing test is
//      failing, help" and it picks the actionable tool. MENTOR's entire thesis is
//      refusing to hand over the patch; shipping a sibling tool that hands it over
//      contradicts the pitch live, on our own bug.
//   2. `propose_patch` / `run_tests` / `resolve_incident` are write-to-source tools.
//      MENTOR proves it cannot modify a student's build (`awaitRecovery` asserts the
//      source is byte-identical). That proof is much weaker on a server that also
//      exposes tools which rewrite source.
//   3. RELAY autofills a masked Aadhaar and files a mock government application.
//      Not a question worth spending demo time on in an education submission.
//
// The Research claim in MENTOR-CONCEPT.md §6 is that the *engine* generalizes across
// unrelated domains. That is evidenced by five adapters against one lifecycle with
// passing tests — it does not require the tools to be live in the judge's client.
// Re-enable by uncommenting the import and the `imports:` entry.
//
// import { SentinelModule } from './modules/sentinel/sentinel.module.js';
// import { LedgerModule } from './modules/ledger/ledger.module.js';
// import { VerdictModule } from './modules/verdict/verdict.module.js';
// import { RelayModule } from './modules/relay/relay.module.js';
// import { AegisModule } from './modules/aegis/aegis.module.js';
// import { CommandModule } from './modules/command/command.module.js';

/**
 * Root Application Module — MENTOR.
 *
 * MENTOR is one `DomainAdapter` on the shared explainability engine in `core/`. The
 * engine runs five other domains (see the note above); MENTOR is the one that
 * inverts it — the other five resolve an incident by *changing* something, MENTOR
 * resolves one by explaining it and refusing to change anything. Same lifecycle,
 * inverted intent: `modules/mentor/mentor.adapter.ts`, `ARCHITECTURE.md` §7.6.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'mentor',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description:
    'MENTOR — pick a real project and a role on it, design your slice, build it against ' +
    'checkpoints derived from your own design, and when it breaks be shown the moment your build ' +
    'stopped matching the architecture you drew. Then fix it yourself: it refuses to. ' +
    'You did not just write the bug; you designed it.',
  imports: [
    ConfigModule.forRoot(),
    // The two halves of MCP-2's one story. VerifyModule watches a build against the
    // spec MCP-1 issued and files the verdict MCP-3 makes a card from; MentorModule
    // explains the drift it found and refuses to write the fix. `modules/verify/`
    // arrived with the three-way split and was unregistered until now, which is why
    // MCP-1's `open_session` hand-off and MCP-3's `build_verdict` gate both pointed at
    // tools that did not exist.
    VerifyModule,
    MentorModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}
