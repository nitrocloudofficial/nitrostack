# Backend Tests

Technology: Pytest + pytest-asyncio + httpx

## Running Tests

\\\ash
cd backend
source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pytest
pytest --cov=app --cov-report=html  # with coverage
\\\

## Phase 1 Status

No tests implemented in Phase 1. Test configuration is in pyproject.toml.

Phase 2 will add:
- Health endpoint test
- Router smoke tests
- Service unit tests with mocked dependencies
