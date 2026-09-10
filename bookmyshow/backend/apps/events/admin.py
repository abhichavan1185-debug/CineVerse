from django.contrib import admin

from .models import Event, EventBooking, EventSchedule, TicketTier, Venue


class TicketTierInline(admin.TabularInline):
    model = TicketTier
    extra = 0


class EventScheduleInline(admin.TabularInline):
    model = EventSchedule
    extra = 0


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ["title", "category", "is_featured", "average_rating"]
    list_filter = ["category", "is_featured"]
    search_fields = ["title"]
    inlines = [EventScheduleInline]


@admin.register(EventSchedule)
class EventScheduleAdmin(admin.ModelAdmin):
    list_display = ["event", "venue", "date", "start_time", "is_cancelled"]
    list_filter = ["date", "venue__city"]
    inlines = [TicketTierInline]


@admin.register(Venue)
class VenueAdmin(admin.ModelAdmin):
    list_display = ["name", "city", "address"]
    list_filter = ["city"]


@admin.register(EventBooking)
class EventBookingAdmin(admin.ModelAdmin):
    list_display = ["booking_code", "user", "schedule", "quantity", "total_amount", "status"]
    list_filter = ["status"]
    search_fields = ["booking_code"]
