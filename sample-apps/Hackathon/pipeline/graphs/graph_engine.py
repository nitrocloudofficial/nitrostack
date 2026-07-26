"""
HELIX: Advanced Enterprise Cognitive Genome Platform - Temporal Knowledge Graph & GraphRAG Engine
Stores entity nodes and temporal relationships for multi-hop graph traversal and contradiction resolution.
"""

import time
from typing import Dict, Any, List, Optional, Set


class GraphNode:
    """Represents an entity node in the HELIX Knowledge Graph."""
    def __init__(self, node_id: str, label: str, properties: Optional[Dict[str, Any]] = None):
        self.node_id = node_id
        self.label = label
        self.properties = properties or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.node_id,
            "label": self.label,
            "properties": self.properties
        }


class GraphEdge:
    """Represents a temporal relationship edge in the HELIX Knowledge Graph."""
    def __init__(
        self,
        source_id: str,
        target_id: str,
        relationship: str,
        valid_from: Optional[str] = None,
        valid_to: Optional[str] = None,
        properties: Optional[Dict[str, Any]] = None
    ):
        self.source_id = source_id
        self.target_id = target_id
        self.relationship = relationship
        self.valid_from = valid_from
        self.valid_to = valid_to
        self.properties = properties or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source": self.source_id,
            "target": self.target_id,
            "relationship": self.relationship,
            "valid_from": self.valid_from,
            "valid_to": self.valid_to,
            "properties": self.properties
        }


class KnowledgeGraphEngine:
    """
    Temporal Knowledge Graph & GraphRAG Engine for HELIX.
    Executes multi-hop graph traversal, entity resolution, and policy contradiction detection.
    """

    def __init__(self):
        self.nodes: Dict[str, GraphNode] = {}
        self.edges: List[GraphEdge] = []
        self._seed_zna_knowledge_graph()

    def add_node(self, node_id: str, label: str, properties: Optional[Dict[str, Any]] = None) -> GraphNode:
        node = GraphNode(node_id=node_id, label=label, properties=properties)
        self.nodes[node_id] = node
        return node

    def add_edge(
        self,
        source_id: str,
        target_id: str,
        relationship: str,
        valid_from: Optional[str] = None,
        valid_to: Optional[str] = None,
        properties: Optional[Dict[str, Any]] = None
    ) -> GraphEdge:
        edge = GraphEdge(
            source_id=source_id,
            target_id=target_id,
            relationship=relationship,
            valid_from=valid_from,
            valid_to=valid_to,
            properties=properties
        )
        self.edges.append(edge)
        return edge

    def query_multihop_path(self, start_entity: str, hops: int = 3) -> List[Dict[str, Any]]:
        """Executes multi-hop graph traversal starting from an entity node."""
        paths = []
        visited = set()

        def dfs(current_id: str, current_path: List[str], depth: int):
            if depth > hops or current_id in visited:
                return
            visited.add(current_id)

            for edge in self.edges:
                if edge.source_id.lower() == current_id.lower():
                    next_id = edge.target_id
                    new_path = current_path + [f"--[{edge.relationship}]-->", next_id]
                    paths.append({
                        "path": new_path,
                        "relationship": edge.relationship,
                        "valid_from": edge.valid_from
                    })
                    dfs(next_id, new_path, depth + 1)

        dfs(start_entity, [start_entity], 1)
        return paths

    def detect_contradictions(self) -> List[Dict[str, Any]]:
        """Identifies active policy contradiction edges in the graph."""
        contradictions = []
        for edge in self.edges:
            if edge.relationship in ["CONTRADICTS", "POLICY_VIOLATION", "UNMONITORED"]:
                contradictions.append(edge.to_dict())
        return contradictions

    def _seed_zna_knowledge_graph(self):
        """Seeds ZNA enterprise ground-truth entities and temporal relationships."""
        # Nodes
        self.add_node("David Miller", "Employee", {"department": "Compliance & Legal", "previous_dept": "Engineering"})
        self.add_node("Marcus Sterling", "Manager", {"department": "Engineering", "period": "2022"})
        self.add_node("Sarah Jenkins", "Executive", {"role": "Chief Compliance Officer"})
        self.add_node("Elena Rostova", "Executive", {"role": "VP Real Estate & Strategy"})
        self.add_node("Sarah Chen", "Engineer", {"status": "Resigned", "authored": "SOP-012"})
        self.add_node("InfluxDB_Cluster_01", "System", {"type": "Telemetry Database", "status": "Unmonitored"})
        self.add_node("Dehradun_Plot_120SQM", "Property", {"size_sqm": 120})
        self.add_node("SOP-STR-045", "Policy", {"min_threshold_sqm": 250})
        self.add_node("Jonathan Smith", "Architect", {"alias": "JS"})

        # Temporal Edges
        self.add_edge("David Miller", "Marcus Sterling", "REPORTS_TO", valid_from="2020", valid_to="2022")
        self.add_edge("David Miller", "Sarah Jenkins", "REPORTS_TO", valid_from="2023", valid_to="2026")
        self.add_edge("Sarah Jenkins", "Compliance & Legal", "CHIEF_OFFICER_OF")
        self.add_edge("Elena Rostova", "Dehradun_Plot_120SQM", "APPROVED_ACQUISITION")
        self.add_edge("Dehradun_Plot_120SQM", "SOP-STR-045", "CONTRADICTS", properties={"reason": "120sqm plot violates 250sqm threshold"})
        self.add_edge("Sarah Chen", "SOP-012", "AUTHORED")
        self.add_edge("InfluxDB_Cluster_01", "Datadog_Agent", "UNMONITORED", properties={"reason": "Sarah Chen departed without owner transfer"})
        self.add_edge("JS", "Jonathan Smith", "ALIAS_OF")
