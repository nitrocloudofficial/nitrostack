# CLI analytics events (`@nitrostack/cli`)

Super properties on every captured event: `product` (`cli`), `surface` (`terminal`), `environment` (`production` | `staging` | `development`), `app_version` (CLI semver), plus `cli_version`, `node_version`, `os_platform`, `os_arch`.

**Distinct ID:** stable anonymous hash of `hostname:username` (first 16 hex chars of SHA-256). Identity helpers (`onLoginSuccess`, `hydrateAnalyticsFromSession`, `setAnalyticsOrganization`) exist for the NitroCloud login journey; they are only wired from CLI commands once **feat/cli-deploy-auth (#357)** merges.

Opt-out: set `DO_NOT_TRACK=1` or `NITROSTACK_TELEMETRY=0` (or `false`/`no`) to disable all capture. In CI, telemetry is off unless `NITROSTACK_ANALYTICS_IN_CI=1`.

**Events on `main` today:** see the numbered list in [`ANALYTICS.md`](../ANALYTICS.md) (`cli_command_invoked`, `cli_init_*`, `cli_dev_*`, `cli_build_*`, `cli_start_executed`, `cli_generate_*`, `cli_upgrade_completed`, `cli_install_*`, `cli_cursor_*`, etc.).

## Cloud journey — ships with #357 (`feat/cli-deploy-auth`)

These events are documented here for cross-PR consistency; the commands (`login`, `link`, `deploy`) are not on `main` until #357 lands.

| Event | When | Properties | Location (after #357) |
| --- | --- | --- | --- |
| `cli_login_completed` | NitroCloud session saved after token or browser login | `command`, `auth_method` (`token` \| `browser`), `cloud_user_id` (when known), `user_email` (when known) | `src/commands/login.ts` |
| `cli_studio_connected` | Project linked to NitroCloud app/org via `nitrostack link` (NitroStudio / Cloud app connection step in the CLI journey) | `command`, `cloud_user_id`, `user_email`, `organization_id`, `app_id`, `target` (`nitrocloud`) — group `organization` | `src/commands/link.ts` |
| `cli_deploy_completed` | Deploy pipeline reaches success (wait mode) | `command`, `cloud_user_id`, `user_email`, `app_id`, `deployment_id`, `target` (`nitrocloud`) — group `organization` | `src/commands/deploy.ts` |
| `cli_deploy_failed` | Deploy observation ends in failure | `command`, `cloud_user_id`, `user_email`, `app_id`, `deployment_id`, `error_code`, `target` (`nitrocloud`) — group `organization` | `src/commands/deploy.ts` |

Configuration: see `.env.example` (`NITROSTACK_POSTHOG_KEY` optional override, `NITROSTACK_POSTHOG_HOST`, `NODE_ENV`). With no key in the environment, the CLI uses its built-in public project key unless telemetry is opted out.
