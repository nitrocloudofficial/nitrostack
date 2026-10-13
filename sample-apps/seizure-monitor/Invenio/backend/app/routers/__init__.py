"""
Routers Package

Each module in this package is a FastAPI APIRouter for a specific domain.

Routers:
  research.py         — /api/v1/research
  datasets.py         — /api/v1/datasets
  repositories.py     — /api/v1/repositories
  graph.py            — /api/v1/graph
  evidence.py         — /api/v1/evidence
  reports.py          — /api/v1/reports
  health.py           — /health, /api/v1/status

Convention:
- Routers are thin — they call services, never business logic directly.
- Request/response types are always Pydantic schemas from app.schemas.
- Authentication/authorization handled via dependency injection (Phase 3).
"""
