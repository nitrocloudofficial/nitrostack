import os
import sys
import xml.etree.ElementTree as ET
import sumo_server

print("=== 1. Testing Location Auto-Geocoder ===")
places = ["Erode City Center", "Ettimadai", "Salem", "Coimbatore", "Chennai"]
for p in places:
    bbox = sumo_server.resolve_location_to_bbox(p)
    print(f"Location: '{p}' -> Bbox: {bbox}")
    parts = bbox.split(',')
    assert len(parts) == 4, f"Invalid bbox format for {p}"
    for val in parts:
        float(val)  # Validate all 4 are floats

print("\n=== 2. Testing End-to-End Simulation for 'Salem' ===")
res = sumo_server.run_full_simulation("Salem", trips=100, duration=3600, launch_gui=False)
print("Execution Status:", res["status"])
print("Resolved Bbox:", res["bbox"])
print("Analytics Output:", res["analytics"])

# Double-check truthfulness against actual generated XML files on disk
assert os.path.exists("mymap.net.xml"), "mymap.net.xml missing!"
assert os.path.exists("stats.xml"), "stats.xml missing!"

tree = ET.parse("stats.xml")
root = tree.getroot()
vehicles_elem = root.find(".//vehicles")
trip_stats_elem = root.find(".//vehicleTripStatistics")

actual_loaded = int(vehicles_elem.attrib.get("loaded")) if vehicles_elem is not None else 0
actual_inserted = int(vehicles_elem.attrib.get("inserted")) if vehicles_elem is not None else 0
actual_route_length = float(trip_stats_elem.attrib.get("routeLength")) if trip_stats_elem is not None else 0.0

print("\n=== 3. Truthfulness Audit ===")
print(f"Actual stats.xml loaded: {actual_loaded} | Tool reported: {res['analytics']['total_vehicles_loaded']}")
print(f"Actual stats.xml inserted: {actual_inserted} | Tool reported: {res['analytics']['total_vehicles_inserted']}")
print(f"Actual stats.xml avg route length: {actual_route_length:.2f}m | Tool reported: {res['analytics']['average_route_length']:.2f}m")

assert actual_loaded == res["analytics"]["total_vehicles_loaded"], "Mismatch in loaded vehicles count!"
assert actual_inserted == res["analytics"]["total_vehicles_inserted"], "Mismatch in inserted vehicles count!"
assert abs(actual_route_length - res["analytics"]["average_route_length"]) < 0.01, "Mismatch in route length!"

print("\n>>> VERIFICATION AUDIT PASSED 100%! ALL METRICS ARE EMPIRICALLY ACCURATE AND TRUE <<<")
