def apply_hazard(edges, hazard_type, intensity):
    # intensity 0.0 to 1.0
    for edge in edges:
        prob = 0.0
        if hazard_type == "Flood":
            prob = edge["flood_risk"] * intensity
            if edge["is_bridge"]: prob -= 0.2
        elif hazard_type == "Earthquake":
            prob = edge["earthquake_risk"] * intensity
            if edge["is_bridge"]: prob += 0.4
        elif hazard_type == "Cyclone":
            prob = intensity * 0.5
        elif hazard_type == "Heatwave":
            if edge["surface"] == "asphalt": prob += 0.3 * intensity
        elif hazard_type == "Landslide":
            prob = edge["landslide_risk"] * intensity
            
        # Age modifier
        prob += (edge["road_age"] / 100.0)
        
        edge["failure_probability"] = min(max(prob, 0.0), 1.0)
        
    return edges
