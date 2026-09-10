from django.contrib import admin

from .models import Genre, Language, Movie, Person, Review, Watchlist


@admin.register(Movie)
class MovieAdmin(admin.ModelAdmin):
    list_display = ["title", "status", "release_date", "duration_minutes", "average_rating"]
    list_filter = ["status", "certificate"]
    search_fields = ["title"]
    filter_horizontal = ["genres", "languages", "cast", "directors"]


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ["movie", "user", "rating", "is_approved", "created_at"]
    list_filter = ["is_approved", "rating"]
    actions = ["approve_reviews", "reject_reviews"]

    def approve_reviews(self, request, queryset):
        queryset.update(is_approved=True)

    def reject_reviews(self, request, queryset):
        queryset.update(is_approved=False)


admin.site.register(Genre)
admin.site.register(Language)
admin.site.register(Person)
admin.site.register(Watchlist)
