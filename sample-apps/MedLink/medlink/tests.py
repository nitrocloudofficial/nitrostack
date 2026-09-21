from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse

from .models import Pharmacy


class PharmacyCreationTests(TestCase):

	def setUp(self):
		self.admin = User.objects.create_superuser(
			username="testadmin",
			email="testadmin@example.com",
			password="testadmin-password-123",
		)

	def test_new_pharmacy_is_saved_and_visible_in_admin(self):
		self.client.force_login(self.admin)

		response = self.client.post(
			reverse("add_pharmacy"),
			{
				"name": "Test Care Pharmacy",
				"owner_name": "Test Owner",
				"phone": "9876543210",
				"email": "pharmacy@example.com",
				"address": "1 Test Street",
				"city": "Chennai",
				"state": "Tamil Nadu",
				"pincode": "600001",
				"latitude": "13.0827000",
				"longitude": "80.2707000",
				"opening_time": "08:00",
				"closing_time": "22:00",
				"is_active": "on",
				"is_open": "on",
			},
		)

		pharmacy = Pharmacy.objects.get(name="Test Care Pharmacy")

		self.assertRedirects(response, reverse("pharmacy_dashboard"))
		self.assertEqual(pharmacy.city, "Chennai")
		self.assertEqual(
			self.client.get(reverse("admin:medlink_pharmacy_changelist")).status_code,
			200,
		)
