# AGENTS.md

This project's full constitution lives in **CLAUDE.md**. Read it in full before
making any change.

It applies to **every agent** — OpenCode, Hermes, Codex, Claude Code — not just
Claude Code. It defines:

- The locked scope (six tools, one resource, one prompt, three widgets)
- Hard rules that are defects if violated
- Ownership zones (which machine may edit which files)
- The approval and comprehension gates

Team coordination across the three machines lives in **TEAM.md**. Read that too.

## The rules you will forget

1. Every relative import ends in `.js` (ES modules). Never `.ts`, never bare.
2. Widgets use inline styles only. Tailwind does not work inside the iframe.
3. Every `@Tool` with a `@Widget` needs `examples.response` or the widget
   renders blank.
4. Run `nitrostack-cli generate types` after any schema change.
5. Only edit files inside your machine's ownership zone (see TEAM.md §3).
6. Never commit secrets, `.env`, or `node_modules`. Never delete `.gitignore`.

## If you are on M4 or LOQ

You own `src/widgets/**` (M4) or the risk engine + tests + docs (LOQ). Build
against the frozen contract in `src/types/contracts.ts`. Do not edit files
outside your zone — message the owner instead.
