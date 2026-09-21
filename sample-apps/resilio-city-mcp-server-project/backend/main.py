from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from engine.generator import generate_city
from engine.cities import CITY_CONFIGS, generate_city_from_config, get_city_summary
from engine.hazard import apply_hazard
from engine.graph_intelligence import analyze_network
from engine.simulation import run_simulation, get_predictions, validate_simulation
from engine.optimization import optimize_budget

app = FastAPI(title="RESILIO CITY API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Global state ─────────────────────────────────────────────────────────────
city_data = {"nodes": {}, "edges": [], "city_id": None, "city_name": None}


# ─── Request Models ───────────────────────────────────────────────────────────
class OptimizeRequest(BaseModel):
    budget: float
    hazard: str

class DisasterRequest(BaseModel):
    hazard: str
    intensity: float


# ─── Cities API ───────────────────────────────────────────────────────────────
@app.get("/cities")
def list_cities():
    """Return summary cards for all pre-defined cities (for landing page)."""
    return [get_city_summary(cid) for cid in CITY_CONFIGS]


@app.get("/cities/{city_id}/load")
def load_city(city_id: str):
    """Generate + store a city by ID."""
    global city_data
    if city_id not in CITY_CONFIGS:
        raise HTTPException(status_code=404, detail=f"City '{city_id}' not found.")
    city_data = generate_city_from_config(city_id)
    city_data["edges"] = analyze_network(city_data["nodes"], city_data["edges"])
    return {
        "message": f"City '{city_data['city_name']}' loaded.",
        "nodes": len(city_data["nodes"]),
        "roads": len(city_data["edges"]),
        "city_id": city_id,
        "city_name": city_data["city_name"],
    }


# ─── City GeoJSON ─────────────────────────────────────────────────────────────
@app.get("/city")
def get_geojson():
    global city_data
    if not city_data["edges"]:
        raise HTTPException(status_code=400, detail="No city loaded yet.")
    features = []
    for edge in city_data["edges"]:
        u = city_data["nodes"][edge["source"]]
        v = city_data["nodes"][edge["target"]]
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": [[u["lon"], u["lat"]], [v["lon"], v["lat"]]]
            },
            "properties": edge,
        })
    return {"type": "FeatureCollection", "features": features}


@app.get("/city/analysis")
def get_analysis():
    global city_data
    if not city_data["edges"]:
        raise HTTPException(status_code=400, detail="No city loaded yet.")
    avg_rci = sum(e["rci"] for e in city_data["edges"]) / len(city_data["edges"])
    avg_crit = sum(e["criticality"] for e in city_data["edges"]) / len(city_data["edges"])
    critical = sum(1 for e in city_data["edges"] if e["failure_probability"] > 0.7)
    return {
        "average_rci": avg_rci,
        "average_criticality": avg_crit,
        "total_roads": len(city_data["edges"]),
        "critical_roads": critical,
        "city_id": city_data.get("city_id"),
        "city_name": city_data.get("city_name"),
    }


@app.get("/city/road/{road_id}")
def get_road_detail(road_id: str):
    """Return detailed info for a single road (for 3D simulation panel)."""
    global city_data
    for edge in city_data["edges"]:
        if edge["id"] == road_id:
            return edge
    raise HTTPException(status_code=404, detail="Road not found.")


# ─── Disaster Simulation ──────────────────────────────────────────────────────
@app.post("/city/disaster")
def run_disaster(req: DisasterRequest):
    global city_data
    if not city_data["edges"]:
        raise HTTPException(status_code=400, detail="No city loaded yet.")
    city_data["edges"] = apply_hazard(city_data["edges"], req.hazard, req.intensity)
    city_data["edges"] = analyze_network(city_data["nodes"], city_data["edges"])
    sim = run_simulation(city_data["nodes"], city_data["edges"], req.intensity)
    return sim


@app.post("/city/optimize")
def optimize(req: OptimizeRequest):
    global city_data
    if not city_data["edges"]:
        raise HTTPException(status_code=400, detail="No city loaded yet.")
    return optimize_budget(city_data["edges"], req.budget)


@app.get("/city/prediction")
def get_prediction():
    global city_data
    return get_predictions(city_data["edges"])


@app.get("/city/validation")
def get_validation():
    global city_data
    predicted = [e["road_id"] for e in get_predictions(city_data["edges"])]
    actual = [e["id"] for e in city_data["edges"] if e["failure_probability"] > 0.6]
    return validate_simulation(predicted, actual)


# ─── Legacy endpoint ──────────────────────────────────────────────────────────
@app.get("/city/generate")
def generate_legacy():
    """Legacy: generate random city (kept for compatibility)."""
    global city_data
    city_data = generate_city()
    city_data["edges"] = analyze_network(city_data["nodes"], city_data["edges"])
    return {"message": f"City generated with {len(city_data['nodes'])} nodes."}
