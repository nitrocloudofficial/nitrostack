from django.urls import path
from . import views
from django.contrib.auth import views as auth_views
from django.contrib.auth.views import LoginView, LogoutView

urlpatterns = [
    path("", views.home, name="home"),
    path("search/", views.search, name="search"),

    path(
        "medicine/<int:id>/",
        views.medicine_detail,
        name="medicine_detail"
    ),

    path(
        "pharmacy/<int:id>/",
        views.pharmacy_detail,
        name="pharmacy_detail"
    ),
    path("dashboard/", views.dashboard, name="dashboard"),
    path("dashboard-redirect/", views.dashboard_redirect, name="dashboard_redirect"),
    path(
    "medicines/",
    views.medicines,
    name="medicines"
),

path(
    "medicines/add/",
    views.add_medicine,
    name="add_medicine"
),

path(
    "medicines/edit/<int:pk>/",
    views.edit_medicine,
    name="edit_medicine"
),

path(
    "medicines/delete/<int:pk>/",
    views.delete_medicine,
    name="delete_medicine"
),

path(
    "pharmacies/",
    views.pharmacies,
    name="pharmacies"
),

path(
    "pharmacies/add/",
    views.add_pharmacy,
    name="add_pharmacy"
),

path(
    "pharmacies/edit/<int:pk>/",
    views.edit_pharmacy,
    name="edit_pharmacy"
),

path(
    "pharmacies/delete/<int:pk>/",
    views.delete_pharmacy,
    name="delete_pharmacy"
),
path(
    "inventory/",
    views.inventory,
    name="inventory"
),

path(
    "inventory/add/",
    views.add_inventory,
    name="add_inventory"
),

path(
    "inventory/edit/<int:pk>/",
    views.edit_inventory,
    name="edit_inventory"
),

path(
    "inventory/delete/<int:pk>/",
    views.delete_inventory,
    name="delete_inventory"
),
path(
        "login/",
        LoginView.as_view(
            template_name="login.html"
        ),
        name="login"
    ),

    path(
        "logout/",
        LogoutView.as_view(),
        name="logout"
    ),

    path(
        "register/",
        views.register,
        name="register"
    ),

    path(
        "profile/",
        views.profile,
        name="profile"
    ),
path(
    "dashboard-redirect/",
    views.dashboard_redirect,
    name="dashboard_redirect"
),
path(
    "reserve/<int:inventory_id>/",
    views.reserve_medicine,
    name="reserve_medicine"
),

path(
    "reservations/",
    views.reservations,
    name="reservations"
),

path(
    "reservations/<int:id>/accept/",
    views.accept_reservation,
    name="accept_reservation"
),

path(
    "reservations/<int:id>/reject/",
    views.reject_reservation,
    name="reject_reservation"
),

path(
    "my-reservations/",
    views.my_reservations,
    name="my_reservations"
),

path(
    "search-history/",
    views.search_history,
    name="search_history"
),
path(
    "pharmacy-dashboard/",
    views.pharmacy_dashboard,
    name="pharmacy_dashboard"
),
path(
    "search/suggestions/",
    views.search_suggestions,
    name="search_suggestions"
),
path(
    "notifications/",
    views.notifications_api,
    name="notifications_api"
),
path(
    "reservation-history/",
    views.reservation_history,
    name="reservation_history"
),
path(
    "toggle-pharmacy-status/",
    views.toggle_pharmacy_status,
    name="toggle_pharmacy_status"
),
path(
    "api/ai-chat/",
    views.ai_chat_api,
    name="ai_chat_api"
),
]
