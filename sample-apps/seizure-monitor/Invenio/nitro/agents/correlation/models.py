from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class Node(BaseModel):
    id: str
    label: str
    type: str  # e.g., 'Paper', 'Author', 'Institution', 'Method', 'Dataset', 'Concept'
    attributes: Dict[str, Any] = Field(default_factory=dict)

class Edge(BaseModel):
    source: str
    target: str
    relation: str  # e.g., 'written_by', 'cites', 'uses_method', 'similar_to'
    weight: float = 1.0

class Graph(BaseModel):
    nodes: List[Node] = Field(default_factory=list)
    edges: List[Edge] = Field(default_factory=list)

class Cluster(BaseModel):
    id: str
    name: str
    node_ids: List[str]

class TimelineEvent(BaseModel):
    year: int
    event_type: str
    description: str
    node_ids: List[str]

class SimilarityPair(BaseModel):
    source: str
    target: str
    score: float

class CorrelationPackage(BaseModel):
    knowledge_graph: Graph
    clusters: List[Cluster]
    timeline: List[TimelineEvent]
    similarity_matrix: List[SimilarityPair]
    author_graph: Graph
    institution_graph: Graph
    method_graph: Graph
    dataset_graph: Graph
    topic_graph: Graph
