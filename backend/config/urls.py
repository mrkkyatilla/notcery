from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include("apps.core.urls")),
    path("api/v1/", include("apps.users.urls")),
    path("api/v1/", include("apps.planner.urls")),
    path("api/v1/", include("apps.notes.urls")),
    path("api/v1/", include("apps.chat.urls")),
    path("api/v1/", include("apps.indexer.urls")),
    path("api/v1/", include("apps.ai.urls")),
    path("api/v1/", include("apps.billing.urls")),
    path("api/v1/", include("apps.feedback.urls")),
    path("api/v1/", include("apps.lab.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]
