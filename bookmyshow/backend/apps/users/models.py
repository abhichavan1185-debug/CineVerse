import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom user: login by email, phone required for OTP verification."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=15, unique=True, null=True, blank=True)
    is_email_verified = models.BooleanField(default=False)
    is_phone_verified = models.BooleanField(default=False)
    is_admin_user = models.BooleanField(default=False)  # app-level admin flag, distinct from is_staff
    is_active_account = models.BooleanField(default=True)  # supports admin "deactivate user"
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    class Meta:
        indexes = [models.Index(fields=["email"]), models.Index(fields=["phone"])]

    def __str__(self):
        return self.email


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    full_name = models.CharField(max_length=150, blank=True)
    avatar_url = models.URLField(blank=True)
    preferred_city = models.CharField(max_length=100, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"Profile<{self.user.email}>"


class OTP(models.Model):
    """Short-lived one-time-passcode for email/phone verification and password reset."""

    PURPOSE_CHOICES = [
        ("email_verify", "Email Verification"),
        ("phone_verify", "Phone Verification"),
        ("password_reset", "Password Reset"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="otps")
    code = models.CharField(max_length=6)
    purpose = models.CharField(max_length=20, choices=PURPOSE_CHOICES)
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["user", "purpose", "is_used"])]
