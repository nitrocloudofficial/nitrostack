"""Read Product Knowledge Graph data from request payload or Neo4j."""

import logging

from neo4j import AsyncGraphDatabase

from config import Settings
from models import Page, ProductKnowledgeGraph, Relationship, Workflow


class GraphReader:
    """Reads graph entities from a supplied graph or Neo4j."""

    def __init__(
        self,
        settings: Settings,
        graph: ProductKnowledgeGraph | None = None,
    ) -> None:
        self._settings = settings
        self._graph = graph
        self._logger = logging.getLogger(__name__)

    async def read_pages(self) -> list[Page]:
        """Return pages from input graph or Neo4j."""
        if self._graph is not None:
            return self._graph.pages

        records = await self._query("MATCH (p:Page) RETURN p")
        return [Page.model_validate(dict(record["p"])) for record in records]

    async def read_workflows(self) -> list[Workflow]:
        """Return workflows from input graph or Neo4j."""
        if self._graph is not None:
            return self._graph.workflows

        records = await self._query("MATCH (w:Workflow) RETURN w")
        return [Workflow.model_validate(dict(record["w"])) for record in records]

    async def read_relationships(self) -> list[Relationship]:
        """Return relationships from input graph or Neo4j."""
        if self._graph is not None:
            return self._graph.relationships

        query = """
        MATCH (source)-[relationship]->(target)
        RETURN source.id AS source_id,
               target.id AS target_id,
               type(relationship) AS type
        """
        records = await self._query(query)
        return [
            Relationship(
                source_id=record["source_id"],
                target_id=record["target_id"],
                type=record["type"],
            )
            for record in records
        ]

    async def _query(self, query: str) -> list:
        """Run a Neo4j read query."""
        if not all(
            [
                self._settings.neo4j_uri,
                self._settings.neo4j_username,
                self._settings.neo4j_password,
            ]
        ):
            raise RuntimeError("Neo4j credentials are not configured.")

        try:
            driver = AsyncGraphDatabase.driver(
                self._settings.neo4j_uri,
                auth=(
                    self._settings.neo4j_username,
                    self._settings.neo4j_password,
                ),
            )

            async with driver:
                async with driver.session() as session:
                    result = await session.run(query)
                    return [record async for record in result]

        except Exception as exc:
            self._logger.exception("Neo4j read failed.")
            raise RuntimeError("Unable to read Product Knowledge Graph.") from exc