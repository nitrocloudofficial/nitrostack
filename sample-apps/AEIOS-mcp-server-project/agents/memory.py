from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional


class MemoryEntry:
    """
    Represents a single memory item.
    """

    def __init__(
        self,
        key: str,
        value: Any,
        category: str = "general",
    ) -> None:

        self.key = key
        self.value = value
        self.category = category

        self.created_at = datetime.utcnow()
        self.updated_at = self.created_at

    def update(self, value: Any) -> None:

        self.value = value
        self.updated_at = datetime.utcnow()

    def to_dict(self) -> Dict[str, Any]:

        return {
            "key": self.key,
            "value": self.value,
            "category": self.category,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class AgentMemory:
    """
    Enterprise Working Memory.

    Stores:

    • observations
    • tool outputs
    • reasoning
    • intermediate results
    • temporary context

    This is short-term memory only.
    Enterprise long-term memory is implemented later.
    """

    def __init__(self):

        self._memory: Dict[str, MemoryEntry] = {}

    # --------------------------------------------------
    # Store
    # --------------------------------------------------

    def store(
        self,
        key: str,
        value: Any,
        category: str = "general",
    ) -> None:

        if key in self._memory:

            self._memory[key].update(value)

        else:

            self._memory[key] = MemoryEntry(
                key,
                value,
                category,
            )

    # --------------------------------------------------
    # Retrieve
    # --------------------------------------------------

    def retrieve(
        self,
        key: str,
        default=None,
    ) -> Any:

        entry = self._memory.get(key)

        if entry is None:
            return default

        return entry.value

    # --------------------------------------------------
    # Delete
    # --------------------------------------------------

    def remove(
        self,
        key: str,
    ) -> bool:

        if key not in self._memory:
            return False

        del self._memory[key]

        return True

    # --------------------------------------------------
    # Clear
    # --------------------------------------------------

    def clear(self) -> None:

        self._memory.clear()

    # --------------------------------------------------
    # Search
    # --------------------------------------------------

    def search(
        self,
        keyword: str,
    ) -> Dict[str, Any]:

        keyword = keyword.lower()

        results = {}

        for key, entry in self._memory.items():

            if keyword in key.lower():

                results[key] = entry.value

                continue

            if keyword in str(entry.value).lower():

                results[key] = entry.value

        return results

    # --------------------------------------------------
    # Categories
    # --------------------------------------------------

    def category(
        self,
        category: str,
    ) -> Dict[str, Any]:

        return {
            key: entry.value
            for key, entry in self._memory.items()
            if entry.category == category
        }

    # --------------------------------------------------
    # Listing
    # --------------------------------------------------

    def keys(self) -> List[str]:

        return list(self._memory.keys())

    def values(self) -> List[Any]:

        return [
            item.value
            for item in self._memory.values()
        ]

    def entries(self) -> List[MemoryEntry]:

        return list(self._memory.values())

    # --------------------------------------------------
    # Statistics
    # --------------------------------------------------

    def statistics(self) -> Dict[str, Any]:

        categories = {}

        for item in self._memory.values():

            categories.setdefault(
                item.category,
                0,
            )

            categories[item.category] += 1

        return {
            "entries": len(self._memory),
            "categories": categories,
        }

    # --------------------------------------------------
    # Diagnostics
    # --------------------------------------------------

    def diagnostics(self) -> Dict[str, Any]:

        return {
            "statistics": self.statistics(),
            "keys": self.keys(),
        }

    # --------------------------------------------------
    # Serialization
    # --------------------------------------------------

    def to_dict(self) -> Dict[str, Any]:

        return {
            key: value.to_dict()
            for key, value in self._memory.items()
        }

    @classmethod
    def from_dict(
        cls,
        data: Dict[str, Any],
    ) -> "AgentMemory":

        memory = cls()

        for item in data.values():

            memory.store(
                item["key"],
                item["value"],
                item.get(
                    "category",
                    "general",
                ),
            )

        return memory

    # --------------------------------------------------
    # Magic Methods
    # --------------------------------------------------

    def __contains__(
        self,
        key: str,
    ) -> bool:

        return key in self._memory

    def __len__(self):

        return len(self._memory)

    def __iter__(self):

        return iter(self._memory.values())

    def __repr__(self):

        return (
            f"AgentMemory("
            f"entries={len(self)})"
        )