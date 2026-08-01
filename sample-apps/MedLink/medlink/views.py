from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.core.paginator import Paginator
from django.contrib.auth import login
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.db.models import Q
from django.db import transaction
from collections import Counter
from django.utils import timezone
from datetime import timedelta
from datetime import datetime
import json


from .models import (
    Medicine,
    Pharmacy,
    Inventory,
    Reservation,
    SearchHistory,
    Notification,
    UserProfile,
)

from .forms import (
    MedicineForm,
    PharmacyForm,
    InventoryForm,
    RegisterForm,
)


# ==========================================================
# Permissions & Role-Based Routing
# ==========================================================

def admin_required(view_func):
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect("login")
        try:
            profile = request.user.userprofile
        except UserProfile.DoesNotExist:
            profile, _ = UserProfile.objects.get_or_create(user=request.user)

        if request.user.is_superuser or profile.role == "Admin":
            return view_func(request, *args, **kwargs)
        elif profile.role == "Pharmacy":
            return redirect("pharmacy_dashboard")
        else:
            return redirect("search")
    return wrapper


def pharmacy_required(view_func):
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect("login")
        try:
            profile = request.user.userprofile
        except UserProfile.DoesNotExist:
            profile, _ = UserProfile.objects.get_or_create(user=request.user)

        if request.user.is_superuser or profile.role == "Pharmacy":
            return view_func(request, *args, **kwargs)
        else:
            return redirect("search")
    return wrapper


@login_required
def dashboard_redirect(request):
    try:
        profile = request.user.userprofile
    except UserProfile.DoesNotExist:
        profile, _ = UserProfile.objects.get_or_create(user=request.user)

    if request.user.is_superuser or profile.role == "Admin":
        return redirect("dashboard")
    elif profile.role == "Pharmacy":
        return redirect("pharmacy_dashboard")
    else:
        return redirect("search")


# ==========================================================
# Home
# ==========================================================

def home(request):

    return render(
        request,
        "home.html"
    )


# ==========================================================
# Search
# ==========================================================

def search(request):

    query = request.GET.get("medicine", "")
    category = request.GET.get("category", "")
    sort = request.GET.get("sort", "")

    current_time = timezone.localtime().time()

    # Save search history
    if (
        request.user.is_authenticated
        and hasattr(request.user, "userprofile")
        and request.user.userprofile.role == "Customer"
        and query
    ):

        SearchHistory.objects.create(
            user=request.user,
            medicine=query
        )

    # Base Query
    inventory = Inventory.objects.select_related(
        "medicine",
        "pharmacy"
    )

    # Search by medicine name or brand
    if query:

        inventory = inventory.filter(

            Q(medicine__name__icontains=query) |

            Q(medicine__brand__icontains=query)

        )

    # Filter by category
    if category and category != "All":

        inventory = inventory.filter(

            medicine__category=category

        )

    # Sort Results
    if sort == "cheapest":

        inventory = inventory.order_by("price")

    # ==========================================
    # Pharmacy Open / Closed Status
    # ==========================================

    for item in inventory:

        opening = item.pharmacy.opening_time
        closing = item.pharmacy.closing_time

        business_hours = (
        opening <= current_time <= closing
    )

        item.is_open = (
        item.pharmacy.is_open
        and
        business_hours
    )

        if item.is_open:

            item.status_text = (
                f"Closes at {closing.strftime('%I:%M %p')}"
            )

        else:

            item.status_text = (
                f"Opens at {opening.strftime('%I:%M %p')}"
            )

    # ==========================================
    # Marker Data
    # ==========================================

    marker_data = []

    for item in inventory:

        marker_data.append({

            "medicine": item.medicine.name,

            "brand": item.medicine.brand,

            "pharmacy": item.pharmacy.name,

            "address": item.pharmacy.address,

            "city": item.pharmacy.city,

            "phone": item.pharmacy.phone,

            "price": float(item.price),

            "quantity": item.quantity,

            "is_open": item.is_open,

            "latitude": float(item.pharmacy.latitude),

            "longitude": float(item.pharmacy.longitude),

        })

    return render(

        request,

        "search.html",

        {

            "inventory": inventory,

            "query": query,

            "category": category,

            "sort": sort,

            "marker_data": json.dumps(marker_data)

        }

    )
