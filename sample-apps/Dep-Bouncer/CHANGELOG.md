# Changelog

## 1.0.0 - 2026-10-18

- Added seven MCP tools for package, upgrade, manifest, install-script, and incident checks.
- Added policy, statistics, and incident-list resources, the `safe_install` prompt, and the verdict-card widget.
- Added live progress for manifest checks through MCP Tasks.
- Added the Claude Code and Cursor guard hook for checking package install commands.
- Added a benchmark covering five replayed hijacks and 200 popular packages.
- Deployed the live MCP server on NitroCloud.

### Security

- Fixed all findings from two independent security reviews: 16 from the first review and 10 from the second review on October 17.
- The guard now emits only deny or ask decisions, preserves host permission prompts, recognizes wrapped commands and subshells, and checks every package.
- Added `DEP_BOUNCER_API_KEY` support; incomplete checks require at least REVIEW and are excluded from safe-version suggestions.
- Resolve npm aliases to their real package, flag git and URL dependency specs, and continue checks when publisher names match.
