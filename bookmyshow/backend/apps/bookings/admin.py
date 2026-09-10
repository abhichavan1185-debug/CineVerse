from django.contrib import admin

from .models import Booking, BookingSeat, Ticket, TicketTransfer


class BookingSeatInline(admin.TabularInline):
    model = BookingSeat
    extra = 0


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ["booking_ref", "user", "show", "status", "total_amount", "created_at"]
    list_filter = ["status"]
    search_fields = ["booking_ref", "user__email"]
    inlines = [BookingSeatInline]


admin.site.register(Ticket)
admin.site.register(TicketTransfer)
