# PassportIQ widgets

Owned by **Frontend A** (officer dashboard) and **Frontend B** (graph view, risk
explanation). Backend B created this directory only because the server **cannot
boot without it** — see below.

## Why these files exist (read before deleting anything)

`@Widget('graph-view')` is not lazy. At bootstrap, `buildTool()` calls
`createComponentFromNextRoute()`, which **throws if an exported HTML file for
that route does not exist**:

```
Error: Exported HTML for route 'graph-view' not found. Tried:
  - <cwd>/dist/widgets/out/graph-view/index.html
  - <cwd>/dist/widgets/out/graph-view.html
```

That is a boot failure, not a degraded widget — no tools register at all. So
every route named in a `@Widget(...)` decorator anywhere in `src/` must have a
file here, or nobody's tools load.

## How the path is resolved

From `@nitrostack/core/dist/ui-next/index.js`:

```js
const defaultDir = fs.existsSync('<cwd>/src/widgets') ? '<cwd>/src/widgets'
                                                      : '<cwd>/dist/widgets';
// then looks for: <defaultDir>/out/<route>/index.html
//            or: <defaultDir>/out/<route>.html
```

Because `src/widgets/` now exists, resolution lands on
`src/widgets/out/<route>/index.html` — the same path in `tsx` dev **and** in a
built `dist/` run, since `cwd` is the project root either way. That is
deliberate: it removes any need for a copy-JSON/copy-HTML build step, which
`tsc` would not do for us.

`tsconfig.json` excludes `src/widgets`, so nothing in here is type-checked or
compiled.

## Does the file content matter?

In `@nitrostack/core@1.0.14`, **no**. The existence check passes, then core
discards the file and serves HTML from its own internal
`generateSimpleWidgetHtml(routePath, id)` template, which renders
`window.openai.toolOutput` generically.

The content is written properly anyway, because:

- the exported `widgetBundleHtmlCandidates()` helper (unused in 1.0.14) reads
  exactly these paths, so a future core version is likely to serve them;
- `nitrostack-cli dev` can serve them directly with `WIDGETS_DEV_MODE=true`;
- they document the tool-output shape each widget receives.

## Replacing these with the real UI

Frontend A / Frontend B: build your Next.js app in this directory and export to
`out/`, keeping the `out/<route>/index.html` layout. Nothing in `src/` needs to
change — the `@Widget(...)` route names are already wired:

| Route | Tool | Owner |
|---|---|---|
| `officer-dashboard` | `run_verification_pipeline` | Frontend A |
| `graph-view` | `build_risk_graph` | Frontend B |
| `risk-explanation` | `explain_risk` | Frontend B |

`risk-explanation` has no `@Widget` pointing at it yet; the file is here so
attaching it to `explain_risk` does not require a scaffolding step first.

## Local preview

These pages read `window.openai.toolOutput` and fall back to a bundled sample
payload when opened directly in a browser, so you can iterate on them without
running the MCP server:

```bash
npx http-server src/widgets/out -p 4173
```
