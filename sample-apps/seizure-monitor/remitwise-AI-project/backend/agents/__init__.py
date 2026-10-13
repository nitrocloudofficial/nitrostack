"""
RemitWise AI – Multi-Agent System
===================================
Top-level package for the AI agent layer.

Architecture:
    User Query
        │
        ▼
    OrchestratorAgent
        │
    ┌───┴───┬──────────────┐
    ▼       ▼              ▼
Exchange  Provider    Compliance
 Agent     Agent        Agent
    │       │              │
    └───┬───┴──────────────┘
        ▼
  Existing FastAPI Services (as Tools)
"""
