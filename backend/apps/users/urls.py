from django.urls import path

from .views import (
    CurrentUserView,
    GoogleAuthView,
    GoogleLinkView,
    LoginView,
    LogoutView,
    PublicConfigView,
    RefreshView,
    RegisterView,
    UserDataExportView,
)

urlpatterns = [
    path("config/public", PublicConfigView.as_view(), name="config-public"),
    path("auth/register", RegisterView.as_view(), name="auth-register"),
    path("auth/login", LoginView.as_view(), name="auth-login"),
    path("auth/google", GoogleAuthView.as_view(), name="auth-google"),
    path("auth/google/link", GoogleLinkView.as_view(), name="auth-google-link"),
    path("auth/refresh", RefreshView.as_view(), name="auth-refresh"),
    path("auth/logout", LogoutView.as_view(), name="auth-logout"),
    path("users/me", CurrentUserView.as_view(), name="users-me"),
    path("users/me/export", UserDataExportView.as_view(), name="users-me-export"),
]