def search_suggestions(request):

    query = request.GET.get("q", "").strip()

    suggestions = []

    if query:

        medicines = (
            Medicine.objects.filter(
                Q(name__icontains=query) |
                Q(brand__icontains=query)
            )
            .order_by("name")
            .distinct()[:8]
        )

        for medicine in medicines:

            suggestions.append({

                "id": medicine.id,

                "name": medicine.name,

                "brand": medicine.brand,

                "category": medicine.category,

            })

    return JsonResponse(suggestions, safe=False)

# ==========================================================
# Details
# ==========================================================

def medicine_detail(request, id):
    return render(
        request,
        "medicine_detail.html"
    )


def pharmacy_detail(request, id):
    return render(
        request,
        "pharmacy_detail.html"
    )


# ==========================================================
# Dashboard
# ==========================================================

@admin_required
def dashboard(request):

    current_time = timezone.localtime().time()

    medicine_count = Medicine.objects.count()

    pharmacy_count = Pharmacy.objects.count()

    if request.user.is_superuser:

        inventory = Inventory.objects.select_related(
            "medicine",
            "pharmacy"
        )

        inventory_count = inventory.count()

        top_pharmacy = (
            Pharmacy.objects
            .order_by("name")
            .first()
        )

    else:

        inventory = Inventory.objects.select_related(
            "medicine",
            "pharmacy"
        ).filter(
            pharmacy=request.user.userprofile.pharmacy
        )

        inventory_count = inventory.count()

        top_pharmacy = request.user.userprofile.pharmacy

    active_pharmacies = Pharmacy.objects.filter(
        is_active=True
    ).count()

    medicines = Medicine.objects.all()

    category_counter = Counter()

    for medicine in medicines:
        category_counter[medicine.category] += 1

    category_labels = list(category_counter.keys())

    category_values = list(category_counter.values())

    stock_labels = []

    stock_values = []

    for item in inventory:

        is_open = (
        item.pharmacy.opening_time <= current_time <= item.pharmacy.closing_time
    )

        stock_labels.append(item.medicine.name)

        stock_values.append(item.quantity)

    low_stock = inventory.filter(quantity__lte=20)

    expiring = inventory.filter(
        expiry_date__lte=timezone.now().date() + timedelta(days=90)
    )

    recent_inventory = inventory.order_by("-created_at")[:5]

    context = {

        "medicine_count": medicine_count,

        "pharmacy_count": pharmacy_count,

        "inventory_count": inventory_count,

        "active_pharmacies": active_pharmacies,

        "category_labels": category_labels,

        "category_values": category_values,

        "stock_labels": stock_labels,

        "stock_values": stock_values,

        "low_stock": low_stock,

        "expiring": expiring,

        "recent_inventory": recent_inventory,

        "top_pharmacy": top_pharmacy,

    }

    return render(
        request,
        "dashboard.html",
        context
    )
@login_required
def toggle_pharmacy_status(request):

    if request.user.userprofile.role != "Pharmacy":

        messages.error(
            request,
            "Access denied."
        )

        return redirect("home")

    pharmacy = request.user.userprofile.pharmacy

    if not pharmacy:
        messages.warning(
            request,
            "Please create your pharmacy store profile first."
        )
        return redirect("add_pharmacy")

    pharmacy.is_open = not pharmacy.is_open

    pharmacy.save()

    if pharmacy.is_open:

        messages.success(
            request,
            "Pharmacy is now OPEN."
        )

    else:

        messages.warning(
            request,
            "Pharmacy is now CLOSED."
        )

    return redirect("pharmacy_dashboard")


# ==========================================================
# Medicines
# ==========================================================

def medicines(request):

    query = request.GET.get("q")

    medicines = Medicine.objects.all().order_by("name")

    if query:
        medicines = medicines.filter(
            name__icontains=query
        )

    paginator = Paginator(
        medicines,
        8
    )

    page = request.GET.get("page")

    medicines = paginator.get_page(page)

    return render(
        request,
        "medicines.html",
        {
            "medicines": medicines,
            "query": query
        }
    )


