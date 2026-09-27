from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set


@dataclass
class Capability:
    """
    Represents a single agent capability.
    """

    name: str
    category: str
    description: str = ""

    metadata: Dict[str, Any] = field(default_factory=dict)


class AgentCapabilities:
    """
    Enterprise Capability Registry.

    Tracks what an agent is capable of doing.

    Categories

        • MCP Tools
        • MCP Resources
        • MCP Prompts
        • Workflows
        • Skills
    """

    def __init__(self):

        self._tools: Dict[str, Capability] = {}

        self._resources: Dict[str, Capability] = {}

        self._prompts: Dict[str, Capability] = {}

        self._workflows: Dict[str, Capability] = {}

        self._skills: Dict[str, Capability] = {}

    # --------------------------------------------------
    # Internal
    # --------------------------------------------------

    def _register(
        self,
        collection: Dict[str, Capability],
        name: str,
        category: str,
        description: str = "",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Capability:

        capability = Capability(
            name=name,
            category=category,
            description=description,
            metadata=metadata or {},
        )

        collection[name] = capability

        return capability

    # --------------------------------------------------
    # Tools
    # --------------------------------------------------

    def add_tool(
        self,
        name: str,
        description: str = "",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Capability:

        return self._register(
            self._tools,
            name,
            "tool",
            description,
            metadata,
        )

    def remove_tool(
        self,
        name: str,
    ) -> bool:

        return self._tools.pop(name, None) is not None

    def tools(self) -> List[Capability]:

        return list(self._tools.values())

    # --------------------------------------------------
    # Resources
    # --------------------------------------------------

    def add_resource(
        self,
        name: str,
        description: str = "",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Capability:

        return self._register(
            self._resources,
            name,
            "resource",
            description,
            metadata,
        )

    def resources(self) -> List[Capability]:

        return list(self._resources.values())

    # --------------------------------------------------
    # Prompts
    # --------------------------------------------------

    def add_prompt(
        self,
        name: str,
        description: str = "",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Capability:

        return self._register(
            self._prompts,
            name,
            "prompt",
            description,
            metadata,
        )

    def prompts(self) -> List[Capability]:

        return list(self._prompts.values())

    # --------------------------------------------------
    # Workflows
    # --------------------------------------------------

    def add_workflow(
        self,
        name: str,
        description: str = "",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Capability:

        return self._register(
            self._workflows,
            name,
            "workflow",
            description,
            metadata,
        )

    def workflows(self) -> List[Capability]:

        return list(self._workflows.values())

    # --------------------------------------------------
    # Skills
    # --------------------------------------------------

    def add_skill(
        self,
        name: str,
        description: str = "",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Capability:

        return self._register(
            self._skills,
            name,
            "skill",
            description,
            metadata,
        )

    def skills(self) -> List[Capability]:

        return list(self._skills.values())

    # --------------------------------------------------
    # Lookup
    # --------------------------------------------------

    def has_tool(
        self,
        name: str,
    ) -> bool:

        return name in self._tools

    def has_resource(
        self,
        name: str,
    ) -> bool:

        return name in self._resources

    def has_prompt(
        self,
        name: str,
    ) -> bool:

        return name in self._prompts

    def has_workflow(
        self,
        name: str,
    ) -> bool:

        return name in self._workflows

    def has_skill(
        self,
        name: str,
    ) -> bool:

        return name in self._skills

    # --------------------------------------------------
    # Search
    # --------------------------------------------------

    def search(
        self,
        keyword: str,
    ) -> List[Capability]:

        keyword = keyword.lower()

        results = []

        collections = [
            self._tools,
            self._resources,
            self._prompts,
            self._workflows,
            self._skills,
        ]

        for collection in collections:

            for capability in collection.values():

                if (
                    keyword in capability.name.lower()
                    or keyword in capability.description.lower()
                ):
                    results.append(capability)

        return results

    # --------------------------------------------------
    # Statistics
    # --------------------------------------------------

    def statistics(self) -> Dict[str, int]:

        return {
            "tools": len(self._tools),
            "resources": len(self._resources),
            "prompts": len(self._prompts),
            "workflows": len(self._workflows),
            "skills": len(self._skills),
            "total": (
                len(self._tools)
                + len(self._resources)
                + len(self._prompts)
                + len(self._workflows)
                + len(self._skills)
            ),
        }

    # --------------------------------------------------
    # Diagnostics
    # --------------------------------------------------

    def diagnostics(self) -> Dict[str, Any]:

        return {
            "statistics": self.statistics(),
            "tool_names": sorted(self._tools.keys()),
            "workflow_names": sorted(self._workflows.keys()),
        }

    # --------------------------------------------------
    # Maintenance
    # --------------------------------------------------

    def clear(self) -> None:

        self._tools.clear()
        self._resources.clear()
        self._prompts.clear()
        self._workflows.clear()
        self._skills.clear()

    # --------------------------------------------------
    # Serialization
    # --------------------------------------------------

    def to_dict(self) -> Dict[str, Any]:

        def serialize(
            collection: Dict[str, Capability],
        ):

            return [
                capability.__dict__
                for capability in collection.values()
            ]

        return {
            "tools": serialize(self._tools),
            "resources": serialize(self._resources),
            "prompts": serialize(self._prompts),
            "workflows": serialize(self._workflows),
            "skills": serialize(self._skills),
        }

    # --------------------------------------------------
    # Magic Methods
    # --------------------------------------------------

    def __len__(self):

        return self.statistics()["total"]

    def __repr__(self):

        return (
            f"AgentCapabilities("
            f"capabilities={len(self)})"
        )