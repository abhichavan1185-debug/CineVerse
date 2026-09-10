from django.contrib import admin

from .models import Show, ShowSeat, ShowSeatPrice


class ShowSeatPriceInline(admin.TabularInline):
    model = ShowSeatPrice
    extra = 0


@admin.register(Show)
class ShowAdmin(admin.ModelAdmin):
    list_display = ["movie", "screen", "date", "start_time", "format", "is_cancelled"]
    list_filter = ["format", "is_cancelled", "date"]
    inlines = [ShowSeatPriceInline]


@admin.register(ShowSeat)
class ShowSeatAdmin(admin.ModelAdmin):
    list_display = ["show", "seat", "status", "locked_by", "locked_until", "price"]
    list_filter = ["status"]
    search_fields = ["show__movie__title"]
