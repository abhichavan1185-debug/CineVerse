from django.contrib import admin
from django.http import FileResponse, HttpResponse
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve

from apps.bookings import views as bookings_views


def frontend_app(request):
    """Serve the React entry point for browser routes; APIs stay under /api/."""
    index_file = settings.FRONTEND_DIST_DIR / "index.html"
    if not index_file.is_file():
        return HttpResponse(
            "Frontend build not found. Run `npm run build:django` in the frontend directory.",
            status=503,
            content_type="text/plain; charset=utf-8",
        )
    return FileResponse(index_file.open("rb"), content_type="text/html; charset=utf-8")


def pwa_file(filename, content_type):
    """Serve a PWA file (sw.js / manifest.json / icons) from the frontend dist root."""
    def _view(request):
        f = settings.FRONTEND_DIST_DIR / filename
        if not f.is_file():
            return HttpResponse(f"{filename} not found.", status=404, content_type="text/plain")
        return FileResponse(f.open("rb"), content_type=content_type)
    return _view


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.users.urls")),
    path("api/movies/", include("apps.movies.urls")),
    path("api/cinemas/", include("apps.cinemas.urls")),
    path("api/shows/", include("apps.shows.urls")),
    path("api/bookings/", include("apps.bookings.urls")),
    path("api/payments/", include("apps.payments.urls")),
    path("api/tickets/", include([
        path("validate/", bookings_views.ValidateTicketView.as_view()),
        path("use/", bookings_views.UseTicketView.as_view()),
        path("<str:id_or_ref>/", bookings_views.TicketDetailView.as_view()),
    ])),
    path("api/food/", include("apps.food.urls")),
    path("api/coupons/", include("apps.coupons.urls")),
    path("api/events/", include("apps.events.urls")),
    path("api/admin/", include("apps.admin_api.urls")),

    # ── PWA mandatory root-level files ──────────────────────────────────────
    # Browsers require sw.js at exactly /sw.js (same scope as the app).
    # manifest.json is also conventionally served from root for compatibility.
    path("sw.js", pwa_file("sw.js", "application/javascript")),
    path("manifest.json", pwa_file("manifest.json", "application/manifest+json")),
    path("icon-192.png", pwa_file("icon-192.png", "image/png")),
    path("icon-512.png", pwa_file("icon-512.png", "image/png")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Vite's Django-targeted build uses /static/assets/... paths.  A reverse proxy
# should serve these files in a large deployment; this keeps the single URL
# self-contained for local runs and the supplied Docker image.
urlpatterns += [
    re_path(r"^static/(?P<path>.*)$", serve, {"document_root": settings.FRONTEND_DIST_DIR}),
    # `npm run build:django` emits /static/assets/... URLs, while the normal
    # Vite build emits /assets/... URLs.  Serving both keeps Django's
    # single-server mode working in either local workflow.
    re_path(r"^assets/(?P<path>.*)$", serve, {"document_root": settings.FRONTEND_DIST_DIR / "assets"}),
    re_path(
        r"^(?!api(?:/|$)|admin(?:/|$)|static(?:/|$)|assets(?:/|$)|media(?:/|$)).*$",
        frontend_app,
    ),
]

