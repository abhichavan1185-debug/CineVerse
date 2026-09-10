import random
from datetime import timedelta

from django.contrib.auth import password_validation
from django.utils import timezone
from rest_framework import serializers

from .models import OTP, Profile, User


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["id", "username", "email", "phone", "password"]

    def validate_password(self, value):
        password_validation.validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        Profile.objects.create(user=user, full_name=validated_data.get("username", ""))
        # Issue an email-verification OTP. In production this is emailed via
        # a Celery task; logged here so the flow is testable without SMTP.
        code = f"{random.randint(0, 999999):06d}"
        OTP.objects.create(
            user=user, code=code, purpose="email_verify",
            expires_at=timezone.now() + timedelta(minutes=10),
        )
        return user


class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)
    purpose = serializers.ChoiceField(choices=OTP.PURPOSE_CHOICES)

    def validate(self, attrs):
        try:
            user = User.objects.get(email=attrs["email"])
            otp = OTP.objects.filter(
                user=user, purpose=attrs["purpose"], code=attrs["code"], is_used=False,
            ).latest("created_at")
        except (User.DoesNotExist, OTP.DoesNotExist):
            raise serializers.ValidationError("Invalid code.")
        if otp.expires_at < timezone.now():
            raise serializers.ValidationError("Code expired. Request a new one.")
        attrs["user"] = user
        attrs["otp"] = otp
        return attrs


class ProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    phone = serializers.CharField(source="user.phone", read_only=True)
    is_admin = serializers.SerializerMethodField()
    is_staff = serializers.BooleanField(source="user.is_staff", read_only=True)

    class Meta:
        model = Profile
        fields = [
            "full_name", "avatar_url", "preferred_city", "date_of_birth",
            "email", "phone", "is_admin", "is_staff"
        ]

    def get_is_admin(self, obj):
        return bool(obj.user.is_staff or getattr(obj.user, "is_admin_user", False))
