from django.urls import path

from .views import AIFeedbackCreateView

urlpatterns = [
    path("feedback/ai", AIFeedbackCreateView.as_view(), name="ai-feedback-create"),
]
