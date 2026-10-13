import networkx as nx
from typing import List, Dict, Any, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

from nitro.agents.research.models import ResearchPackage, Paper
from .models import (
    Node, Edge, Graph, Cluster, TimelineEvent,
    SimilarityPair, CorrelationPackage
)
from .extractor import EntityExtractor

class CorrelationEngine:
    def __init__(self):
        self.extractor = EntityExtractor()

    def process(self, package: ResearchPackage) -> CorrelationPackage:
        papers = package.papers
        
        # 1. Extract Entities
        entities = self.extractor.extract_entities(papers)
        
        # 2. Build Master Knowledge Graph
        kg, nx_graph = self._build_knowledge_graph(papers, entities)
        
        # 3. Detect Clusters (Topics)
        clusters = self._detect_clusters(papers)
        
        # 4. Build Timeline
        timeline = self._build_timeline(papers, entities)
        
        # 5. Compute Similarity Matrix
        sim_matrix = self._compute_similarity(papers)
        
        # 6. Build Subgraphs
        author_graph = self._extract_subgraph(kg, ["Author"])
        inst_graph = self._extract_subgraph(kg, ["Institution"])
        method_graph = self._extract_subgraph(kg, ["Method"])
        dataset_graph = self._extract_subgraph(kg, ["Dataset"])
        topic_graph = self._extract_subgraph(kg, ["Concept"])
        
        return CorrelationPackage(
            knowledge_graph=kg,
            clusters=clusters,
            timeline=timeline,
            similarity_matrix=sim_matrix,
            author_graph=author_graph,
            institution_graph=inst_graph,
            method_graph=method_graph,
            dataset_graph=dataset_graph,
            topic_graph=topic_graph
        )

    def _build_knowledge_graph(self, papers: List[Paper], entities: Dict[str, Dict[str, List[str]]]) -> Tuple[Graph, nx.Graph]:
        nodes: Dict[str, Node] = {}
        edges: List[Edge] = []
        nx_graph = nx.Graph()
        
        def add_node(nid: str, label: str, ntype: str, attrs: dict = None):
            if nid not in nodes:
                nodes[nid] = Node(id=nid, label=label, type=ntype, attributes=attrs or {})
                nx_graph.add_node(nid, type=ntype, label=label)
                
        def add_edge(src: str, tgt: str, rel: str, weight: float = 1.0):
            if src in nodes and tgt in nodes:
                edges.append(Edge(source=src, target=tgt, relation=rel, weight=weight))
                nx_graph.add_edge(src, tgt, relation=rel, weight=weight)
                
        for p in papers:
            pid = p.id or p.doi or p.title
            # Add Paper Node
            add_node(pid, p.title, "Paper", {"year": p.publication_year, "citations": p.citation_count})
            
            # Authors & Institutions
            for author in p.authors:
                aid = f"author:{author.lower()}"
                add_node(aid, author, "Author")
                add_edge(aid, pid, "written_by")
                
            for inst in p.affiliations:
                iid = f"inst:{inst.lower()}"
                add_node(iid, inst, "Institution")
                # Connect institution to paper
                add_edge(iid, pid, "published_in")
                
            # Entities
            paper_ents = entities.get(pid, {})
            for concept in paper_ents.get("concepts", []):
                cid = f"concept:{concept.lower()}"
                add_node(cid, concept, "Concept")
                add_edge(pid, cid, "related_to")
                
            for method in paper_ents.get("methods", []):
                mid = f"method:{method.lower()}"
                add_node(mid, method, "Method")
                add_edge(pid, mid, "uses_method")
                
            for dataset in paper_ents.get("datasets", []):
                did = f"dataset:{dataset.lower()}"
                add_node(did, dataset, "Dataset")
                add_edge(pid, did, "uses_dataset")
                
        # Connect Authors that co-authored
        for p in papers:
            for i in range(len(p.authors)):
                for j in range(i + 1, len(p.authors)):
                    a1 = f"author:{p.authors[i].lower()}"
                    a2 = f"author:{p.authors[j].lower()}"
                    if nx_graph.has_edge(a1, a2):
                        nx_graph[a1][a2]['weight'] += 1.0
                    else:
                        add_edge(a1, a2, "co_authored", 1.0)
                        
        kg = Graph(nodes=list(nodes.values()), edges=edges)
        return kg, nx_graph

    def _detect_clusters(self, papers: List[Paper]) -> List[Cluster]:
        from sklearn.cluster import KMeans
        clusters = []
        corpus = [f"{p.title} {p.abstract if p.abstract else ''}" for p in papers]
        paper_ids = [p.id or p.doi or p.title for p in papers]
        
        if len(corpus) >= 5:
            try:
                vectorizer = TfidfVectorizer(stop_words='english', max_features=1000)
                X = vectorizer.fit_transform(corpus)
                num_clusters = min(5, len(corpus) // 2)
                kmeans = KMeans(n_clusters=num_clusters, random_state=42, n_init='auto')
                labels = kmeans.fit_predict(X)
                
                clustered_papers = {i: [] for i in range(num_clusters)}
                for pid, label in zip(paper_ids, labels):
                    clustered_papers[label].append(pid)
                    
                for i, c_pids in clustered_papers.items():
                    if c_pids:
                        clusters.append(Cluster(
                            id=f"cluster_{i}",
                            name=f"Research Subfield {i+1}",
                            node_ids=c_pids
                        ))
            except Exception:
                pass
        return clusters

    def _build_timeline(self, papers: List[Paper], entities: Dict[str, Dict[str, List[str]]]) -> List[TimelineEvent]:
        events_by_year = {}
        for p in papers:
            if not p.publication_year:
                continue
            year = p.publication_year
            pid = p.id or p.doi or p.title
            
            if year not in events_by_year:
                events_by_year[year] = {"papers": [], "methods": set(), "datasets": set()}
                
            events_by_year[year]["papers"].append(pid)
            
            p_ents = entities.get(pid, {})
            events_by_year[year]["methods"].update(p_ents.get("methods", []))
            events_by_year[year]["datasets"].update(p_ents.get("datasets", []))
            
        timeline = []
        for year in sorted(events_by_year.keys()):
            data = events_by_year[year]
            desc = f"Published {len(data['papers'])} papers."
            if data["methods"]:
                desc += f" Introduced methods: {', '.join(list(data['methods'])[:3])}."
            if data["datasets"]:
                desc += f" Datasets: {', '.join(list(data['datasets'])[:3])}."
                
            timeline.append(TimelineEvent(
                year=year,
                event_type="Publication Milestone",
                description=desc,
                node_ids=data["papers"]
            ))
            
        return timeline

    def _compute_similarity(self, papers: List[Paper]) -> List[SimilarityPair]:
        corpus = [f"{p.title} {p.abstract if p.abstract else ''}" for p in papers]
        paper_ids = [p.id or p.doi or p.title for p in papers]
        
        sim_pairs = []
        if len(corpus) > 1:
            try:
                vectorizer = TfidfVectorizer(stop_words='english')
                tfidf_matrix = vectorizer.fit_transform(corpus)
                cos_sim = cosine_similarity(tfidf_matrix)
                
                # Extract top pairs
                n = len(paper_ids)
                for i in range(n):
                    for j in range(i+1, n):
                        score = cos_sim[i][j]
                        if score > 0.3:  # Threshold to prevent matrix explosion
                            sim_pairs.append(SimilarityPair(
                                source=paper_ids[i],
                                target=paper_ids[j],
                                score=float(score)
                            ))
            except ValueError:
                pass
                
        # Sort by score descending
        return sorted(sim_pairs, key=lambda x: x.score, reverse=True)

    def _extract_subgraph(self, kg: Graph, node_types: List[str]) -> Graph:
        sub_nodes = [n for n in kg.nodes if n.type in node_types]
        sub_ids = {n.id for n in sub_nodes}
        sub_edges = [e for e in kg.edges if e.source in sub_ids and e.target in sub_ids]
        return Graph(nodes=sub_nodes, edges=sub_edges)