@pharmacy_required
def add_medicine(request):

    if request.method == "POST":

        form = MedicineForm(
            request.POST,
            request.FILES
        )

        if form.is_valid():

            form.save()

            messages.success(
                request,
                "Medicine added successfully."
            )

            return redirect("medicines")

    else:

        form = MedicineForm()

    return render(
        request,
        "add_medicine.html",
        {
            "form": form
        }
    )
@pharmacy_required
def edit_medicine(request, pk):

    medicine = get_object_or_404(
        Medicine,
        pk=pk
    )

    if request.method == "POST":

        form = MedicineForm(
            request.POST,
            request.FILES,
            instance=medicine
        )

        if form.is_valid():

            form.save()

            messages.success(
                request,
                "Medicine updated successfully."
            )

            return redirect("medicines")

    else:

        form = MedicineForm(
            instance=medicine
        )

    return render(
        request,
        "add_medicine.html",
        {
            "form": form
        }
    )


@pharmacy_required
def delete_medicine(request, pk):

    medicine = get_object_or_404(
        Medicine,
        pk=pk
    )

    medicine.delete()

    messages.success(
        request,
        "Medicine deleted successfully."
    )

    return redirect("medicines")


# ==========================================================
# Pharmacy Management
# ==========================================================

def pharmacies(request):

    pharmacies = Pharmacy.objects.all().order_by("name")

    return render(
        request,
        "pharmacies.html",
        {
            "pharmacies": pharmacies
        }
    )


@pharmacy_required
def add_pharmacy(request):

    if request.method == "POST":

        form = PharmacyForm(
            request.POST,
            request.FILES
        )

        if form.is_valid():

            with transaction.atomic():
                pharmacy = form.save()

                if hasattr(request.user, "userprofile") and not request.user.userprofile.pharmacy:
                    profile = request.user.userprofile
                    profile.pharmacy = pharmacy
                    profile.save()

            messages.success(
                request,
                "Pharmacy added successfully."
            )

            return redirect("pharmacy_dashboard")

    else:

        form = PharmacyForm()

    return render(
        request,
        "add_pharmacy.html",
        {
            "form": form
        }
    )
@pharmacy_required
def edit_pharmacy(request, pk):

    pharmacy = get_object_or_404(
        Pharmacy,
        pk=pk
    )

    if (
        not request.user.is_superuser
        and pharmacy != request.user.userprofile.pharmacy
    ):
        return render(
            request,
            "403.html",
            status=403
        )

    if request.method == "POST":

        form = PharmacyForm(
            request.POST,
            request.FILES,
            instance=pharmacy
        )

        if form.is_valid():

            form.save()

            messages.success(
                request,
                "Pharmacy updated successfully."
            )

            return redirect("pharmacies")

    else:

        form = PharmacyForm(
            instance=pharmacy
        )

    return render(
        request,
        "add_pharmacy.html",
        {
            "form": form
        }
    )


@pharmacy_required
def delete_pharmacy(request, pk):

    pharmacy = get_object_or_404(
        Pharmacy,
        pk=pk
    )

    if (
        not request.user.is_superuser
        and pharmacy != request.user.userprofile.pharmacy
    ):
        return render(
            request,
            "403.html",
            status=403
        )

    pharmacy.delete()

    messages.success(
        request,
        "Pharmacy deleted successfully."
    )

    return redirect("pharmacies")


# ==========================================================
# Inventory Management
# ==========================================================

@pharmacy_required
def inventory(request):

    query = request.GET.get("q")

    if request.user.is_superuser:

        inventory = Inventory.objects.select_related(
            "medicine",
            "pharmacy"
        ).order_by(
            "medicine__name"
        )

    else:

        inventory = Inventory.objects.select_related(
            "medicine",
            "pharmacy"
        ).filter(
            pharmacy=request.user.userprofile.pharmacy
        ).order_by(
            "medicine__name"
        )

    if query:

        inventory = inventory.filter(
            medicine__name__icontains=query
        )

    paginator = Paginator(
        inventory,
        10
    )

    page = request.GET.get("page")

    inventory = paginator.get_page(page)

    return render(
        request,
        "inventory.html",
        {
            "inventory": inventory,
            "query": query
        }
    )


