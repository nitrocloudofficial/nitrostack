import networkx as nx
import random
import math
import uuid

def generate_city():
    # 1. Generate topology (Hybrid: Grid + small-world feel)
    G = nx.grid_2d_graph(20, 25) # 500 intersections, ~950 edges
    G = nx.convert_node_labels_to_integers(G)
    
    # Add random shortcuts (small world)
    for _ in range(50):
        u, v = random.sample(list(G.nodes()), 2)
        if not G.has_edge(u, v):
            G.add_edge(u, v)

    nodes = {}
    edges = []
    
    # Assign coordinates (assuming center is 0,0 for mapping later)
    # Map grid roughly to lat/lon in a fictional space
    grid_width = 20
    center_lon, center_lat = 77.2090, 28.6139 # e.g. New Delhi base
    
    for i, n in enumerate(G.nodes()):
        grid_x = i % grid_width
        grid_y = i // grid_width
        
        lon = center_lon + (grid_x - 10) * 0.008 + random.uniform(-0.002, 0.002)
        lat = center_lat + (grid_y - 12) * 0.008 + random.uniform(-0.002, 0.002)
        
        elevation = random.uniform(200, 250)
        
        is_hospital = random.random() < 0.05
        is_shelter = random.random() < 0.05
        
        nodes[n] = {
            "id": n,
            "lon": lon,
            "lat": lat,
            "elevation": elevation,
            "is_hospital": is_hospital,
            "is_shelter": is_shelter
        }

    for u, v in G.edges():
        dist = math.hypot(nodes[u]["lon"] - nodes[v]["lon"], nodes[u]["lat"] - nodes[v]["lat"])
        length = dist * 111000 # meters approx
        
        is_bridge = random.random() < 0.05
        road_id = str(uuid.uuid4())
        
        edge_data = {
            "id": road_id,
            "source": u,
            "target": v,
            "name": f"Road {random.randint(1, 9999)}",
            "length": length,
            "width": random.choice([2, 4, 6]),
            "surface": random.choice(["asphalt", "concrete", "gravel"]),
            "construction_year": random.randint(1990, 2023),
            "traffic_capacity": random.randint(500, 5000),
            "average_traffic": random.randint(100, 4500),
            "maintenance_cost": random.uniform(50000, 200000),
            "upgrade_cost": random.uniform(500000, 5000000),
            "repair_cost": random.uniform(200000, 1000000),
            "is_bridge": is_bridge,
            "flood_risk": random.uniform(0, 1),
            "earthquake_risk": random.uniform(0, 1),
            "landslide_risk": random.uniform(0, 1) if elevation > 230 else 0.0,
            "population_served": random.randint(1000, 50000)
        }
        edge_data["road_age"] = 2024 - edge_data["construction_year"]
        edge_data["failure_probability"] = 0.0
        edge_data["criticality"] = 0.0
        edge_data["rci"] = 100.0
        edges.append(edge_data)

    return {"nodes": nodes, "edges": edges}
