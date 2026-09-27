import random
import math
import uuid
import networkx as nx

# ─── CITY DEFINITIONS ──────────────────────────────────────────────────────────
CITY_CONFIGS = {
    "nova_delhi": {
        "id": "nova_delhi",
        "name": "Nova Delhi",
        "subtitle": "National Capital Grid",
        "center": (77.2090, 28.6139),
        "emoji": "🏛️",
        "theme": "#4fc3f7",
        "h_roads": [
            "Rajpath Avenue", "India Gate Boulevard", "Parliament Street",
            "Janpath Corridor", "Connaught Place Ring Road", "Lodhi Road",
            "Mathura Road", "Ring Road Corridor", "NH-48 Service Road",
            "Tughlaqabad Expressway", "Mehrauli Road", "Safdarjung Road",
            "AIIMS Flyover", "RK Puram Avenue", "Moti Bagh Road",
            "Outer Ring Road North", "Outer Ring Road South", "Bhairon Marg",
            "Pandara Road", "Prithviraj Road",
        ],
        "v_roads": [
            "Dhaula Kuan Expressway", "ITO Flyover", "Chandni Chowk Bypass",
            "Sanjay Gandhi Road", "Pusa Road", "Karol Bagh Corridor",
            "Lajpat Nagar Link", "Rohini Link Road", "Pitampura Avenue",
            "Mayur Vihar Expressway", "Akbar Road", "Curzon Road",
            "Aurangzeb Road", "Tilak Marg", "Bahadur Shah Zafar Marg",
            "Mahadev Road", "Motilal Nehru Road", "Ashoka Road",
            "Rafi Marg", "Sardar Patel Marg",
        ],
    },
    "cyber_bangalore": {
        "id": "cyber_bangalore",
        "name": "Cyber Bangalore",
        "subtitle": "Silicon Valley of India",
        "center": (77.5946, 12.9716),
        "emoji": "🖥️",
        "theme": "#69f0ae",
        "h_roads": [
            "MG Road", "Brigade Road Connector", "Indiranagar 100-Ft Road",
            "Koramangala 80-Ft Road", "HSR Layout Avenue", "Silk Board Junction Rd",
            "Bannerghatta Road", "Hosur Road Corridor", "Sarjapur Road",
            "Tumkur Road", "Mysore Road Expressway", "Hesaraghatta Road",
            "Kengeri Ring Road", "JP Nagar 6th Phase", "Jayanagar 4th Block",
            "Basavangudi Main Road", "Richmond Road", "Vittal Mallya Road",
            "Residency Road", "Airport Road Phase-2",
        ],
        "v_roads": [
            "Electronic City Flyover Phase-1", "ORR KR Puram–Tin Factory",
            "Whitefield Main Road", "Old Airport Road", "Bellary Road",
            "Hebbal Flyover", "Marathahalli Bridge Road", "Outer Ring Road East",
            "Domlur Link Road", "Ulsoor Lake Road", "Rajajinagar Main Road",
            "Kammanahalli Main Road", "Ramamurthy Nagar Road", "KR Puram Bridge",
            "Varthur Road", "Samethanahalli Link", "Nandini Layout Road",
            "Peenya Industrial Link", "Nagawara Ring Road", "Yeshwantpur Main Rd",
        ],
    },
    "coastal_mumbai": {
        "id": "coastal_mumbai",
        "name": "Coastal Mumbai",
        "subtitle": "Financial Capital Hub",
        "center": (72.8777, 19.0760),
        "emoji": "🌊",
        "theme": "#f48fb1",
        "h_roads": [
            "Marine Drive Expressway", "Pedder Road", "Senapati Bapat Marg",
            "S.V. Road", "Linking Road Bandra", "Juhu Beach Road",
            "Mahim Causeway", "Sion–Panvel Expressway", "LBS Marg",
            "Eastern Freeway", "Ghodbunder Road", "Aarey Road",
            "Malabar Hill Drive", "Carter Road Promenade", "Tardeo Road",
            "Kemp's Corner Road", "Altamount Road", "Bhulabhai Desai Road",
            "Breach Candy Road", "Napean Sea Road",
        ],
        "v_roads": [
            "Bandra-Worli Sea Link", "Western Express Highway", "NH-48 Mumbai Section",
            "Jogeshwari-Vikhroli Link", "Santacruz-Chembur Link", "Cotton Green Road",
            "Reay Road", "Dockyard Road", "Masjid Bunder Road", "Carnac Road",
            "Hindmata Junction Rd", "Dadar TT Circle Road", "Dharavi Link",
            "Kurla Causeway", "Govandi Station Road", "Mankhurd Link",
            "Tilaknagar Road", "Ghatkopar Station Road", "Mulund Check Naka",
            "Thane Creek Bridge Road",
        ],
    },
    "heritage_jaipur": {
        "id": "heritage_jaipur",
        "name": "Heritage Jaipur",
        "subtitle": "Pink City Network",
        "center": (75.7873, 26.9124),
        "emoji": "🏰",
        "theme": "#ffb74d",
        "h_roads": [
            "Amber Fort Road", "MI Road", "Civil Lines Avenue",
            "JLN Marg", "Gopalpura Bypass", "Tonk Road",
            "Durgapura Road", "Malviya Nagar Road", "C-Scheme Avenue",
            "Vaishali Nagar Road", "200-Feet Bypass", "Jagatpura Link Road",
            "Nirman Nagar Boulevard", "Kalwar Road", "Ajmer Road Corridor",
            "Sikar Road", "New Sanganer Road", "Station Road",
            "Mansarovar Link Road", "Sanganer Airport Road",
        ],
        "v_roads": [
            "Nahargarh Fort Road", "Amer Road Extension", "Delhi Road Bypass",
            "Agra Road Connector", "Malpura Road", "Bassi Link Road",
            "Chomu Road", "Shahpura Bypass", "Bagru Industrial Link",
            "Kishangarh Road", "Phulera Junction Road", "Renwal Link",
            "Sambhar Road", "Jobner Road", "Chaksu Main Road",
            "Mahal Road", "Ramgarh Road", "Achrol Link Road",
            "Govindgarh Road", "Kotputli Highway",
        ],
    },
    "techno_hyderabad": {
        "id": "techno_hyderabad",
        "name": "Techno Hyderabad",
        "subtitle": "City of Pearls Grid",
        "center": (78.4867, 17.3850),
        "emoji": "💎",
        "theme": "#ce93d8",
        "h_roads": [
            "HITEC City Road", "Jubilee Hills Road No.36", "Banjara Hills Avenue",
            "Madhapur 100-Ft Road", "Financial District Road", "Kokapet Bypass",
            "Raidurg-Nanakramguda Link", "Gachibowli Main Road", "Kondapur Road",
            "Manikonda Road", "Tolichowki Road", "Mehdipatnam Road",
            "Malakpet Road", "Koti Road", "Abids Main Road",
            "Nampally Station Road", "Basheerbagh Road", "Himayatnagar Ave",
            "Begumpet Main Road", "Secunderabad Main Road",
        ],
        "v_roads": [
            "ORR Gachibowli Section", "Golconda Fort Approach", "Secretariat Road",
            "Begumpet Airport Road", "Kukatpally Main Road", "LB Nagar Expressway",
            "Warangal Highway", "Vijayawada Highway", "Nehru ORR",
            "Shamshabad Airport Road", "Shilparamam Road", "Patancheru Road",
            "Kompally Link Road", "Medchal Highway", "Ghatkesar Road",
            "Pocharam IT Road", "Uppal Link Road", "Hayathnagar Bypass",
            "Abdullapurmet Road", "Pedda Amberpet Link",
        ],
    },
}


