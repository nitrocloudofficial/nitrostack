# CLI analytics events (`@nitrostack/cli`)

Super properties on every captured event: `product` (`cli`), `surface` (`terminal`), `environment` (`production` | `staging` | `development`), `app_version` (CLI semver), plus `cli_version`, `node_version`, `os_platform`, `os_arch`.

Identity: before login, `distinct_id` is a stable anonymous hash of `hostname:username`. After successful `nitrostack login`, the anonymous id is aliased to the NitroCloud user id and subsequent events use that id. When email is known, events include `user_email` and `$identify` sets person `email`.

Opt-out: set `DO_NOT_TRACK=1` or `NITROSTACK_TELEMETRY=0` (or `false`/`no`) to disable all capture.

| Event | When | Properties | Location |
| --- | --- | --- | --- |
| `cli_login_completed` | NitroCloud session saved after token or browser login | `command`, `auth_method` (`token` \| `browser`), `cloud_user_id` (when known), `user_email` (when known) | `src/commands/login.ts` |
| `cli_studio_connected` | Project linked to NitroCloud app/org via `nitrostack link` (NitroStudio / Cloud app connection step in the CLI journey) | `command`, `cloud_user_id`, `user_email`, `organization_id`, `app_id`, `target` (`nitrocloud`) — group `organization` | `src/commands/link.ts` |
| `cli_deploy_completed` | Deploy pipeline reaches success (wait mode) | `command`, `cloud_user_id`, `user_email`, `app_id`, `deployment_id`, `target` (`nitrocloud`) — group `organization` | `src/commands/deploy.ts` |
| `cli_deploy_failed` | Deploy observation ends in failure | `command`, `cloud_user_id`, `user_email`, `app_id`, `deployment_id`, `error_code`, `target` (`nitrocloud`) — group `organization` | `src/commands/deploy.ts` |

Configuration: see `.env.example` (`NITROSTACK_POSTHOG_KEY` optional override, `NITROSTACK_POSTHOG_HOST`, `NODE_ENV`). With no key in the environment, the CLI uses its built-in public project key unless telemetry is opted out.
