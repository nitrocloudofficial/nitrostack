from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set


@dataclass
class Permission:
    """
    Represents a single permission granted to an agent.
    """

    name: str
    category: str

    description: str = ""

    enabled: bool = True

    metadata: Dict[str, Any] = field(default_factory=dict)


class AgentPermissions:
    """
    Enterprise Permission Manager.

    Controls agent access to:

        • MCP Servers
        • MCP Tools
        • Resources
        • Prompts
        • Workflows
        • Roles
    """

    def __init__(self):

        self._servers: Dict[str, Permission] = {}

        self._tools: Dict[str, Permission] = {}

        self._resources: Dict[str, Permission] = {}

        self._prompts: Dict[str, Permission] = {}

        self._workflows: Dict[str, Permission] = {}

        self._roles: Set[str] = set()

    # --------------------------------------------------
    # Internal
    # --------------------------------------------------

    def _grant(
        self,
        collection: Dict[str, Permission],
        name: str,
        category: str,
        description: str = "",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Permission:

        permission = Permission(
            name=name,
            category=category,
            description=description,
            metadata=metadata or {},
        )

        collection[name] = permission

        return permission

    # --------------------------------------------------
    # Servers
    # --------------------------------------------------

    def allow_server(
        self,
        server: str,
        description: str = "",
    ) -> Permission:

        return self._grant(
            self._servers,
            server,
            "server",
            description,
        )

    def can_access_server(
        self,
        server: str,
    ) -> bool:

        permission = self._servers.get(server)

        return (
            permission is not None
            and permission.enabled
        )

    # --------------------------------------------------
    # Tools
    # --------------------------------------------------

    def allow_tool(
        self,
        tool: str,
        description: str = "",
    ) -> Permission:

        return self._grant(
            self._tools,
            tool,
            "tool",
            description,
        )

    def can_execute_tool(
        self,
        tool: str,
    ) -> bool:

        permission = self._tools.get(tool)

        return (
            permission is not None
            and permission.enabled
        )

    # --------------------------------------------------
    # Resources
    # --------------------------------------------------

    def allow_resource(
        self,
        resource: str,
        description: str = "",
    ) -> Permission:

        return self._grant(
            self._resources,
            resource,
            "resource",
            description,
        )

    def can_read_resource(
        self,
        resource: str,
    ) -> bool:

        permission = self._resources.get(resource)

        return (
            permission is not None
            and permission.enabled
        )

    # --------------------------------------------------
    # Prompts
    # --------------------------------------------------

    def allow_prompt(
        self,
        prompt: str,
        description: str = "",
    ) -> Permission:

        return self._grant(
            self._prompts,
            prompt,
            "prompt",
            description,
        )

    def can_use_prompt(
        self,
        prompt: str,
    ) -> bool:

        permission = self._prompts.get(prompt)

        return (
            permission is not None
            and permission.enabled
        )

    # --------------------------------------------------
    # Workflows
    # --------------------------------------------------

    def allow_workflow(
        self,
        workflow: str,
        description: str = "",
    ) -> Permission:

        return self._grant(
            self._workflows,
            workflow,
            "workflow",
            description,
        )

    def can_execute_workflow(
        self,
        workflow: str,
    ) -> bool:

        permission = self._workflows.get(workflow)

        return (
            permission is not None
            and permission.enabled
        )

    # --------------------------------------------------
    # Roles
    # --------------------------------------------------

    def assign_role(
        self,
        role: str,
    ) -> None:

        self._roles.add(role)

    def revoke_role(
        self,
        role: str,
    ) -> None:

        self._roles.discard(role)

    def has_role(
        self,
        role: str,
    ) -> bool:

        return role in self._roles

    def roles(self) -> List[str]:

        return sorted(self._roles)

    # --------------------------------------------------
    # Revocation
    # --------------------------------------------------

    def revoke_tool(
        self,
        tool: str,
    ) -> None:

        self._tools.pop(tool, None)

    def revoke_server(
        self,
        server: str,
    ) -> None:

        self._servers.pop(server, None)

    def revoke_resource(
        self,
        resource: str,
    ) -> None:

        self._resources.pop(resource, None)

    def revoke_prompt(
        self,
        prompt: str,
    ) -> None:

        self._prompts.pop(prompt, None)

    def revoke_workflow(
        self,
        workflow: str,
    ) -> None:

        self._workflows.pop(workflow, None)

    # --------------------------------------------------
    # Statistics
    # --------------------------------------------------

    def statistics(self) -> Dict[str, int]:

        return {
            "servers": len(self._servers),
            "tools": len(self._tools),
            "resources": len(self._resources),
            "prompts": len(self._prompts),
            "workflows": len(self._workflows),
            "roles": len(self._roles),
        }

    # --------------------------------------------------
    # Diagnostics
    # --------------------------------------------------

    def diagnostics(self) -> Dict[str, Any]:

        return {
            "statistics": self.statistics(),
            "roles": self.roles(),
            "allowed_tools": sorted(
                self._tools.keys()
            ),
            "allowed_servers": sorted(
                self._servers.keys()
            ),
        }

    # --------------------------------------------------
    # Maintenance
    # --------------------------------------------------

    def clear(self) -> None:

        self._servers.clear()
        self._tools.clear()
        self._resources.clear()
        self._prompts.clear()
        self._workflows.clear()
        self._roles.clear()

    # --------------------------------------------------
    # Serialization
    # --------------------------------------------------

    def to_dict(self) -> Dict[str, Any]:

        def serialize(
            permissions: Dict[str, Permission],
        ):

            return [
                permission.__dict__
                for permission in permissions.values()
            ]

        return {
            "servers": serialize(self._servers),
            "tools": serialize(self._tools),
            "resources": serialize(self._resources),
            "prompts": serialize(self._prompts),
            "workflows": serialize(self._workflows),
            "roles": self.roles(),
        }

    # --------------------------------------------------
    # Magic Methods
    # --------------------------------------------------

    def __len__(self):

        return (
            len(self._servers)
            + len(self._tools)
            + len(self._resources)
            + len(self._prompts)
            + len(self._workflows)
        )

    def __repr__(self):

        return (
            f"AgentPermissions("
            f"permissions={len(self)}, "
            f"roles={len(self._roles)})"
        )