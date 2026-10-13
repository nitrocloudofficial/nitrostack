"""
HealthBridge Inventory MCP Server
====================================
Dedicated pharmacy and stock management server.

Tools (7):
  1. get_network_stock          — Full stock table across all hospitals
  2. restock_medicine           — Add units to a hospital's stock
  3. transfer_stock             — Move units between hospitals
  4. get_low_stock_alerts       — Medicines below threshold at any hospital
  5. get_replenishment_queue    — All pending replenishment requests
  6. resolve_replenishment      — Mark a replenishment as fulfilled
  7. predict_stock_depletion    — Predict when a medicine will run out

Resources:
  inventory://stock/all
  inventory://stock/{hospitalId}
  inventory://replenishments/pending
  inventory://alerts/low-stock

Run:
  python inventory_server.py          # stdio
  python inventory_server.py --http   # SSE/HTTP on port 8082
"""

import json
import sys
import uuid
from collections import defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path

from mcp.server.fastmcp import FastMCP

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"

# ---------------------------------------------------------------------------
# In-memory stores
# ---------------------------------------------------------------------------

_facility_stock: dict = {}
_replenishment_queue: list = []
_stock_transfer_log: list = []
_dispense_history: list = []  # tracks dispensing events to compute depletion rate


HOSPITAL_NAMES = {
    "HOSP-A": "City General Hospital",
    "HOSP-B": "Sunrise Medical Centre",
    "HOSP-C": "Green Valley Clinic",
    "HOSP-D": "Lakeside Pharmacy & Hospital",
}

LOW_STOCK_THRESHOLD = 20


def _load_data():
    global _facility_stock

    stock_path = DATA_DIR / "facility_stock.json"
    with open(stock_path, encoding="utf-8") as f:
        stock_data = json.load(f)

    for facility in stock_data.get("facilities", []):
        _facility_stock[facility["hospitalId"]] = {
            "hospitalName": facility["hospitalName"],
            "stock": {k.lower(): v for k, v in facility["stock"].items()},
        }


_load_data()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now_iso() -> str:
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"

def _today() -> str:
    return date.today().isoformat()

def _get_stock(hospital_id: str, medicine: str) -> int:
    return _facility_stock.get(hospital_id, {}).get("stock", {}).get(medicine.lower(), 0)


# ---------------------------------------------------------------------------
# FastMCP app
# ---------------------------------------------------------------------------

mcp = FastMCP(
    name="HealthBridge Inventory MCP",
    instructions=(
        "HealthBridge Inventory MCP manages pharmaceutical stock across all 4 hospitals. "
        "Tools: get_network_stock, restock_medicine, transfer_stock, get_low_stock_alerts, "
        "get_replenishment_queue, resolve_replenishment, predict_stock_depletion. "
        "Use this server to answer: 'what is the stock of metformin across all hospitals?', "
        "'restock amoxicillin at HOSP-B', 'transfer 50 units of warfarin from HOSP-A to HOSP-C', "
        "'which medicines are running low?', 'when will atorvastatin run out?'"
    ),
)


# ---------------------------------------------------------------------------
# Resources
# ---------------------------------------------------------------------------

@mcp.resource("inventory://stock/all")
def full_stock_table() -> str:
    result = {}
    for hid, fac in _facility_stock.items():
        result[hid] = {"hospitalName": fac["hospitalName"], "stock": fac["stock"]}
    return json.dumps(result, indent=2)


@mcp.resource("inventory://stock/{hospital_id}")
def hospital_stock(hospital_id: str) -> str:
    fac = _facility_stock.get(hospital_id)
    if not fac:
        return json.dumps({"error": f"Hospital '{hospital_id}' not found."})
    return json.dumps({
        "hospitalId": hospital_id,
        "hospitalName": fac["hospitalName"],
        "stock": fac["stock"],
        "outOfStock": [k for k, v in fac["stock"].items() if v == 0],
        "lowStock": [k for k, v in fac["stock"].items() if 0 < v < LOW_STOCK_THRESHOLD],
    }, indent=2)


@mcp.resource("inventory://replenishments/pending")
def pending_replenishments() -> str:
    pending = [r for r in _replenishment_queue if r["status"] == "pending"]
    return json.dumps({"pendingCount": len(pending), "requests": pending}, indent=2)


@mcp.resource("inventory://alerts/low-stock")
def low_stock_alerts() -> str:
    alerts = []
    for hid, fac in _facility_stock.items():
        for med, qty in fac["stock"].items():
            if qty < LOW_STOCK_THRESHOLD:
                alerts.append({
                    "hospitalId": hid,
                    "hospitalName": fac["hospitalName"],
                    "medicine": med,
                    "currentStock": qty,
                    "threshold": LOW_STOCK_THRESHOLD,
                    "status": "out_of_stock" if qty == 0 else "low",
                })
    return json.dumps({"alertCount": len(alerts), "alerts": sorted(alerts, key=lambda a: a["currentStock"])}, indent=2)


