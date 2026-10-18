# Agent install guard

This dependency-free Node 18+ hook checks explicit npm registry package installs and
package runners with Dep Bouncer before an agent's shell command runs. BLOCK denies
the command and REVIEW asks for user approval. ALLOW emits no output, leaving the
host's own permission prompts in place. Reports include
findings and any suggested safe version. A known BLOCK still denies a command if
another package check is unavailable.

## Claude Code

Add to a project's `.claude/settings.json` or `~/.claude/settings.json` (merge with
existing hooks). Replace the absolute path with your checkout's path:

```json
{ "hooks": { "PreToolUse": [ { "matcher": "Bash", "hooks": [ { "type": "command", "command": "node /path/to/dep-bouncer/guard/dep-bouncer-guard.mjs" } ] } ] } }
```

## Cursor

Add to `.cursor/hooks.json`:

```json
{ "version": 1, "hooks": { "beforeShellExecution": [ { "command": "node /path/to/dep-bouncer/guard/dep-bouncer-guard.mjs --cursor" } ] } }
```

Quote paths containing spaces inside the command string (escape double quotes as
`\"` in JSON). On Windows, forward slashes work in the Node script path.

## Configuration

- `DEP_BOUNCER_URL`: MCP endpoint override. Defaults to
  `https://dep-bouncer-6ad22414-giberelin-heapify-global-community.app.nitrocloud.ai/mcp`.
- `DEP_BOUNCER_FAIL_CLOSED=1`: ask for approval on unavailable, timed-out, or
  invalid responses. Default behavior emits no output and warns on stderr,
  leaving host permissions unchanged. This also applies to malformed hook input.
- `DEP_BOUNCER_API_KEY`: API key for servers configured with
  `DEP_BOUNCER_API_KEYS`. Sent on every request as `x-api-key` and MCP
  `params._meta.apiKey`. HTTP 401/403 is an unavailable check; the stderr message
  points to this setting without printing the key.

Set these in the environment inherited by the agent. Checks run in batches of five with
a 25-second timeout per request. Configure the host hook timeout above that if
needed. Every distinct name/spec pair is checked; larger batches need a longer
host hook timeout. Non-install commands emit no output in either host format.

## Coverage

Handles explicit `npm install` aliases (including `install-test` / `it`), `pnpm add/install/i`, `yarn add` / `yarn global add`,
`bun add/install/i`, and `npx`, `npm exec/x`, `pnpm dlx`, `yarn dlx`, `bunx`.
It respects quoted arguments and shell separators, leading environment assignments
and `env`, `sudo`, `command`, `corepack`, executable paths and `.cmd` shims,
subshell groups, and quoted `bash -c` / `sh -c` commands (up to four nested shells).
It handles package-manager-specific flags, scoped packages, versions/ranges/tags, and
`npm:` aliases. Runners check explicit `--package` arguments or the first package
argument, without treating the invoked program's arguments as dependencies.

Bare `npm install` and `npm ci` from a lockfile are not checked; use the
`bouncer_check_manifest` tool. Local paths, Git URLs, repository shorthands, tarballs,
and other non-registry specs cannot be checked and ask for approval. Commands that
mention an install but cannot be confidently parsed also ask, even in fail-open mode.
This is a command parser, not a shell interpreter: scripts, unsupported wrappers,
substitutions, dynamically constructed commands,
transitive dependencies, other package managers, and alternate terminal tools are
outside its coverage. It checks a requested range/tag before execution; it does not
pin the eventual registry resolution or rewrite the command.

Example denied command: `npm i axios@1.14.1` → `Dep Bouncer BLOCK axios@1.14.1: Suspicious release. Install axios@1.14.0 instead.`
