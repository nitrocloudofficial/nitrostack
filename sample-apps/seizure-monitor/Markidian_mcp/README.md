# MarkItDown MCP Server

An EdTech-focused MCP server for turning lectures, readings, videos, and notes into structured study material.
n
## Problem Statement

Students and educators work across many formats: lecture slides, PDFs, textbooks, videos, audio recordings, webpages, and course notes. That variety creates a learning problem: useful material is often scattered, hard to review, and not organized in a way that supports retention, revision, or exam prep.

This project solves that gap by exposing a Model Context Protocol server that converts learning content into Markdown and optionally saves the result into an Obsidian vault. It gives students, teachers, and AI systems a single, safe interface for turning raw material into readable, searchable, connected study notes.

## What This Server Does

- Converts lecture files, readings, slides, images, audio, and Markdown into study-ready Markdown.
- Converts webpages, Bing search result pages, YouTube videos, and Git repositories into Markdown for research and coursework.
- Reads existing Markdown files from disk.
- Saves, appends, patches, lists, and retrieves notes in an Obsidian vault.
- Generates topic notes, study guides, quizzes, and vault graph summaries for revision, recall, and connected learning.

## High-Level Architecture

- `src/index.ts` boots the NitroStack MCP application.
- `src/app.module.ts` wires together the Markdownify and Obsidian modules plus a health check.
- `src/modules/markdownify/*` defines tools, prompts, and resources for turning learning materials into Markdown.
- `src/modules/obsidian/*` defines tools and services for vault operations, study note generation, and knowledge-graph style learning workflows.
- `src/Markdownify.ts` contains the conversion orchestration and external command integration.
- `src/utils.ts` holds path handling, URL validation, repo validation, summary generation, and Obsidian wikilink helpers.

## Supported Tools

### Markdownify

- `youtube-to-markdown`
- `pdf-to-markdown`
- `bing-search-to-markdown`
- `webpage-to-markdown`
- `image-to-markdown`
- `audio-to-markdown`
- `docx-to-markdown`
- `xlsx-to-markdown`
- `pptx-to-markdown`
- `git-repo-to-markdown`
- `get-markdown-file`

### Obsidian

- `obsidian-generate-quiz`
- `obsidian-show-graph`
- `obsidian-convert-and-save`
- `obsidian-generate-topic-note`
- `obsidian-fill-uncreated-links`
- `obsidian-save-note`
- `obsidian-list-notes`
- `obsidian-get-note`
- `obsidian-append-note`
- `obsidian-patch-note`
- `obsidian-search-notes`
- `obsidian-delete-note`

> Warning: Obsidian vault support is included by default in Documents/markdownify directory, so converted study content can be saved straight into your vault unless you choose otherwise.

## EdTech Use Cases

- Turn lectures and recorded classes into structured summaries for revision.
- Convert course PDFs and textbooks into searchable notes.
- Generate topic study notes for exam preparation.
- Create practice quizzes from vault content.
- Build connected note networks that help learners move between concepts.
- Keep a personal learning workspace in Obsidian for recall and review.

## Safety And Validation

- HTTP and HTTPS URLs are allowed; private IPs and localhost are blocked.
- Repository URLs are validated before they are handed to Repomix.
- Local file access can be restricted with `MD_ALLOWED_PATHS` or `MD_SHARE_DIR`.
- Markdown file reads are limited to `.md` and `.markdown` files.
- The server falls back between local binaries and setup scripts for `markitdown` and `repomix`.

## Environment Variables

- `MARKITDOWN_PATH`: absolute path to the `markitdown` executable.
- `REPOMIX_PATH`: absolute path to the `repomix` executable.
- `MD_ALLOWED_PATHS`: path allowlist for local file access, separated by your platform path delimiter.
- `MD_SHARE_DIR`: alternate path allowlist for local file access.
- `OBSIDIAN_VAULT_PATH`: path to the Obsidian vault root.
- `OBSIDIAN_API_KEY`: API token for Obsidian REST access.
- `OBSIDIAN_PROTOCOL`, `OBSIDIAN_HOST`, `OBSIDIAN_PORT`: REST connection settings for Obsidian.

## Setup

```bash
npm install
npm run build
```

If the local `markitdown` helper is not already available, the project includes setup scripts that can create or patch the expected environment.

## Run

```bash
npm run dev
```

For production-style startup:

```bash
npm run start:prod
```

## Tests

```bash
npm test
```

## Notes

- The repo is centered on learning workflows, not general-purpose file editing.
- The most common user flow is: convert a lecture or reading, summarize it, and save the result into Obsidian for later study.
- Several tests exercise real conversions, so network access and external binaries may matter when running the full suite.