# ---------------------------------------------------------------------------
# Tools
# ---------------------------------------------------------------------------

@mcp.tool(
    name="get_network_stock",
    description=(
        "Get the current stock levels for a specific medicine across ALL hospitals in the network, "
        "or get the complete stock table for a specific hospital. "
        "Answers: 'how much metformin do we have across all hospitals?', "
        "'show me the full stock table for HOSP-A', 'which hospital has the most warfarin?'"
    ),
)
def get_network_stock(
    medicine: str | None = None,
    hospital_id: str | None = None,
) -> dict:
    if hospital_id:
        fac = _facility_stock.get(hospital_id.upper())
        if not fac:
            return {"error": True, "message": f"Hospital '{hospital_id}' not found."}
        stock = fac["stock"]
        if medicine:
            med_key = medicine.lower().strip()
            return {
                "hospitalId": hospital_id.upper(),
                "hospitalName": fac["hospitalName"],
                "medicine": med_key,
                "stock": stock.get(med_key, 0),
            }
        return {
            "hospitalId": hospital_id.upper(),
            "hospitalName": fac["hospitalName"],
            "totalMedicines": len(stock),
            "outOfStockCount": sum(1 for v in stock.values() if v == 0),
            "lowStockCount": sum(1 for v in stock.values() if 0 < v < LOW_STOCK_THRESHOLD),
            "stock": stock,
        }

    if medicine:
        med_key = medicine.lower().strip()
        network_total = 0
        breakdown = []
        for hid, fac in _facility_stock.items():
            qty = fac["stock"].get(med_key, 0)
            network_total += qty
            breakdown.append({
                "hospitalId": hid,
                "hospitalName": fac["hospitalName"],
                "stock": qty,
                "status": "out_of_stock" if qty == 0 else "low" if qty < LOW_STOCK_THRESHOLD else "ok",
            })
        breakdown.sort(key=lambda b: -b["stock"])
        return {
            "medicine": med_key,
            "networkTotal": network_total,
            "bestStockedHospital": breakdown[0] if breakdown else None,
            "breakdown": breakdown,
        }

    # Full network overview
    all_medicines: set = set()
    for fac in _facility_stock.values():
        all_medicines.update(fac["stock"].keys())

    overview = []
    for med in sorted(all_medicines):
        row = {"medicine": med}
        total = 0
        for hid, fac in _facility_stock.items():
            qty = fac["stock"].get(med, 0)
            row[hid] = qty
            total += qty
        row["networkTotal"] = total
        row["status"] = "out_of_stock" if total == 0 else "low" if total < LOW_STOCK_THRESHOLD * 2 else "ok"
        overview.append(row)

    return {
        "hospitals": list(_facility_stock.keys()),
        "totalMedicineTypes": len(all_medicines),
        "networkOverview": overview,
    }


@mcp.tool(
    name="restock_medicine",
    description=(
        "Add units of a medicine to a specific hospital's stock. "
        "Records the restock event in the transfer log. "
        "Answers: 'restock HOSP-B with 200 units of amoxicillin', "
        "'add 500 metformin to City General', 'fulfill the replenishment for warfarin at HOSP-D'."
    ),
)
def restock_medicine(
    hospital_id: str,
    medicine: str,
    quantity: int,
    supplier: str = "Central Pharmacy Depot",
    notes: str = "",
) -> dict:
    hid = hospital_id.upper()
    if hid not in _facility_stock:
        return {"error": True, "message": f"Hospital '{hospital_id}' not found."}
    if not medicine or not medicine.strip():
        return {"error": True, "message": "'medicine' is required."}
    if not isinstance(quantity, int) or quantity <= 0:
        return {"error": True, "message": "'quantity' must be a positive integer."}

    med_key = medicine.lower().strip()
    fac = _facility_stock[hid]
    old_stock = fac["stock"].get(med_key, 0)
    fac["stock"][med_key] = old_stock + quantity

    event = {
        "id": str(uuid.uuid4())[:8],
        "timestamp": _now_iso(),
        "type": "restock",
        "hospitalId": hid,
        "hospitalName": fac["hospitalName"],
        "medicine": med_key,
        "quantity": quantity,
        "stockBefore": old_stock,
        "stockAfter": old_stock + quantity,
        "supplier": supplier,
        "notes": notes,
    }
    _stock_transfer_log.append(event)

    return {
        "success": True,
        "hospitalId": hid,
        "hospitalName": fac["hospitalName"],
        "medicine": med_key,
        "stockBefore": old_stock,
        "stockAfter": old_stock + quantity,
        "unitsAdded": quantity,
        "supplier": supplier,
        "timestamp": event["timestamp"],
    }


