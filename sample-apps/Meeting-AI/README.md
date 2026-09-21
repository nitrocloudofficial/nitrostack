# Meeting AI — Agentic Meeting Follow-Through, Automated

**An MCP server that turns raw meeting transcripts into summaries, correctly-owned action items, tasks, and follow-ups — as one autonomous agentic chain, not a manual checklist.**

Built for the [Hackathon Name] hackathon — **Enterprise AI & Workplace Automation** track.

🔗 **Live deployment:** https://meetingai-6a64edc0-aibots-amrita-university-coimbatore.app.nitrocloud.ai

---

## Overview

MeetingMind AI eliminates the manual busywork after every meeting. Paste in a transcript, and the agent autonomously chains through six MCP tools — **summarize → extract action items → create tasks → schedule follow-ups → send reminders → update the dashboard** — callable individually or as a full pipeline by any MCP client.

What makes it more than a keyword-matching wrapper: the extraction logic parses the transcript speaker-by-speaker, then sentence-by-sentence, so it correctly distinguishes a *new* task from a *correction* to one already mentioned — for example, catching that "I'll assign it to Bob" reassigns an existing item's owner rather than creating a duplicate task, and resolving natural-language deadlines like "end of February" or "mid-February" into real dates instead of generic placeholders.

## The Problem

After every meeting, someone has to manually write a summary, figure out who owns what, chase deadlines, and set reminders. MeetingMind AI does all of that as one agentic chain of MCP tool calls — not a fixed pipeline the user has to trigger step by step.

## What It Does

Paste in a meeting transcript, and the agent:

1. **Summarizes** the meeting (title, attendees, key points, decisions, next steps)
2. **Extracts action items** — task, owner, deadline, and priority — correctly parsing natural corrections like *"assign it to Bob"* or *"set the priority to high"* as updates to the right item, not new tasks
3. **Creates tasks** from those action items
4. **Schedules follow-up meetings**
5. **Sends reminders**
6. **Surfaces everything on a dashboard** — recent meetings, pending/completed tasks, upcoming deadlines

The extraction logic is turn-aware: it splits the transcript by speaker first, then reads sentence-by-sentence within each turn, so it doesn't just pattern-match keywords — it tracks who said what, and who a task got reassigned to.

## Architecture

MeetingMind AI is built as a single **MCP (Model Context Protocol) server** using the **NitroStack TypeScript SDK** — not a separate frontend calling out to a backend. The server itself is the deliverable; any MCP client (NitroStudio, Claude, etc.) can connect to it and call its tools directly.

### MCP Tools

| Tool | Input | Output |
|---|---|---|
| `summarizeMeeting` | transcript | structured summary (title, attendees, key points, decisions, next steps) |
| `extractActionItems` | transcript | list of `{ task, owner, deadline, priority }` |
| `createTask` | task, owner, deadline, priority | task object with generated ID |
| `scheduleFollowUp` | meeting title, date, time | calendar event object |
| `sendReminder` | task ID | reminder confirmation |
| `getDashboardData` | — | recent meetings, pending/completed tasks, upcoming deadlines |

### Widgets

Rendered inline in any MCP client via NitroStack's Widget SDK:

- **Meeting summary card**
- **Action items table** (task / owner / deadline / priority)
- **Dashboard widget**

### Tech Stack

- **NitroStack TypeScript SDK** — decorator-based MCP framework, Zod schema validation, dependency injection
- **React + TypeScript** — widget UI
- **NitroStudio** — used throughout development for live tool testing and widget preview
- **NitroCloud** — production deployment

## Scope Notes

- **Scheduling and reminders are currently mocked.** `scheduleFollowUp` and `sendReminder` return well-formed event/confirmation objects but don't yet call a real calendar or notification service. In production, these would integrate with the Google Calendar API and a real notification provider.
- **Data source is mock/fixture-based** for this build — no external database.
- **Speech-to-text (audio → transcript) is not included** in this build; the pipeline currently starts from a text transcript.

## Running Locally

```bash
npm install
npm run dev
```

This starts the MCP server (STDIO transport) and the widget dev server on `http://localhost:3001`. Connect to the project from NitroStudio to test tools and preview widgets live.

## Deployment

Deployed to NitroCloud, redeploying automatically on pushes to `main`.

## Team

[Team name / members here]