@pharmacy_required
def add_inventory(request):

    if request.method == "POST":

        form = InventoryForm(
            request.POST
        )

        if form.is_valid():

            form.save()

            messages.success(
                request,
                "Inventory added successfully."
            )

            return redirect("inventory")

    else:

        form = InventoryForm()

    return render(
        request,
        "add_inventory.html",
        {
            "form": form
        }
    )
# ==========================================================
# Inventory Management
# ==========================================================

@pharmacy_required
def edit_inventory(request, pk):

    item = get_object_or_404(
        Inventory,
        pk=pk
    )

    if (
        not request.user.is_superuser
        and item.pharmacy != request.user.userprofile.pharmacy
    ):
        return render(
            request,
            "403.html",
            status=403
        )

    if request.method == "POST":

        form = InventoryForm(
            request.POST,
            instance=item
        )

        if form.is_valid():

            form.save()

            messages.success(
                request,
                "Inventory updated successfully."
            )

            return redirect("inventory")

    else:

        form = InventoryForm(
            instance=item
        )

    return render(
        request,
        "add_inventory.html",
        {
            "form": form
        }
    )


@pharmacy_required
def delete_inventory(request, pk):

    item = get_object_or_404(
        Inventory,
        pk=pk
    )

    if (
        not request.user.is_superuser
        and item.pharmacy != request.user.userprofile.pharmacy
    ):
        return render(
            request,
            "403.html",
            status=403
        )

    item.delete()

    messages.success(
        request,
        "Inventory deleted successfully."
    )

    return redirect("inventory")


# ==========================================================
# Authentication
# ==========================================================

def register(request):

    if request.method == "POST":

        form = RegisterForm(request.POST)

        if form.is_valid():

            username = form.cleaned_data["username"]

            if User.objects.filter(username=username).exists():

                messages.error(
                    request,
                    "Username already exists. Please choose another username."
                )

                return render(
                    request,
                    "register.html",
                    {
                        "form": form
                    }
                )

            user = User.objects.create_user(

                username=username,

                password=form.cleaned_data["password"],

                first_name=form.cleaned_data["first_name"],

                email=form.cleaned_data["email"]

            )

            profile = user.userprofile

            profile.role = form.cleaned_data["role"]

            profile.save()

            login(request, user)

            messages.success(
                request,
                "Account created successfully."
            )

            return redirect("home")

    else:

        form = RegisterForm()

    return render(

        request,

        "register.html",

        {

            "form": form

        }

    )
# ==========================================================
# Profile
# ==========================================================

@login_required
def profile(request):

    searches = SearchHistory.objects.filter(
        user=request.user
    ).order_by("-searched_at")

    reservations = Reservation.objects.filter(
        customer=request.user
    ).order_by("-requested_at")

    context = {

        "search_count": searches.count(),

        "reservation_count": reservations.count(),

        "recent_searches": searches[:5],

        "recent_reservations": reservations[:5],

    }

    return render(
        request,
        "profile.html",
        context
    )
# ==========================================================
# Dashboard Redirect
# ==========================================================

@login_required
def dashboard_redirect(request):

    if request.user.is_superuser:
        return redirect("dashboard")

    if request.user.userprofile.role == "Pharmacy":
        return redirect("pharmacy_dashboard")

    return redirect("home")


# ==========================================================
# Reservation System
# ==========================================================

