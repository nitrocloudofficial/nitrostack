"""State Manager maintaining exploration state and supporting JSON serialization."""

import json
from pathlib import Path
from typing import Set, List, Dict, Optional, Any
from pydantic import BaseModel, Field
from agents.explorer.models.page import PageNode
from agents.explorer.models.element import UIElement
from agents.explorer.utils.helpers import normalize_url
from agents.explorer.utils.logger import get_logger

logger = get_logger()


class StateSnapshot(BaseModel):
    """Serializable snapshot of current exploration state."""
    current_url: str = ""
    visited_urls: List[str] = Field(default_factory=list)
    visited_element_ids: List[str] = Field(default_factory=list)
    pending_queue_urls: List[str] = Field(default_factory=list)
    total_actions_performed: int = 0
    is_authenticated: bool = False


class StateManager:
    """Tracks active exploration state, visited sets, target queues, and handles state persistence."""

    def __init__(self, base_url: str):
        self.base_url: str = normalize_url(base_url)
        self.current_url: str = self.base_url
        self.visited_urls: Set[str] = set()
        self.visited_element_ids: Set[str] = set()
        self.pending_urls: List[str] = [self.base_url]
        self.page_nodes: Dict[str, PageNode] = {}
        self.all_elements: Dict[str, UIElement] = {}
        self.total_actions_performed: int = 0
        self.is_authenticated: bool = False

    def mark_url_visited(self, url: str) -> None:
        norm = normalize_url(url)
        self.visited_urls.add(norm)
        if norm in self.pending_urls:
            self.pending_urls.remove(norm)

    def is_url_visited(self, url: str) -> bool:
        return normalize_url(url) in self.visited_urls

    def add_pending_url(self, url: str) -> None:
        norm = normalize_url(url)
        if norm not in self.visited_urls and norm not in self.pending_urls:
            self.pending_urls.append(norm)

    def mark_element_visited(self, element_id: str) -> None:
        self.visited_element_ids.add(element_id)

    def is_element_visited(self, element_id: str) -> bool:
        return element_id in self.visited_element_ids

    def register_page_node(self, page_node: PageNode) -> None:
        self.page_nodes[page_node.page_id] = page_node
        for elem in page_node.elements:
            self.all_elements[elem.element_id] = elem

    def create_snapshot(self) -> StateSnapshot:
        """Create serializable Pydantic snapshot."""
        return StateSnapshot(
            current_url=self.current_url,
            visited_urls=list(self.visited_urls),
            visited_element_ids=list(self.visited_element_ids),
            pending_queue_urls=list(self.pending_urls),
            total_actions_performed=self.total_actions_performed,
            is_authenticated=self.is_authenticated
        )

    def save_snapshot(self, path: Path) -> None:
        """Serialize current state to JSON file."""
        snapshot = self.create_snapshot()
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(snapshot.model_dump_json(indent=2))
        logger.info(f"Exploration state snapshot saved to {path}")

    @classmethod
    def load_snapshot(cls, path: Path, base_url: str) -> "StateManager":
        """Deserialize state manager from JSON file snapshot."""
        manager = cls(base_url)
        if not path.exists():
            return manager
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        snapshot = StateSnapshot(**data)
        manager.current_url = snapshot.current_url
        manager.visited_urls = set(snapshot.visited_urls)
        manager.visited_element_ids = set(snapshot.visited_element_ids)
        manager.pending_urls = snapshot.pending_queue_urls
        manager.total_actions_performed = snapshot.total_actions_performed
        manager.is_authenticated = snapshot.is_authenticated
        logger.info(f"Loaded exploration state snapshot from {path}")
        return manager
