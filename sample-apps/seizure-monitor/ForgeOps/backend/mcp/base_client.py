"""
MCP HTTP Client — Base client for all forgeops-mcp HTTP endpoints.
Caches responses for the golden-path demo to ensure deterministic results.
"""

import json
import urllib.request
import urllib.error
from typing import Any, Dict, Optional

MCP_BASE_URL = "http://127.0.0.1:8787"

# In-memory cache for deterministic demo responses
_cache: Dict[str, Any] = {}


def _get(path: str, cache_key: str = None) -> Dict[str, Any]:
    key = cache_key or path
    if key in _cache:
        return _cache[key]
    try:
        req = urllib.request.Request(f"{MCP_BASE_URL}{path}", headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            _cache[key] = data
            return data
    except Exception:
        # Return fallback stub if MCP server is not running
        return _get_fallback(path)


def _post(path: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    try:
        body = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            f"{MCP_BASE_URL}{path}",
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception:
        return _get_fallback(path)


def _get_fallback(path: str) -> Dict[str, Any]:
    """Fallback stubs when forgeops-mcp server is not running."""
    stubs: Dict[str, Any] = {
        "/api/incident": {
            "incident_id": "INC-2407-001",
            "batch_id": "B-2407-184",
            "plant": "Plant Alpha - Detroit",
            "line": "Assembly Line 3",
            "severity": "high",
            "yield_baseline_pct": 96.0,
            "yield_actual_pct": 82.0,
            "status": "REJECTED",
        },
        "/api/timeline": [
            {"event_id": "evt_2291", "timestamp": "08:31", "type": "HUMIDITY_ELEVATED", "severity": "warning", "source": "iot"},
            {"event_id": "evt_2292", "timestamp": "08:38", "type": "QUEUE_DELAY_SPIKE", "severity": "critical", "source": "mes"},
            {"event_id": "evt_2293", "timestamp": "08:42", "type": "MAINTENANCE_ALERT", "severity": "critical", "source": "maintenance"},
            {"event_id": "evt_2294", "timestamp": "08:47", "type": "DEFECTS_DETECTED", "severity": "critical", "source": "quality"},
            {"event_id": "evt_2295", "timestamp": "08:49", "type": "BATCH_REJECTED", "severity": "critical", "source": "mes"},
        ],
        "/api/graph": {
            "nodes": [
                {"id": "humidity", "label": "Humidity", "influence": 0.94, "confidence": 0.91},
                {"id": "queue_delay", "label": "Queue Delay", "influence": 0.91, "confidence": 0.95},
                {"id": "machine_7", "label": "Machine 7", "influence": 0.42, "confidence": 0.61},
                {"id": "quality_failure", "label": "Quality Failure", "influence": 1.0, "confidence": 0.97},
            ],
            "edges": [
                {"from": "humidity", "to": "queue_delay", "strength": 0.7},
                {"from": "queue_delay", "to": "quality_failure", "strength": 0.91},
                {"from": "machine_7", "to": "quality_failure", "strength": 0.42},
            ],
        },
        "/api/recommendations": [
            {"rank": 1, "action": "Reduce queue delay", "confidence": 0.96, "yield_pct": 96, "cost": "Low"},
            {"rank": 2, "action": "Install humidity control", "confidence": 0.94, "yield_pct": 97, "cost": "High"},
            {"rank": 3, "action": "Replace Machine 7", "confidence": 0.61, "yield_pct": 84, "cost": "High"},
        ],
        "/api/business-impact": {
            "monthly_loss_exposure_inr": 1800000,
            "monthly_loss_avoided_inr": 1500000,
            "downtime_reduction_pct": 41,
            "yield_improvement_pct": 14,
        },
        "/api/simulate": {
            "scenario_id": "sim_fallback",
            "baseline_yield": 0.82,
            "predicted_yield": 0.96,
            "yield_delta_pct": 14.0,
            "confidence": 0.96,
            "in_validated_range": True,
            "warnings": [],
        },
    }
    return stubs.get(path, {"error": f"No stub for {path}"})


def get_incident() -> Dict[str, Any]:
    return _get("/api/incident")


def get_timeline(source_filter: Optional[str] = None) -> list:
    events = _get("/api/timeline")
    if source_filter and isinstance(events, list):
        events = [e for e in events if e.get("source") == source_filter]
    return events


def get_causal_graph() -> Dict[str, Any]:
    return _get("/api/graph")


def get_recommendations() -> list:
    data = _get("/api/recommendations")
    return data if isinstance(data, list) else data.get("recommendations", [])


def get_business_impact() -> Dict[str, Any]:
    return _get("/api/business-impact")


def run_simulation(inputs: Dict[str, Any], scenario_name: str = "Custom", constraints: Dict[str, Any] = None) -> Dict[str, Any]:
    payload = {"name": scenario_name, "inputs": inputs, "constraints": constraints or {}}
    return _post("/api/simulate", payload)
