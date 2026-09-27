import os
import sys
import django
from pathlib import Path

# Add project root to sys.path and setup Django environment
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from fastmcp import FastMCP
from medifind.models import Pharmacy

mcp = FastMCP("MediFind GeoNav Engine")

@mcp.tool()
def generate_google_maps_directions(latitude: float, longitude: float) -> str:
    """Generates a 1-click turn-by-turn Google Maps navigation URL for pharmacy GPS coordinates."""
    return f"https://www.google.com/maps/dir/?api=1&destination={latitude},{longitude}"

@mcp.tool()
def find_nearby_pharmacies(city: str = "Chennai", must_be_open: bool = True) -> list:
    """Filters registered pharmacies in a specified city by active status and live OPEN/CLOSED state."""
    query = Pharmacy.objects.filter(city__icontains=city, is_active=True)
    if must_be_open:
        query = query.filter(is_open=True)
        
    results = []
    for p in query:
        directions_url = generate_google_maps_directions(float(p.latitude), float(p.longitude))
        results.append({
            "pharmacy_id": p.id,
            "name": p.name,
            "owner_name": p.owner_name,
            "address": p.address,
            "city": p.city,
            "phone": p.phone,
            "latitude": float(p.latitude),
            "longitude": float(p.longitude),
            "opening_time": str(p.opening_time),
            "closing_time": str(p.closing_time),
            "is_open": p.is_open,
            "google_maps_directions_url": directions_url
        })
    return results

if __name__ == "__main__":
    mcp.run()
