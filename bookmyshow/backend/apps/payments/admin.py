from django.contrib import admin

from .models import Payment, Refund


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["gateway_order_id", "booking", "method", "amount", "status", "created_at"]
    list_filter = ["status", "method"]


@admin.register(Refund)
class RefundAdmin(admin.ModelAdmin):
    list_display = ["booking", "amount", "status", "created_at", "completed_at"]
    list_filter = ["status"]
