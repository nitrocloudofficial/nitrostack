"""Result Publisher for publishing exploration results to storage destinations."""

import json
from pathlib import Path
from agents.explorer.models.exploration_result import ExplorationResult
from agents.explorer.interfaces import AbstractResultPublisher
from agents.explorer.exceptions import PublishingError
from agents.explorer.utils.logger import get_logger

logger = get_logger()


class ResultPublisher(AbstractResultPublisher):
    """Publishes ExplorationResult to disk as JSON, formatted for downstream ADIP agents.
    
    Designed with extension points to seamlessly integrate with PostgreSQL, Redis, Kafka, or Cloud Storage backends in future releases.
    """

    def __init__(self, output_dir: Path):
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)

    async def publish(self, result: ExplorationResult) -> str:
        """Serialize and publish ExplorationResult.json to disk."""
        target_file = self.output_dir / "ExplorationResult.json"

        try:
            logger.info(f"Publishing ExplorationResult (ID: {result.exploration_id}) to {target_file}...")
            json_data = result.model_dump_json(indent=2)
            with open(target_file, "w", encoding="utf-8") as f:
                f.write(json_data)

            logger.info(f"ExplorationResult successfully published to: {target_file.resolve()}")
            return str(target_file.resolve())
        except Exception as e:
            logger.error(f"Failed to publish ExplorationResult: {e}")
            raise PublishingError(f"Result publishing failure: {e}") from e

    # Future extension hooks for Event Bus / DB publishing
    async def publish_to_event_bus(self, result: ExplorationResult, event_topic: str = "adip.explorer.completed") -> None:
        """Extension point: Publish result payload to Kafka / NATS / PubSub event stream."""
        logger.info(f"Extension point: publish_to_event_bus triggered for topic '{event_topic}'.")

    async def publish_to_database(self, result: ExplorationResult, connection_string: str) -> None:
        """Extension point: Persist structured graph and observations directly to PostgreSQL / Neo4j."""
        logger.info("Extension point: publish_to_database triggered.")
const_publisher = ResultPublisher
