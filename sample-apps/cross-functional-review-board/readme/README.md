# Cross-Functional Decision Review Board

An AI-powered platform that reviews important business decisions using
multiple specialized AI agents — Product, Engineering, Security, and Legal —
before they're implemented. A Moderator agent synthesizes all agent input
into a final decision report with unresolved risks, required actions, and
an overall recommendation.

Built using NitroStack, with the workflow orchestrated through MCP agents,
tools, and resources.

## How It Works

1. A business decision/proposal is submitted to the system.
2. Each department agent (Product, Engineering, Security, Legal) independently
   analyzes the proposal against real company policies and context.
3. Agents review and respond to each other's concerns in a structured debate.
4. A Moderator agent combines everything into a final report.

## Team

| Member | Role |
|--------|------|
| Person 1 | [fill in] |
| Person 2 | [fill in] |
| Person 3 | [fill in] |
| Manesh (Person 4) | Integration, Testing & Demo |

## Project Structure

```
/demo          - fake company, policies, and sample proposals for testing
/test          - test cases and results
/docs          - architecture and setup documentation
/deployment    - deployment configuration and notes
/src           - agent and MCP server source code
```

## Setup & Installation

```bash
# TODO: fill in once Engineering finalizes the setup steps
git clone <repo-url>
cd cross-functional-decision-review-board
npm install   # or pip install -r requirements.txt
```

## Running Locally

```bash
# TODO: fill in run command once available
npm start
```

## Try It Out

Sample proposals to test the system are available in `demo/sample_proposals/`.
Fake company policies used for review are in `demo/fake_company/policies/`.

## Demo

See `demo/demo_script.md` for the suggested live demo flow.

## Deployment

See `deployment/deploy_notes.md` for deployment instructions.
