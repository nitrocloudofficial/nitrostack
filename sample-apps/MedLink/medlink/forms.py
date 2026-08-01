from django import forms


from .models import Medicine, Pharmacy, Inventory
from django.contrib.auth.models import User
from .models import UserProfile




class MedicineForm(forms.ModelForm):

    class Meta:

        model = Medicine

        fields = "__all__"

        widgets = {

            "description": forms.Textarea(
                attrs={"rows":4}
            ),

            "uses": forms.Textarea(
                attrs={"rows":4}
            ),

            "side_effects": forms.Textarea(
                attrs={"rows":4}
            ),

        }

class PharmacyForm(forms.ModelForm):

    class Meta:

        model = Pharmacy

        fields = "__all__"

        widgets = {

            "address": forms.Textarea(
                attrs={"rows":3}
            ),

            "opening_time": forms.TimeInput(
                attrs={"type":"time"}
            ),

            "closing_time": forms.TimeInput(
                attrs={"type":"time"}
            ),

        }

class InventoryForm(forms.ModelForm):

    class Meta:

        model = Inventory

        fields = "__all__"

        widgets = {

            "expiry_date": forms.DateInput(
                attrs={"type": "date"}
            ),

            "expected_restock": forms.DateInput(
                attrs={"type": "date"}
            ),

        }
class RegisterForm(forms.ModelForm):

    password = forms.CharField(
        widget=forms.PasswordInput()
    )

    confirm_password = forms.CharField(
        widget=forms.PasswordInput()
    )

    role = forms.ChoiceField(
        choices=UserProfile.ROLE_CHOICES
    )

    class Meta:

        model = User

        fields = [
            "first_name",
            "email",
            "username",
            "password",
        ]

    def clean(self):

        cleaned_data = super().clean()

        if cleaned_data.get("password") != cleaned_data.get("confirm_password"):

            raise forms.ValidationError(
                "Passwords do not match."
            )

        return cleaned_data