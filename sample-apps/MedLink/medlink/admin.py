from django.contrib import admin
from .models import (
    Medicine,
    Pharmacy,
    Inventory,
    UserProfile,
    Reservation,
    Notification,
)
@admin.register(Medicine)
class MedicineAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "name",
        "brand",
        "category",
        "dosage",
        "prescription_required",
    )

    search_fields = (
        "name",
        "brand",
    )


@admin.register(Pharmacy)
class PharmacyAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "name",
        "owner_name",
        "city",
        "phone",
        "is_active",
        "is_open",
    )

    search_fields = (
        "name",
        "city",
        "owner_name",
    )

    list_filter = (
        "city",
        "is_active",
        "is_open",
    )

    show_full_result_count = True
@admin.register(Inventory)
class InventoryAdmin(admin.ModelAdmin):

    list_display = (
        "medicine",
        "pharmacy",
        "quantity",
        "price",
        "expiry_date",
    )

    search_fields = (
        "medicine__name",
        "pharmacy__name",
    )

    list_filter = (
        "pharmacy",
    )
admin.site.register(UserProfile)
admin.site.register(Reservation)
admin.site.register(Notification)