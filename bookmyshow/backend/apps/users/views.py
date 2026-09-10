import random
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import OTP, Profile
from .serializers import ProfileSerializer, RegisterSerializer, VerifyOTPSerializer

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {"message": "Registered. Check your email for a 6-digit verification code.",
             "email": user.email},
            status=status.HTTP_201_CREATED,
        )


class VerifyOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user, otp = serializer.validated_data["user"], serializer.validated_data["otp"]
        otp.is_used = True
        otp.save(update_fields=["is_used"])
        if otp.purpose == "email_verify":
            user.is_email_verified = True
            user.save(update_fields=["is_email_verified"])
        return Response({"message": "Verified."})


class ForgotPasswordView(APIView):
    """Issues a password-reset OTP. Always returns 200 to avoid leaking which emails exist."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get("email")
        user = User.objects.filter(email=email).first()
        if user:
            code = f"{random.randint(0, 999999):06d}"
            OTP.objects.create(
                user=user, code=code, purpose="password_reset",
                expires_at=timezone.now() + timedelta(minutes=10),
            )
            # TODO(prod): dispatch via Celery email task instead of sync send.
        return Response({"message": "If that email exists, a reset code has been sent."})


class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VerifyOTPSerializer(
            data={**request.data, "purpose": "password_reset"}
        )
        serializer.is_valid(raise_exception=True)
        user, otp = serializer.validated_data["user"], serializer.validated_data["otp"]
        new_password = request.data.get("new_password")
        if not new_password or len(new_password) < 8:
            return Response({"error": "Password must be at least 8 characters."}, status=400)
        user.set_password(new_password)
        user.save(update_fields=["password"])
        otp.is_used = True
        otp.save(update_fields=["is_used"])
        return Response({"message": "Password reset. Log in with your new password."})


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        profile, _ = Profile.objects.get_or_create(user=self.request.user)
        return profile


class LoginView(TokenObtainPairView):
    """Standard SimpleJWT email+password login (email is USERNAME_FIELD)."""
    pass
