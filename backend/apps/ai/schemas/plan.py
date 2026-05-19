from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from apps.planner.models import StudyMethod


class PlanEventSchema(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    subject_id: UUID | None = None
    start_at: datetime
    end_at: datetime
    method: str = StudyMethod.POMODORO

    @field_validator("method")
    @classmethod
    def validate_method(cls, value: str) -> str:
        allowed = {choice.value for choice in StudyMethod}
        if value not in allowed:
            raise ValueError(f"method must be one of {sorted(allowed)}")
        return value

    @field_validator("end_at")
    @classmethod
    def end_after_start(cls, end_at: datetime, info) -> datetime:
        start_at = info.data.get("start_at")
        if start_at and end_at <= start_at:
            raise ValueError("end_at must be after start_at")
        return end_at


class PlanGenerationResponseSchema(BaseModel):
    events: list[PlanEventSchema] = Field(min_length=1)
    summary: str | None = None
    source_chunk_ids: list[str] = Field(default_factory=list)
    adjustments: list[str] = Field(default_factory=list)
