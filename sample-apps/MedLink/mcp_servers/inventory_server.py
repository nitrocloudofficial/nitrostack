import os
import sys
import django
from datetime import date, timedelta
from pathlib import Path

# Add project root to sys.path and setup Django environment
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from fastmcp import FastMCP
from django.contrib.auth.models import User
from medlink.models import Inventory, Reservation, Medicine, Pharmacy, Notification

mcp = FastMCP("MedLink Inventory Engine")

@mcp.tool()
def search_live_inventory(medicine_name: str, city: str = "Chennai") -> list:
    """Searches the MedLink database for available stock of medicine_name in specified city across open pharmacies."""
    results = []
    query = Inventory.objects.filter(
        medicine__name__icontains=medicine_name,
        quantity__gt=0,
        pharmacy__is_open=True
    )
    if city:
        query = query.filter(pharmacy__city__icontains=city)
        
    items = query.select_related("medicine", "pharmacy")
    
    for item in items:
        results.append({
            "inventory_id": item.id,
            "medicine": item.medicine.name,
            "pharmacy": item.pharmacy.name,
            "city": item.pharmacy.city,
            "address": item.pharmacy.address,
            "price": float(item.price),
            "stock_quantity": item.quantity,
            "batch_number": item.batch_number,
            "expiry_date": str(item.expiry_date),
            "phone": item.pharmacy.phone
        })
    return results

@mcp.tool()
def create_reservation_request(customer_username: str, inventory_id: int, quantity: int = 1) -> dict:
    """Submits a new pending order reservation into the MedLink database on behalf of customer."""
    try:
        user = User.objects.get(username=customer_username)
        inventory_item = Inventory.objects.get(id=inventory_id)
        
        if inventory_item.quantity < quantity:
            return {"status": "error", "message": f"Insufficient stock. Only {inventory_item.quantity} available."}
            
        reservation = Reservation.objects.create(
            customer=user,
            pharmacy=inventory_item.pharmacy,
            medicine=inventory_item.medicine,
            quantity=quantity,
            status="Pending"
        )
        
        # Create notification for pharmacy owner
        if hasattr(inventory_item.pharmacy, "userprofile") and inventory_item.pharmacy.userprofile.user:
            Notification.objects.create(
                recipient=inventory_item.pharmacy.userprofile.user,
                sender=user,
                reservation=reservation,
                title="New Order Reservation",
                message=f"New reservation request for {quantity}x {inventory_item.medicine.name}.",
                notification_type="Reservation"
            )
            
        return {
            "status": "success",
            "reservation_id": reservation.id,
            "message": f"Reservation created for {inventory_item.medicine.name} at {inventory_item.pharmacy.name}."
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@mcp.tool()
def update_pharmacy_stock(inventory_id: int, quantity: int, price: float) -> dict:
    """Updates stock quantity and price for a pharmacy inventory line item."""
    try:
        item = Inventory.objects.get(id=inventory_id)
        item.quantity = quantity
        item.price = price
        item.save()
        return {"status": "success", "message": f"Updated {item.medicine.name} stock to {quantity} units at ₹{price}."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@mcp.tool()
def fetch_expiring_stock(pharmacy_id: int = None, days: int = 90) -> list:
    """FastMCP Tool: Queries inventory line items nearing expiration within specified days for a pharmacy or platform-wide."""
    cutoff_date = date.today() + timedelta(days=days)
    query = Inventory.objects.filter(expiry_date__lte=cutoff_date)
    if pharmacy_id:
        query = query.filter(pharmacy_id=pharmacy_id)
    
    results = []
    for item in query.select_related("medicine", "pharmacy").order_by("expiry_date"):
        results.append({
            "inventory_id": item.id,
            "medicine": item.medicine.name,
            "pharmacy": item.pharmacy.name,
            "batch_number": item.batch_number,
            "expiry_date": str(item.expiry_date),
            "days_left": (item.expiry_date - date.today()).days,
            "quantity": item.quantity,
            "price": float(item.price)
        })
    return results

@mcp.tool()
def fetch_pending_reservations(pharmacy_id: int = None) -> list:
    """FastMCP Tool: Retrieves all pending customer order reservation requests for a pharmacy or platform-wide."""
    query = Reservation.objects.filter(status="Pending")
    if pharmacy_id:
        query = query.filter(pharmacy_id=pharmacy_id)
        
    results = []
    for r in query.select_related("customer", "medicine", "pharmacy").order_by("-requested_at"):
        results.append({
            "reservation_id": r.id,
            "customer": r.customer.username,
            "medicine": r.medicine.name,
            "pharmacy": r.pharmacy.name,
            "quantity": r.quantity,
            "status": r.status,
            "requested_at": r.requested_at.strftime("%b %d, %H:%M")
        })
    return results

@mcp.tool()
def fetch_low_stock_items(pharmacy_id: int = None, threshold: int = 15) -> list:
    """FastMCP Tool: Returns inventory items running low on stock (quantity <= threshold)."""
    query = Inventory.objects.filter(quantity__lte=threshold)
    if pharmacy_id:
        query = query.filter(pharmacy_id=pharmacy_id)
        
    results = []
    for item in query.select_related("medicine", "pharmacy"):
        results.append({
            "inventory_id": item.id,
            "medicine": item.medicine.name,
            "pharmacy": item.pharmacy.name,
            "quantity": item.quantity,
            "price": float(item.price),
            "batch_number": item.batch_number
        })
    return results

@mcp.resource("resource://low_stock_alerts")
def fetch_low_stock_alerts() -> list:
    """Live resource feed returning items with low stock (<= 10 units) across all pharmacies."""
    return fetch_low_stock_items(threshold=10)

if __name__ == "__main__":
    mcp.run()
