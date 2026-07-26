# LexoNova

> An autonomous legal-rights assistant for Indian workers, built as an MCP server.

LexoNova helps workers, contract employees, and gig workers understand whether what happened is a legal violation—and if so, what to do about it.

It doesn't just answer questions. It runs a full autonomous legal triage pipeline: identifying the issue, checking applicable law, flagging filing deadlines, determining the right authority to approach, and generating a ready-to-use case document—all from a single plain-language description of what happened.

Built for the NitroStack MCP Agentic AI Hackathon at Amrita Coimbatore.

---

## The Problem

Most workers who experience wage theft, wrongful termination, harassment, or retaliation never file a complaint—not because they don't care, but because they:

* Don't know whether what happened is actually illegal.
* Don't know which authority they should approach.
* Don't have the required documentation ready when they decide to take action.

Legal literacy is often the biggest barrier—not the legal system itself.

---

## What LexoNova Does

A worker describes their situation in plain language—in English, Tamil, Hindi, or other Indian languages.

From there, the agent autonomously decides what to do next, chaining and branching across tools based on what it discovers, without the worker having to know what to ask for.

---

## Example Workflow

### User Input

> "My manager fired me two days after I complained to HR about not being paid overtime. I'm a contract worker in Coimbatore, Tamil Nadu."

### LexoNova Autonomously:

* Searches applicable Constitution Articles and Labour Code sections.
* Assesses the case pattern and recognizes potential retaliation in addition to wage violations.
* Checks relevant filing deadlines and flags urgency.
* Determines the correct authority to approach.
* Redirects to a union grievance process if applicable.
* Generates a structured legal brief containing:

  * Case summary
  * Incident timeline
  * Legal violations with citations
  * Evidence checklist
  * Filing instructions.

If the situation is ambiguous, LexoNova asks clarifying questions instead of guessing.

If it is not actually a legal violation, it says so honestly instead of manufacturing a case.

---

## Tools

| Tool                    | Purpose                                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------------------------- |
| `search_law`            | Searches Constitution Articles and Labour Code sections and returns matched provisions with citations |
| `assess_worker_case`    | Identifies which legal issues apply to a worker's situation                                           |
| `get_procedure`         | Returns step-by-step filing procedures for complaints                                                 |
| `check_deadline`        | Evaluates limitation periods and flags approaching or passed deadlines                                |
| `find_authority`        | Determines the correct authority to approach or redirects to a union grievance process                |
| `generate_legal_brief`  | Generates a structured legal case document                                                            |
| `generate_incident_log` | Creates a clean, dated incident timeline from user-provided events                                    |

---

## Autonomous Agent Flow

```text
Worker describes issue
            |
            v
     assess_worker_case
            |
            v
        search_law
            |
            v
     check_deadline
            |
            v
      find_authority
            |
            v
      get_procedure
            |
            v
  generate_incident_log
            |
            v
  generate_legal_brief
            |
            v
Structured legal guidance
```

The agent dynamically decides which tools to call and in what order.

---

## Architecture

| Component            | Technology                                                                |
| -------------------- | ------------------------------------------------------------------------- |
| Framework            | NitroStack (`@nitrostack/core`)                                           |
| Language             | TypeScript                                                                |
| LLM                  | Claude Sonnet                                                             |
| Frontend             | React Widgets (`@Widget`)                                                 |
| Data Layer           | `legal.data.ts` containing Indian Labour Code and Constitution references |
| Prompt Orchestration | `legal.prompts.ts` governing autonomous tool chaining and branching logic |

---

## Why This Is Agentic

LexoNova is not a fixed workflow or chatbot with simple tool-calling.

The agent determines its own execution path based on what it discovers.

### Clear Legal Violation

```text
User Input
     ↓
Legal Assessment
     ↓
Law Search
     ↓
Deadline Check
     ↓
Authority Selection
     ↓
Procedure Generation
     ↓
Legal Brief Generation
```

### Ambiguous Case

```text
User Input
     ↓
Insufficient Information
     ↓
Clarifying Questions
     ↓
Reassessment
```

### Union-Covered Worker

```text
User Input
     ↓
Union Membership Detected
     ↓
Redirect to Grievance Process
```

### No Legal Violation

```text
User Input
     ↓
Assessment Complete
     ↓
No Applicable Legal Issue
     ↓
Honest Explanation Provided
```

The agent branches autonomously rather than following a predefined script.

---

## Safety & Trust Design

LexoNova is designed to prioritize transparency and legal safety.

### Grounded Legal Citations

* Every legal citation is grounded in `search_law` results.
* The agent never cites specific Articles, Sections, or Acts from model memory alone.

### Informational Only

Every case assessment includes a visible disclaimer:

> "This information is provided for educational purposes only and does not constitute legal advice."

### No False Guarantees

LexoNova:

* Never predicts case outcomes.
* Never guarantees compensation.
* Frames findings as patterns that a legal professional can confirm.

### Human-in-the-Loop

LexoNova intentionally stops before any irreversible action.

It does NOT:

* Auto-file complaints.
* Auto-send emails.
* Submit legal documents.
* Contact authorities on behalf of users.

Every output is reviewed and acted upon by the worker.

---

## Multilingual Support

LexoNova automatically detects and responds in the worker's preferred language.

Supported use cases include:

* English
* Tamil
* Hindi
* Other major Indian languages

This ensures accessibility for workers who may not be comfortable navigating legal processes in English.

---

## Getting Started

### Clone the Repository

```bash
git clone https://github.com/sahanaa437/agentic-ai-workers.git
```

### Navigate to the Project

```bash
cd agentic-ai-workers
```

### Install Dependencies

```bash
npm install
```

### Run the Development Server

```bash
npm run dev
```

---

## Testing in NitroStudio

Open NitroStudio and connect it to the running MCP server to:

* Inspect available tools.
* Test conversations.
* View live tool-call traces.
* Render legal briefs and incident logs as widgets.

---

## Roadmap

* Expand `legal.data.ts` to cover the complete Indian Labour Code across all states.
* Add gig worker and platform-based employment classification support.
* Support persistent case tracking across sessions.
* Draft complaint letter generation for worker review.
* Improve multilingual legal terminology coverage.

> Complaint letters will remain human-reviewed. LexoNova will never auto-submit legal documents.

---

## Team

LexoNova was built by:

* Vidhyalakshmi N P
* Sahana Arunprasath
* Samiksha S
* Tanvi V

Built as part of the NitroStack MCP Agentic AI Hackathon at Amrita Vishwa Vidyapeetham, Coimbatore.

---

## Disclaimer

LexoNova provides general legal information to help workers understand their rights and organize their case.

It is **not** a substitute for a licensed employment lawyer and does **not** constitute formal legal advice.

For legal decisions or representation, please consult:

* A licensed employment lawyer.
* Your state's Labour Commissioner's office.
* Relevant worker or labour welfare authorities.

---

## Built For

**NitroStack MCP Agentic AI Hackathon**

Amrita Vishwa Vidyapeetham, Coimbatore
