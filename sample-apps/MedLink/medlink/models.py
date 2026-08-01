from django.db import models
from django.contrib.auth.models import User


class Medicine(models.Model):

    CATEGORY_CHOICES = [
        ('Pain Relief', 'Pain Relief'),
        ('Antibiotic', 'Antibiotic'),
        ('Vitamin', 'Vitamin'),
        ('Allergy', 'Allergy'),
        ('Diabetes', 'Diabetes'),
        ('Heart', 'Heart'),
        ('Other', 'Other'),
    ]

    name = models.CharField(max_length=150)

    brand = models.CharField(max_length=100)

    category = models.CharField(
        max_length=50,
        choices=CATEGORY_CHOICES,
        default="Other"
    )

    dosage = models.CharField(max_length=50)

    description = models.TextField()

    uses = models.TextField()

    side_effects = models.TextField()

    prescription_required = models.BooleanField(default=False)

    image = models.ImageField(
        upload_to="medicines/",
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class Pharmacy(models.Model):

    name = models.CharField(max_length=200)

    owner_name = models.CharField(max_length=150)

    phone = models.CharField(max_length=15)

    email = models.EmailField(blank=True)

    address = models.TextField()

    city = models.CharField(max_length=100)

    state = models.CharField(max_length=100)

    pincode = models.CharField(max_length=10)

    latitude = models.DecimalField(
        max_digits=10,
        decimal_places=7
    )

    longitude = models.DecimalField(
        max_digits=10,
        decimal_places=7
    )

    opening_time = models.TimeField()

    closing_time = models.TimeField()

    image = models.ImageField(
        upload_to="pharmacies/",
        blank=True,
        null=True
    )

    is_active = models.BooleanField(default=True)
    is_open = models.BooleanField(
    default=True
)

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


    

class UserProfile(models.Model):

    ROLE_CHOICES = [
        ("Customer", "Customer"),
        ("Pharmacy", "Pharmacy"),
    ]

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE
    )

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default="Customer"
    )
    pharmacy = models.OneToOneField(
    "Pharmacy",
    on_delete=models.SET_NULL,
    null=True,
    blank=True
    )

    def __str__(self):
        return f"{self.user.username} - {self.role}"
    
class Inventory(models.Model):

    medicine = models.ForeignKey(
        Medicine,
        on_delete=models.CASCADE
    )

    pharmacy = models.ForeignKey(
        Pharmacy,
        on_delete=models.CASCADE
    )

    quantity = models.PositiveIntegerField(default=0)

    price = models.DecimalField(
        max_digits=8,
        decimal_places=2
    )

    batch_number = models.CharField(
        max_length=50
    )

    expiry_date = models.DateField()

    minimum_stock = models.PositiveIntegerField(
        default=10
    )

    expected_restock = models.DateField(
        null=True,
        blank=True
    )

    last_updated = models.DateTimeField(
        auto_now=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):

        return f"{self.medicine.name} - {self.pharmacy.name}"
class Reservation(models.Model):

    STATUS_CHOICES = [
        ("Pending", "Pending"),
        ("Accepted", "Accepted"),
        ("Rejected", "Rejected"),
        ("Collected", "Collected"),
        ("Cancelled", "Cancelled"),
    ]

    customer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="reservations"
    )

    pharmacy = models.ForeignKey(
        Pharmacy,
        on_delete=models.CASCADE
    )

    medicine = models.ForeignKey(
        Medicine,
        on_delete=models.CASCADE
    )

    quantity = models.PositiveIntegerField(default=1)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="Pending"
    )

    requested_at = models.DateTimeField(auto_now_add=True)

    pickup_before = models.DateTimeField(
        null=True,
        blank=True
    )

    notes = models.TextField(
        blank=True
    )

    def __str__(self):
        return f"{self.customer.username} - {self.medicine.name}"
    # ==========================================================
# Notification Model
# ==========================================================

class Notification(models.Model):

    NOTIFICATION_TYPES = [

        ("Reservation", "Reservation"),
        ("Accepted", "Accepted"),
        ("Rejected", "Rejected"),
        ("Inventory", "Inventory"),

    ]

    recipient = models.ForeignKey(

        User,

        on_delete=models.CASCADE,

        related_name="notifications"

    )

    sender = models.ForeignKey(

        User,

        on_delete=models.SET_NULL,

        null=True,

        blank=True,

        related_name="sent_notifications"

    )

    reservation = models.ForeignKey(

        "Reservation",

        on_delete=models.CASCADE,

        null=True,

        blank=True

    )

    title = models.CharField(

        max_length=150

    )

    message = models.TextField()

    notification_type = models.CharField(

        max_length=20,

        choices=NOTIFICATION_TYPES,

        default="Reservation"

    )

    is_read = models.BooleanField(

        default=False

    )

    created_at = models.DateTimeField(

        auto_now_add=True

    )

    class Meta:

        ordering = ["-created_at"]

    def __str__(self):

        return f"{self.recipient.username} - {self.title}"
    
class SearchHistory(models.Model):

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )

    medicine = models.CharField(
        max_length=200
    )

    searched_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return f"{self.user.username} - {self.medicine}"