@mcp.tool(
    name="transfer_stock",
    description=(
        "Move a quantity of medicine from one hospital to another. "
        "Validates sufficient source stock before transferring. "
        "Records the transfer in the audit log. "
        "Answers: 'transfer 100 units of metformin from HOSP-C to HOSP-B', "
        "'move 50 warfarin from City General to Sunrise Medical'."
    ),
)
def transfer_stock(
    from_hospital_id: str,
    to_hospital_id: str,
    medicine: str,
    quantity: int,
    reason: str = "Stock balancing",
) -> dict:
    from_hid = from_hospital_id.upper()
    to_hid = to_hospital_id.upper()

    if from_hid not in _facility_stock:
        return {"error": True, "message": f"Source hospital '{from_hospital_id}' not found."}
    if to_hid not in _facility_stock:
        return {"error": True, "message": f"Destination hospital '{to_hospital_id}' not found."}
    if from_hid == to_hid:
        return {"error": True, "message": "Source and destination hospitals must be different."}
    if not isinstance(quantity, int) or quantity <= 0:
        return {"error": True, "message": "'quantity' must be a positive integer."}

    med_key = medicine.lower().strip()
    from_fac = _facility_stock[from_hid]
    to_fac = _facility_stock[to_hid]

    from_stock = from_fac["stock"].get(med_key, 0)
    if from_stock < quantity:
        return {
            "error": True,
            "message": f"Insufficient stock at {from_fac['hospitalName']}. Available: {from_stock}, Requested: {quantity}.",
            "availableStock": from_stock,
        }

    from_fac["stock"][med_key] = from_stock - quantity
    to_stock = to_fac["stock"].get(med_key, 0)
    to_fac["stock"][med_key] = to_stock + quantity

    event = {
        "id": str(uuid.uuid4())[:8],
        "timestamp": _now_iso(),
        "type": "transfer",
        "fromHospitalId": from_hid,
        "fromHospitalName": from_fac["hospitalName"],
        "toHospitalId": to_hid,
        "toHospitalName": to_fac["hospitalName"],
        "medicine": med_key,
        "quantity": quantity,
        "reason": reason,
    }
    _stock_transfer_log.append(event)

    return {
        "success": True,
        "medicine": med_key,
        "quantity": quantity,
        "from": {"hospitalId": from_hid, "hospitalName": from_fac["hospitalName"],
                  "stockBefore": from_stock, "stockAfter": from_stock - quantity},
        "to": {"hospitalId": to_hid, "hospitalName": to_fac["hospitalName"],
                "stockBefore": to_stock, "stockAfter": to_stock + quantity},
        "reason": reason,
        "timestamp": event["timestamp"],
    }


@mcp.tool(
    name="get_low_stock_alerts",
    description=(
        "Find all medicines running low or out of stock across the network or at a specific hospital. "
        "Threshold is configurable (default: 20 units). "
        "Answers: 'which medicines are running low?', 'what is out of stock at HOSP-D?', "
        "'alert me if anything is below 50 units'."
    ),
)
def get_low_stock_alerts(
    hospital_id: str | None = None,
    threshold: int = 20,
    include_out_of_stock_only: bool = False,
) -> dict:
    alerts = []
    facilities = {hospital_id.upper(): _facility_stock[hospital_id.upper()]} if hospital_id and hospital_id.upper() in _facility_stock else _facility_stock

    for hid, fac in facilities.items():
        for med, qty in fac["stock"].items():
            if include_out_of_stock_only and qty > 0:
                continue
            if not include_out_of_stock_only and qty >= threshold:
                continue
            alerts.append({
                "hospitalId": hid,
                "hospitalName": fac["hospitalName"],
                "medicine": med,
                "currentStock": qty,
                "threshold": threshold,
                "status": "out_of_stock" if qty == 0 else "critical" if qty < threshold // 2 else "low",
                "unitsNeeded": max(0, threshold - qty),
            })

    alerts.sort(key=lambda a: (a["currentStock"], a["medicine"]))

    return {
        "alertCount": len(alerts),
        "outOfStockCount": sum(1 for a in alerts if a["status"] == "out_of_stock"),
        "criticalCount": sum(1 for a in alerts if a["status"] == "critical"),
        "lowCount": sum(1 for a in alerts if a["status"] == "low"),
        "threshold": threshold,
        "alerts": alerts,
    }


