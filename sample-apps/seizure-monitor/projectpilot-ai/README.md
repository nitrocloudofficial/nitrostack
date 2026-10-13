# ProjectPilot AI — MCP Server

ProjectPilot AI is a multi-agent Model Context Protocol (MCP) server built with NitroStack. It automates project planning and human resource management workflows from Software Requirements Documents (SRD).

## Modules & Tools

1. Intake (IntakeModule)
   - parse_srd: Parses raw text or base64 PDF/CSV SRD documents.
   - register_team: Registers team member skills and capacities.
2. SDLC (SdlcModule)
   - list_sdlc_candidates: Evaluates suitable SDLC models.
3. Roadmap (RoadmapModule)
   - build_roadmap: Creates phase breakdowns, milestones, and risk analysis.
4. Allocation (AllocationModule)
   - allocate_roles: Matches members to roles by skills.
   - generate_task_schedule: Schedules tasks across team capacity.
5. Reporting (ReportingModule)
   - select_sdlc_model: Locks in user selection.
   - generate_planning_report: Produces the final planning report.
   - generate_allocation_report: Produces the team allocation summary.

## Running Locally

```bash
npm install
npm run build
npm start
```
