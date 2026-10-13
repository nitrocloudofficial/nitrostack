# NitroStack CLI — PostHog Analytics Tracking Plan

## Overview

The NitroStack CLI integrates PostHog analytics to understand usage patterns, identify friction points, and improve the developer experience. All tracking is anonymous — no personal data or project source code is ever captured.

**PostHog Project:**
- Host: `https://us.i.posthog.com`
- Key: `phc_OufG1OuiamSbCBMVHfO70IyFWKBzsiaDpOWqcNwtz6G`

---

## Global Properties (sent with every event)

| Property | Type | Description |
|---|---|---|
| `cli_version` | string | @nitrostack/cli package version |
| `node_version` | string | Node.js runtime version |
| `os_platform` | string | `process.platform` (darwin, linux, win32) |
| `os_arch` | string | `process.arch` (x64, arm64) |

**Distinct ID:** Anonymous machine-based ID derived from `os.hostname() + os.userInfo().username`, hashed with SHA-256. Consistent across sessions on the same machine; not personally identifiable.

---

## Events

### 1. `cli_command_invoked`

Fired at the start of every command execution.

| Property | Type | Example |
|---|---|---|
| `command` | string | `"init"`, `"dev"`, `"build"` |
| `options` | object | Command flags passed (keys only, no values for privacy) |

---

### 2. `cli_init_completed`

Fired when `nitrostack init` completes successfully.

| Property | Type | Example |
|---|---|---|
| `template` | string | `"typescript-starter"` |
| `skip_install` | boolean | `false` |
| `has_custom_description` | boolean | `true` |
| `duration_ms` | number | `12340` |

---

### 3. `cli_init_failed`

Fired when `nitrostack init` fails or is cancelled.

| Property | Type | Example |
|---|---|---|
| `error` | string | Error message (truncated to 200 chars) |
| `stage` | string | `"template_copy"`, `"npm_install"` |

---

### 4. `cli_dev_started`

Fired when `nitrostack dev` reaches the "ready" state.

| Property | Type | Example |
|---|---|---|
| `has_widgets` | boolean | `true` |
| `port` | number | `3001` |
| `startup_duration_ms` | number | `4500` |

---

### 5. `cli_dev_stopped`

Fired when `nitrostack dev` shuts down (graceful or error).

| Property | Type | Example |
|---|---|---|
| `session_duration_ms` | number | `360000` |
| `exit_reason` | string | `"sigint"`, `"error"` |

---

### 6. `cli_build_completed`

Fired when `nitrostack build` succeeds.

| Property | Type | Example |
|---|---|---|
| `has_widgets` | boolean | `true` |
| `widget_count` | number | `3` |
| `duration_ms` | number | `8200` |

---

### 7. `cli_build_failed`

Fired when `nitrostack build` fails.

| Property | Type | Example |
|---|---|---|
| `error` | string | `"TypeScript compilation failed"` |
| `stage` | string | `"typescript"`, `"widgets"` |

---

### 8. `cli_start_executed`

Fired when `nitrostack start` is executed.

| Property | Type | Example |
|---|---|---|
| `has_built_widgets` | boolean | `true` |
| `port` | number | `3000` |
| `build_exists` | boolean | `true` |

---

### 9. `cli_generate_completed`

Fired when `nitrostack generate` completes.

| Property | Type | Example |
|---|---|---|
| `component_type` | string | `"module"`, `"tools"`, `"middleware"` |
| `has_module_flag` | boolean | `false` |
| `files_generated` | number | `4` |
| `used_force` | boolean | `false` |

---

### 10. `cli_generate_failed`

Fired when `nitrostack generate` fails.

| Property | Type | Example |
|---|---|---|
| `component_type` | string | `"module"` |
| `error` | string | `"File Exists"` |

---

### 11. `cli_upgrade_completed`

Fired when `nitrostack upgrade` completes.

| Property | Type | Example |
|---|---|---|
| `packages_upgraded` | number | `2` |
| `from_version` | string | `"1.0.5"` |
| `to_version` | string | `"1.0.9"` |
| `dry_run` | boolean | `false` |
| `already_current` | boolean | `false` |

---

### 12. `cli_install_completed`

Fired when `nitrostack install` completes.

| Property | Type | Example |
|---|---|---|
| `has_widgets` | boolean | `true` |
| `skip_widgets` | boolean | `false` |
| `production` | boolean | `false` |
| `duration_ms` | number | `15000` |

---

### 13. `cli_install_failed`

Fired when `nitrostack install` fails.

| Property | Type | Example |
|---|---|---|
| `error` | string | `"npm install failed"` |
| `stage` | string | `"root"`, `"widgets"` |

---

## Insights & Dashboards (to be created in PostHog)

### Key Metrics

| Metric | Query | Purpose |
|---|---|---|
| **Daily Active CLI Users** | Unique users firing `cli_command_invoked` per day | Adoption tracking |
| **Weekly Active CLI Users** | Unique users per week | Growth metric |
| **Command Usage Distribution** | Count of `cli_command_invoked` grouped by `command` | Understand which commands are most used |
| **Template Popularity** | Count of `cli_init_completed` grouped by `template` | Guide template investment |
| **Build Success Rate** | `cli_build_completed / (cli_build_completed + cli_build_failed)` | Quality metric |
| **Init Success Rate** | `cli_init_completed / (cli_init_completed + cli_init_failed)` | Onboarding quality |
| **Avg Dev Session Duration** | Mean of `session_duration_ms` from `cli_dev_stopped` | Engagement depth |
| **Generate Type Distribution** | Count of `cli_generate_completed` grouped by `component_type` | Feature usage |
| **Upgrade Adoption** | Count of `cli_upgrade_completed` where `already_current=false` | Version adoption |

### Funnels

| Funnel | Steps | Purpose |
|---|---|---|
| **Onboarding** | `init` → `dev` → `build` | Track new user journey |
| **Init to Dev** | `cli_init_completed` → `cli_dev_started` | Measure drop-off after project creation |
| **Dev to Build** | `cli_dev_started` → `cli_build_completed` | Measure progression to production |
| **Build to Start** | `cli_build_completed` → `cli_start_executed` | Deployment readiness |

### Dashboards

1. **CLI Overview** — DAU, WAU, command distribution, error rates
2. **Onboarding Health** — Init funnel, template choices, install success rates
3. **Developer Engagement** — Dev session durations, generate usage, upgrade adoption
4. **Error Monitoring** — Failed commands by type, error message grouping

---

## Implementation Notes

- **Non-blocking:** All PostHog calls are fire-and-forget. Analytics never delay or block CLI operations.
- **Graceful shutdown:** `posthog.shutdown()` is called with a short timeout to flush pending events before process exit.
- **No PII:** No file paths, project names, source code, or personally identifiable data is captured.
- **Consistent identity:** A stable anonymous ID is derived per-machine so usage can be correlated across sessions.