@login_required
def reserve_medicine(request, inventory_id):

    inventory = get_object_or_404(
        Inventory,
        id=inventory_id
    )

    user_profile, _ = UserProfile.objects.get_or_create(
        user=request.user,
        defaults={"role": "Customer"}
    )

    if user_profile.role != "Customer" and not request.user.is_superuser:

        messages.error(
            request,
            "Only customers can reserve medicines."
        )

        return redirect("search")

    if inventory.quantity <= 0:

        messages.error(
            request,
            "Medicine is currently out of stock."
        )

        return redirect("search")

    # Read requested quantity from POST or GET
    try:
        qty_val = request.POST.get('quantity') or request.GET.get('quantity') or 1
        quantity = int(qty_val)
        if quantity < 1:
            quantity = 1
    except (ValueError, TypeError):
        quantity = 1

    if quantity > inventory.quantity:
        messages.error(
            request,
            f"Cannot reserve {quantity} units. Only {inventory.quantity} units available in stock."
        )
        return redirect("search")

    existing = Reservation.objects.filter(
        customer=request.user,
        pharmacy=inventory.pharmacy,
        medicine=inventory.medicine,
        status="Pending"
    ).first()

    if existing:
        new_qty = existing.quantity + quantity
        if new_qty > inventory.quantity:
            messages.warning(
                request,
                f"You already have {existing.quantity} units reserved. Total cannot exceed available stock of {inventory.quantity}."
            )
            return redirect("search")
        existing.quantity = new_qty
        existing.save()

        try:
            profile = UserProfile.objects.filter(
                pharmacy=inventory.pharmacy
            ).first()
            if profile:
                Notification.objects.create(
                    recipient=profile.user,
                    sender=request.user,
                    reservation=existing,
                    title="Reservation Updated",
                    message=f"{request.user.username} updated reservation for {inventory.medicine.name} to {existing.quantity} units.",
                    notification_type="Reservation"
                )
        except Exception as e:
            print("NOTIFICATION ERROR:", e)

        messages.success(
            request,
            f"Updated existing reservation for {inventory.medicine.name}. Total reserved: {existing.quantity} units."
        )
        return redirect("search")

    reservation = Reservation.objects.create(

        customer=request.user,

        pharmacy=inventory.pharmacy,

        medicine=inventory.medicine,

        quantity=quantity,

        status="Pending"

    )

    try:

        profile = UserProfile.objects.filter(
            pharmacy=inventory.pharmacy
        ).first()

        if profile:
            Notification.objects.create(

                recipient=profile.user,

                sender=request.user,

                reservation=reservation,

                title="New Reservation",

                message=f"{request.user.username} requested {quantity} unit(s) of {inventory.medicine.name}.",

                notification_type="Reservation"

            )

    except Exception as e:

        print("NOTIFICATION ERROR:", e)

    messages.success(
        request,
        f"Successfully reserved {quantity} unit(s) of {inventory.medicine.name}!"
    )

    return redirect("search")
@login_required
def reservations(request):

    if request.user.is_superuser:

        reservations = Reservation.objects.filter(

            status="Pending"

        )

    else:

        reservations = Reservation.objects.filter(

            pharmacy=request.user.userprofile.pharmacy,

            status="Pending"

        )

    reservations = reservations.order_by("-requested_at")

    return render(

        request,

        "reservations.html",

        {

            "reservations": reservations

        }

    )
@login_required
def reservation_history(request):

    if request.user.is_superuser:

        history = Reservation.objects.exclude(

            status="Pending"

        )

    else:

        history = Reservation.objects.filter(

            pharmacy=request.user.userprofile.pharmacy

        ).exclude(

            status="Pending"

        )

    history = history.order_by("-requested_at")

    return render(

        request,

        "reservation_history.html",

        {

            "history": history

        }

    )
@login_required
def accept_reservation(request, id):

    reservation = get_object_or_404(
        Reservation,
        id=id
    )

    reservation.status = "Accepted"
    reservation.save()
    Notification.objects.create(

    recipient=reservation.customer,

    sender=request.user,

    reservation=reservation,

    title="Reservation Accepted",

    message=f"{reservation.pharmacy.name} accepted your reservation for {reservation.medicine.name}.",

    notification_type="Accepted"

)

    inventory = get_object_or_404(
        Inventory,
        pharmacy=reservation.pharmacy,
        medicine=reservation.medicine
    )

    inventory.quantity -= reservation.quantity

    if inventory.quantity < 0:
        inventory.quantity = 0

    inventory.save()

    messages.success(
        request,
        "Reservation accepted successfully."
    )

    return redirect("reservations")


