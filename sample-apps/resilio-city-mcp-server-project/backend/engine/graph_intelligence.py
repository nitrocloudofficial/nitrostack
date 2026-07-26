import networkx as nx

def analyze_network(nodes, edges):
    G = nx.Graph()
    for edge in edges:
        G.add_edge(edge["source"], edge["target"], weight=edge["length"], id=edge["id"])
    
    # Edge Betweenness Centrality
    edge_betweenness = nx.edge_betweenness_centrality(G, weight="weight", normalized=True)
    
    max_betweenness = max(edge_betweenness.values()) if edge_betweenness else 1.0
    if max_betweenness == 0: max_betweenness = 1.0
    
    for edge in edges:
        u = edge["source"]
        v = edge["target"]
        
        e_betw = edge_betweenness.get((u, v), edge_betweenness.get((v, u), 0))
        criticality = (e_betw / max_betweenness) * 100.0
        edge["criticality"] = criticality
        
        # Road Condition Index (RCI)
        surface_score = 100 if edge["surface"] == "concrete" else (80 if edge["surface"] == "asphalt" else 50)
        redundancy = 100 - criticality # High criticality means low redundancy
        hazard_vuln = edge["failure_probability"] * 100
        traffic_stress = min((edge["average_traffic"] / max(1, edge["traffic_capacity"])) * 100, 100)
        age_score = max(100 - edge["road_age"] * 2, 0)
        
        rci = (surface_score * 0.2) + (redundancy * 0.2) + ((100 - hazard_vuln) * 0.3) + ((100 - traffic_stress) * 0.1) + (age_score * 0.2)
        edge["rci"] = max(min(rci, 100.0), 0.0)
        
    return edges