def generate_city_from_config(city_id: str) -> dict:
    cfg = CITY_CONFIGS[city_id]
    center_lon, center_lat = cfg["center"]
    h_names = cfg["h_roads"]
    v_names = cfg["v_roads"]

    COLS, ROWS = 20, 25

    # Build grid graph
    G = nx.grid_2d_graph(COLS, ROWS)
    G = nx.convert_node_labels_to_integers(G)

    # Add shortcuts for small-world effect
    for _ in range(60):
        u, v = random.sample(list(G.nodes()), 2)
        if not G.has_edge(u, v):
            G.add_edge(u, v)

    nodes = {}
    for i, n in enumerate(G.nodes()):
        gx = i % COLS
        gy = i // COLS
        lon = center_lon + (gx - 10) * 0.008 + random.uniform(-0.002, 0.002)
        lat = center_lat + (gy - 12) * 0.008 + random.uniform(-0.002, 0.002)
        elev = 200 + gy * 2 + random.uniform(-10, 20)
        nodes[n] = {
            "id": n, "lon": lon, "lat": lat, "elevation": elev,
            "is_hospital": random.random() < 0.04,
            "is_shelter": random.random() < 0.04,
        }

    edges = []
    edge_idx = 0
    for u, v in G.edges():
        n_u = nodes[u]
        n_v = nodes[v]
        dist = math.hypot(n_u["lon"] - n_v["lon"], n_u["lat"] - n_v["lat"])
        length_m = dist * 111000

        # Decide horizontal or vertical for naming
        dx = abs(n_u["lon"] - n_v["lon"])
        dy = abs(n_u["lat"] - n_v["lat"])
        if dx >= dy:
            row = (u // COLS)
            name = h_names[row % len(h_names)]
        else:
            col = (u % COLS)
            name = v_names[col % len(v_names)]

        # Add lane/section suffix for uniqueness
        segment_no = (edge_idx % 9) + 1
        address = f"{name} — Segment {segment_no}"

        is_bridge = random.random() < 0.06
        surface = random.choices(
            ["asphalt", "concrete", "gravel"],
            weights=[0.55, 0.35, 0.10]
        )[0]
        yr = random.randint(1990, 2023)

        ed = {
            "id": str(uuid.uuid4()),
            "source": u, "target": v,
            "name": address,
            "road_name": name,
            "segment_no": segment_no,
            "city_id": city_id,
            "length": length_m,
            "width": random.choice([6, 8, 12, 16]),
            "lanes": random.choice([2, 4, 6]),
            "surface": surface,
            "construction_year": yr,
            "road_age": 2024 - yr,
            "traffic_capacity": random.randint(1000, 8000),
            "average_traffic": random.randint(200, 7500),
            "maintenance_cost": random.uniform(50000, 300000),
            "upgrade_cost": random.uniform(500000, 8000000),
            "repair_cost": random.uniform(200000, 2000000),
            "is_bridge": is_bridge,
            "flood_risk": random.uniform(0, 1),
            "earthquake_risk": random.uniform(0, 1),
            "landslide_risk": random.uniform(0, 1) if n_u["elevation"] > 220 else 0.0,
            "population_served": random.randint(2000, 80000),
            "failure_probability": 0.0,
            "criticality": 0.0,
            "rci": 100.0,
            # 3D simulation data
            "pavement_layers": {
                "wearing_course_cm": round(random.uniform(3, 7), 1),
                "binder_course_cm": round(random.uniform(5, 12), 1),
                "base_course_cm": round(random.uniform(15, 30), 1),
                "subbase_cm": round(random.uniform(25, 50), 1),
                "subgrade_cm": 80,
            },
            "damage_type": random.choice([
                "none", "cracking", "pothole", "rutting",
                "edge_break", "water_intrusion", "subsidence"
            ]),
        }
        edges.append(ed)
        edge_idx += 1

    return {"nodes": nodes, "edges": edges, "city_id": city_id, "city_name": cfg["name"]}


def get_city_summary(city_id: str) -> dict:
    """Return static summary stats for landing page (no full generation)."""
    cfg = CITY_CONFIGS[city_id]
    seed = sum(ord(c) for c in city_id)
    rng = random.Random(seed)
    return {
        "id": city_id,
        "name": cfg["name"],
        "subtitle": cfg["subtitle"],
        "emoji": cfg["emoji"],
        "theme": cfg["theme"],
        "total_roads": rng.randint(950, 1100),
        "avg_rci": round(rng.uniform(52, 88), 1),
        "critical_roads": rng.randint(8, 45),
        "population_covered": rng.randint(800000, 4500000),
        "last_survey": f"2024-0{rng.randint(1,9)}-{rng.randint(10,28)}",
        "pending_repairs": rng.randint(12, 120),
        "budget_utilized_pct": round(rng.uniform(35, 90), 1),
    }
