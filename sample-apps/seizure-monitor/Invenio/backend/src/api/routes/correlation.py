from fastapi import APIRouter
from typing import Optional

router = APIRouter()

@router.get("/graph")
async def get_correlation_graph(
    query: str,
    limit: int = 30
):
    """
    Mock graph endpoint for the demo.
    Returns structurally interesting nodes and edges to demonstrate the D3 force graph.
    """
    return {
        "nodes": [
            {"id": "node_1", "label": query, "group": "concept", "properties": {"degree": 5}},
            {"id": "node_2", "label": "Topological Qubits", "group": "technology", "properties": {"degree": 3}},
            {"id": "node_3", "label": "Surface Codes", "group": "algorithm", "properties": {"degree": 4}},
            {"id": "node_4", "label": "Kitaev Chain", "group": "paper", "properties": {"degree": 2}},
            {"id": "node_5", "label": "Anyon Braiding", "group": "phenomenon", "properties": {"degree": 3}},
        ],
        "edges": [
            {"id": "edge_1", "source": "node_1", "target": "node_2", "weight": 0.9, "type": "relates_to"},
            {"id": "edge_2", "source": "node_2", "target": "node_3", "weight": 0.85, "type": "implements"},
            {"id": "edge_3", "source": "node_3", "target": "node_4", "weight": 0.7, "type": "cited_by"},
            {"id": "edge_4", "source": "node_4", "target": "node_5", "weight": 0.95, "type": "describes"},
            {"id": "edge_5", "source": "node_1", "target": "node_5", "weight": 0.6, "type": "associated_with"},
        ],
        "gaps": [
            {
                "title": f"Lack of scalable translation in {query}",
                "confidence": 0.88,
                "reason": "High concentration of theoretical papers but few engineering implementations."
            }
        ],
        "opportunities": [
            {
                "title": f"Cross-domain application of {query} in Materials Science",
                "summary": "Applying recent surface code algorithms to crystal structure prediction.",
                "potential_applications": ["Material Discovery", "Drug Design"]
            }
        ]
    }
