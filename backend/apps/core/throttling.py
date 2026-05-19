from rest_framework.throttling import UserRateThrottle


class PlanGenerateThrottle(UserRateThrottle):
    scope = "plan_generate"


class ChatMessageThrottle(UserRateThrottle):
    scope = "chat_message"
