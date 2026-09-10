from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import OTP, Profile, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = ["email", "username", "phone", "is_email_verified", "is_active_account", "is_staff"]
    list_filter = ["is_active_account", "is_email_verified", "is_staff"]
    search_fields = ["email", "username", "phone"]
    fieldsets = DjangoUserAdmin.fieldsets + (
        ("App flags", {"fields": ("phone", "is_email_verified", "is_phone_verified", "is_admin_user", "is_active_account")}),
    )


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "full_name", "preferred_city"]
    search_fields = ["user__email", "full_name"]


admin.site.register(OTP)
