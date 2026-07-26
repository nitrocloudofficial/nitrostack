"""Version Loader component for loading and validating Product Knowledge Graph versions."""

import json
from pathlib import Path
from typing import Any, Dict, Union
from pydantic import ValidationError as PydanticValidationError

from agents.release_intelligence.interfaces import IVersionLoader
from agents.release_intelligence.models.knowledge_graph import KnowledgeGraphVersion
from agents.release_intelligence.exceptions import VersionLoadError
from agents.release_intelligence.utils.logger import logger


class VersionLoader(IVersionLoader):
    """Loads, validates, and deserializes Knowledge Graph versions."""

    def load_graph(self, version_data: Union[Dict[str, Any], str, Path]) -> KnowledgeGraphVersion:
        """Load and deserialize Knowledge Graph input into strongly typed KnowledgeGraphVersion model.

        Args:
            version_data: Dictionary, JSON raw string, or Path to JSON file.

        Returns:
            KnowledgeGraphVersion strongly typed object.

        Raises:
            VersionLoadError: If data loading or model validation fails.
        """
        logger.info("Loading Knowledge Graph version data...")
        raw_dict: Dict[str, Any]

        try:
            if isinstance(version_data, Path) or (isinstance(version_data, str) and (version_data.endswith(".json") or Path(version_data).is_file())):
                file_path = Path(version_data)
                if not file_path.exists():
                    raise VersionLoadError(f"Knowledge Graph file not found: {file_path}")
                with open(file_path, "r", encoding="utf-8") as f:
                    raw_dict = json.load(f)
            elif isinstance(version_data, str):
                raw_dict = json.loads(version_data)
            elif isinstance(version_data, dict):
                raw_dict = version_data
            elif isinstance(version_data, KnowledgeGraphVersion):
                return version_data
            else:
                raise VersionLoadError(f"Unsupported version data type: {type(version_data)}")

            version_model = KnowledgeGraphVersion.model_validate(raw_dict)
            logger.info(f"Successfully loaded Knowledge Graph version '{version_model.version_id}' ({len(version_model.pages)} pages, {len(version_model.workflows)} workflows)")
            return version_model

        except PydanticValidationError as e:
            logger.error(f"Knowledge Graph schema validation error: {e}")
            raise VersionLoadError(f"Invalid Knowledge Graph schema: {e}") from e
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error loading graph version: {e}")
            raise VersionLoadError(f"Malformed JSON in graph version: {e}") from e
        except Exception as e:
            logger.error(f"Unexpected error loading graph version: {e}")
            raise VersionLoadError(f"Failed to load graph version: {e}") from e
