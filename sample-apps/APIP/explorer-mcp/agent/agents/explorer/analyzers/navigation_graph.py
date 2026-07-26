"""Navigation graph builder using NetworkX for modeling page topology."""

from typing import List, Dict, Any, Optional
import networkx as nx
from agents.explorer.models.navigation import NavigationEdge, NavigationGraphExport
from agents.explorer.models.page import PageNode
from agents.explorer.models.action import ActionTarget, ActionType
from agents.explorer.exceptions import NavigationGraphError
from agents.explorer.utils.logger import get_logger

logger = get_logger()


class NavigationGraphBuilder:
    """Manages the application topology as a NetworkX directed graph (nx.DiGraph)."""

    def __init__(self):
        self.graph = nx.DiGraph()

    def add_page_node(self, page: PageNode) -> None:
        """Add or update page node in navigation graph."""
        self.graph.add_node(
            page.page_id,
            url=page.url,
            title=page.title,
            depth=page.depth,
            visit_count=page.visit_count,
            elements_count=len(page.elements),
            forms_count=page.forms_count,
            is_authenticated=page.is_authenticated,
        )
        logger.debug(f"Graph node added/updated: {page.page_id} ({page.url})")

    def add_transition_edge(
        self,
        source_page_id: str,
        target_page_id: str,
        action: ActionTarget,
        trigger_text: str = ""
    ) -> None:
        """Add directed transition edge between two page nodes."""
        if not self.graph.has_node(source_page_id) or not self.graph.has_node(target_page_id):
            logger.warning(f"Attempted to add edge between non-existent nodes: {source_page_id} -> {target_page_id}")

        self.graph.add_edge(
            source_page_id,
            target_page_id,
            action_type=action.action_type.value,
            trigger_selector=action.css_selector,
            trigger_text=trigger_text,
            weight=1.0
        )
        logger.info(f"Graph edge added: {source_page_id} -> {target_page_id} via {action.action_type.value}")

    def export(self) -> NavigationGraphExport:
        """Export NetworkX graph to Pydantic NavigationGraphExport container."""
        nodes_list = []
        for n, attrs in self.graph.nodes(data=True):
            node_dict = {"id": n}
            node_dict.update(attrs)
            nodes_list.append(node_dict)

        edges_list = []
        for u, v, attrs in self.graph.edges(data=True):
            edge_dict = {"source": u, "target": v}
            edge_dict.update(attrs)
            edges_list.append(edge_dict)

        return NavigationGraphExport(
            nodes=nodes_list,
            edges=edges_list,
            total_nodes=self.graph.number_of_nodes(),
            total_edges=self.graph.number_of_edges(),
        )

    def get_shortest_path(self, start_page_id: str, target_page_id: str) -> List[str]:
        """Find shortest navigation path of page IDs between two pages."""
        try:
            return nx.shortest_path(self.graph, source=start_page_id, target=target_page_id)
        except (nx.NetworkXNoPath, nx.NodeNotFound) as e:
            logger.warning(f"No navigation path between {start_page_id} and {target_page_id}: {e}")
            return []