@mcp.tool(
    name="get_replenishment_queue",
    description=(
        "View all pending, fulfilled, and cancelled replenishment requests. "
        "Answers: 'what replenishments are pending?', 'which hospitals have requested restocking?', "
        "'show me fulfilled replenishments this week'."
    ),
)
def get_replenishment_queue(
    status_filter: str = "pending",
    hospital_id: str | None = None,
) -> dict:
    results = list(_replenishment_queue)
    if status_filter != "all":
        results = [r for r in results if r["status"] == status_filter]
    if hospital_id:
        results = [r for r in results if r["hospitalId"].upper() == hospital_id.upper()]

    return {
        "total": len(results),
        "statusFilter": status_filter,
        "requests": sorted(results, key=lambda r: r["requestedAt"], reverse=True),
    }


@mcp.tool(
    name="resolve_replenishment",
    description=(
        "Mark a pending replenishment request as fulfilled. "
        "This automatically calls restock_medicine to add the units to the hospital's stock. "
        "Answers: 'fulfill the replenishment request REQ-XXXXXXXX', 'mark warfarin replenishment as done'."
    ),
)
def resolve_replenishment(
    request_id: str,
    units_delivered: int | None = None,
    notes: str = "",
) -> dict:
    req = next((r for r in _replenishment_queue if r["id"] == request_id), None)
    if not req:
        return {"error": True, "message": f"Replenishment request '{request_id}' not found."}
    if req["status"] != "pending":
        return {"error": True, "message": f"Request '{request_id}' is already {req['status']}."}

    qty = units_delivered or req.get("requestedQuantity", 100)
    hid = req["hospitalId"]
    med = req["medicine"]

    fac = _facility_stock.get(hid, {})
    old_stock = fac.get("stock", {}).get(med, 0)
    if fac.get("stock"):
        fac["stock"][med] = old_stock + qty

    req["status"] = "fulfilled"
    req["fulfilledAt"] = _now_iso()
    req["unitsDelivered"] = qty
    req["notes"] = notes

    return {
        "success": True,
        "requestId": request_id,
        "hospitalId": hid,
        "hospitalName": fac.get("hospitalName", hid),
        "medicine": med,
        "unitsDelivered": qty,
        "stockBefore": old_stock,
        "stockAfter": old_stock + qty,
        "fulfilledAt": req["fulfilledAt"],
    }


@mcp.tool(
    name="predict_stock_depletion",
    description=(
        "Predict when a medicine will run out based on its current stock and average daily usage rate. "
        "Usage rate is estimated from the dispense history or provided manually. "
        "Answers: 'when will metformin run out at HOSP-A?', 'how many days of warfarin stock do we have?', "
        "'which medicines will run out within 30 days?'"
    ),
)
def predict_stock_depletion(
    hospital_id: str | None = None,
    medicine: str | None = None,
    daily_usage_rate: float | None = None,
    alert_threshold_days: int = 30,
) -> dict:
    results = []
    facilities = {hospital_id.upper(): _facility_stock[hospital_id.upper()]} if hospital_id and hospital_id.upper() in _facility_stock else _facility_stock

    for hid, fac in facilities.items():
        medicines = [medicine.lower()] if medicine else list(fac["stock"].keys())
        for med in medicines:
            qty = fac["stock"].get(med, 0)
            usage = daily_usage_rate if daily_usage_rate else 5.0  # default 5 units/day assumption

            if usage <= 0:
                days_until_depletion = None
                depletion_date = None
            elif qty == 0:
                days_until_depletion = 0
                depletion_date = _today()
            else:
                days_until_depletion = int(qty / usage)
                dep_date = date.today() + timedelta(days=days_until_depletion)
                depletion_date = dep_date.isoformat()

            status = (
                "out_of_stock" if qty == 0
                else "critical" if days_until_depletion is not None and days_until_depletion <= 7
                else "warning" if days_until_depletion is not None and days_until_depletion <= alert_threshold_days
                else "ok"
            )

            if status != "ok" or medicine:
                results.append({
                    "hospitalId": hid,
                    "hospitalName": fac["hospitalName"],
                    "medicine": med,
                    "currentStock": qty,
                    "estimatedDailyUsage": usage,
                    "daysUntilDepletion": days_until_depletion,
                    "estimatedDepletionDate": depletion_date,
                    "status": status,
                })

    results.sort(key=lambda r: (r.get("daysUntilDepletion") or 9999, r["medicine"]))

    return {
        "alertThresholdDays": alert_threshold_days,
        "criticalCount": sum(1 for r in results if r["status"] == "critical"),
        "warningCount": sum(1 for r in results if r["status"] == "warning"),
        "outOfStockCount": sum(1 for r in results if r["status"] == "out_of_stock"),
        "predictions": results,
        "generatedAt": _now_iso(),
    }


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    if "--http" in sys.argv:
        mcp.run(transport="sse")
    else:
        mcp.run(transport="stdio")
