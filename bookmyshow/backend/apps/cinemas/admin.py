from django.contrib import admin

from .models import Cinema, City, District, Screen, Seat, SeatCategory


class ScreenInline(admin.TabularInline):
    model = Screen
    extra = 0


@admin.register(Cinema)
class CinemaAdmin(admin.ModelAdmin):
    list_display = ["name", "city", "district", "is_active"]
    list_filter = ["city", "city__district", "is_active"]
    inlines = [ScreenInline]

    @admin.display(ordering="city__district__name", description="District")
    def district(self, obj):
        return obj.city.district


@admin.register(Screen)
class ScreenAdmin(admin.ModelAdmin):
    list_display = ["cinema", "name"]


@admin.register(Seat)
class SeatAdmin(admin.ModelAdmin):
    list_display = ["screen", "row_label", "seat_number", "category"]
    list_filter = ["category", "screen__cinema"]


@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ["name", "district", "is_popular"]
    list_filter = ["district", "is_popular"]
    search_fields = ["name", "district__name"]


admin.site.register(District)
admin.site.register(SeatCategory)
