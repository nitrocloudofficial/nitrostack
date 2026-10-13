# APIGuard documentation

This directory separates product explanation, implementation detail, operations, and judge-facing verification so each document has one clear job.

| Document | Use it when… |
|---|---|
| [Project explanation](PROJECT_EXPLANATION.md) | You need the problem statement, product thesis, and end-to-end behavior |
| [Architecture](ARCHITECTURE.md) | You are reviewing service boundaries, data flow, persistence, or state transitions |
| [Demo guide](DEMO_GUIDE.md) | You are rehearsing or recording the judged demonstration |
| [Security model](SECURITY.md) | You are evaluating GitHub-write controls, model isolation, or deployment risk |
| [NitroCloud deployment](NITROCLOUD_DEPLOYMENT.md) | You are configuring and validating the hosted MCP server |
| [NitroStudio input guide](../NITROSTUDIO_INPUT_GUIDE.md) | You need exact manual tool inputs |
| [Snapshot refresh](SNAPSHOT_REFRESH.md) | You need to regenerate pinned GitHub evidence |
| [NitroStack alignment](NITROSTACK_ALIGNMENT.md) | You are mapping the code to NitroStack concepts |
| [Verification report](../VERIFICATION.md) | You need executed checks and judge-safe claims |

`TEAM_IMPLEMENTATION_PLAN.md` and the CLI attempt logs are historical engineering records, not statements of current runtime behavior.
