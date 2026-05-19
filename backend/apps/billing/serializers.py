from rest_framework import serializers

from apps.billing.models import WaitlistEntry


class BillingSummarySerializer(serializers.Serializer):
    tier = serializers.CharField()
    status = serializers.CharField()
    current_period_end = serializers.DateTimeField(allow_null=True)
    limits = serializers.DictField()
    usage = serializers.DictField()


class WaitlistSerializer(serializers.Serializer):
    email = serializers.EmailField()
    locale = serializers.CharField(required=False, default="tr")


class WaitlistEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = WaitlistEntry
        fields = ("id", "email", "invited", "created_at")
        read_only_fields = fields
