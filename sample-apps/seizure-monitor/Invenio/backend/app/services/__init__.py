"""
Services Package

The service layer contains all business logic for Invenio.

Services are stateless Python classes that:
- Orchestrate calls to external APIs, databases, and caches
- Transform raw data into domain entities
- Apply business rules and validation
- Are injected into FastAPI routers via Depends()

Services:
  research.py       — ResearchService: paper discovery, semantic search
  datasets.py       — DatasetService: dataset indexing and retrieval
  repositories.py   — RepositoryService: GitHub/GitLab integration
  graph.py          — GraphService: Neo4j knowledge graph operations
  evidence.py       — EvidenceService: evidence extraction and scoring
  reports.py        — ReportService: AI report generation via Nitro

Pattern:
  class ResearchService:
      def __init__(self, db: AsyncSession, cache: Redis):
          self.db = db
          self.cache = cache

      async def search_papers(self, query: str, ...) -> List[Paper]:
          # 1. Check Redis cache
          # 2. Query Neo4j for semantic matches
          # 3. Fetch from OpenAlex if not cached
          # 4. Store in Supabase
          # 5. Return typed results
          ...

Phase 1: All services are stubs.
"""
