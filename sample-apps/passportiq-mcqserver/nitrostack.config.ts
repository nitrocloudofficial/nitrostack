/**
 * PassportIQ — NitroStack CLI / widget configuration.
 *
 * NOTE (Backend B): this file only carries CLI + widget metadata. It has no
 * transport field, and neither @nitrostack/cli nor @nitrostack/core reads one
 * from here. Transport selection happens inside NitroStackServer.start():
 *   NODE_ENV 'development' | 'dev' | unset -> stdio only
 *   anything else (e.g. 'production')      -> dual HTTP + stdio, bound to
 *                                             process.env.PORT / process.env.HOST
 * See .env.example for the vars that actually matter on deploy.
 *
 * `widgets.routes` must list every name passed to @Widget(...) anywhere in the
 * server, otherwise the CLI will not build/serve that widget route.
 */
export default {
  name: 'passportiq',
  version: '1.0.0',
  description:
    'AI copilot for passport verification officers — chained MCP verification pipeline with cross-application fraud graph intelligence',
  widgets: {
    dir: 'src/widgets',
    routes: [
      'officer-dashboard', // Frontend A — dashboard shell, timeline, risk panel
      'graph-view', // Frontend B — linked-applicant cluster reveal (fed by build_risk_graph)
      'risk-explanation', // Frontend A — explain_risk output
      'agent-console', // Agent — investigation trace + triage result
      'console', // Standalone officer console served at GET /console (not an @Widget)
    ],
  },
};