@login_required
def reject_reservation(request, id):

    reservation = get_object_or_404(
        Reservation,
        id=id
    )

    reservation.status = "Rejected"

    reservation.save()
    Notification.objects.create(

    recipient=reservation.customer,

    sender=request.user,

    reservation=reservation,

    title="Reservation Rejected",

    message=f"{reservation.pharmacy.name} rejected your reservation for {reservation.medicine.name}.",

    notification_type="Rejected"

)

    messages.success(
        request,
        "Reservation rejected."
    )

    return redirect("reservations")

@login_required
def my_reservations(request):

    reservations = Reservation.objects.filter(
        customer=request.user
    ).order_by("-requested_at")

    return render(
        request,
        "my_reservations.html",
        {
            "reservations": reservations
        }
    )
@login_required
def search_history(request):

    searches = SearchHistory.objects.filter(
        user=request.user
    ).order_by("-searched_at")

    return render(
        request,
        "search_history.html",
        {
            "searches": searches
        }
    )

@pharmacy_required
def pharmacy_dashboard(request):

    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    pharmacy = profile.pharmacy

    if not pharmacy:
        if request.user.is_superuser:
            pharmacy = Pharmacy.objects.first()
        else:
            messages.info(request, "Please set up your pharmacy store profile.")
            return redirect("add_pharmacy")

    if not pharmacy:
        messages.info(
            request,
            "Please add your pharmacy store details to set up your dashboard."
        )
        return redirect("add_pharmacy")

    inventory = Inventory.objects.filter(
        pharmacy=pharmacy
    ).select_related("medicine")

    reservations = Reservation.objects.filter(
        pharmacy=pharmacy
    ).order_by("-requested_at")[:10]

    low_stock = inventory.filter(
        quantity__lte=10
    )

    context = {

    "pharmacy": pharmacy,

    "inventory": inventory,

    "inventory_count": inventory.count(),

    "reservation_count": Reservation.objects.filter(
        pharmacy=pharmacy
    ).count(),

    "low_stock": low_stock,

    "reservations": reservations,

    "available_stock": inventory.filter(
        quantity__gt=0
    ).count(),

    "out_of_stock": inventory.filter(
        quantity=0
    ).count(),

    "expiring_stock": inventory.filter(
        expiry_date__lte=timezone.now().date() + timedelta(days=30)
    ).count(),

}
    return render(
        request,
        "pharmacy_dashboard.html",
        context,
    )
# ==========================================================
# Notification API
# ==========================================================

@login_required
def notifications_api(request):

    notifications = Notification.objects.filter(
        recipient=request.user
    ).order_by("-created_at")[:20]

    data = []

    now = timezone.now()

    for notification in notifications:

        diff = now - notification.created_at

        if diff.total_seconds() < 60:

            time = "Just now"

        elif diff.total_seconds() < 3600:

            mins = int(diff.total_seconds() / 60)
            time = f"{mins} min ago"

        elif diff.total_seconds() < 86400:

            hrs = int(diff.total_seconds() / 3600)
            time = f"{hrs} hour ago"

        elif diff.days == 1:

            time = "Yesterday"

        else:

            time = f"{diff.days} days ago"

        data.append({

            "id": notification.id,

            "title": notification.title,

            "message": notification.message,

            "type": notification.notification_type,

            "is_read": notification.is_read,

            "time": time

        })

    return JsonResponse(data, safe=False)


# ==========================================================
# MedLink AI Chatbot API
# ==========================================================

from django.views.decorators.csrf import csrf_exempt
from .ai_agent import query_role_aware_agent

@csrf_exempt
def ai_chat_api(request):
    if request.method == "POST":
        user_message = request.POST.get("message", "").strip()
        if not user_message:
            return JsonResponse({"error": "Empty message"}, status=400)
        
        reply = query_role_aware_agent(user_message, request.user)
        return JsonResponse({"reply": reply})
    
    return JsonResponse({"error": "POST method required"}, status=405)