# ForgeOps demo motion package

Four silent 1920×1080 MP4 clips designed to transition into the live ForgeOps demo.

1. `01_incident_formation.mp4` — factory incident and yield collapse
2. `02_false_lead.mp4` — Machine 7 false lead versus queue-delay evidence
3. `03_scenario_comparison.mp4` — counterfactual intervention comparison
4. `04_agent_mcp_architecture.mp4` — four-agent, NitroCloud, and MCP architecture

Suggested edit order:

- Open with clip 1, then cut to the ForgeOps incident dashboard.
- Use clip 2 before opening the root-cause graph.
- Use clip 3 before cutting to the live What-if Simulator.
- Use clip 4 during the final technical minute.

All clips are silent so narration and music can be mixed independently.

## Re-render

```powershell
python video_assets\render_forgeops_clips.py --clip all
```
