from apps.ai.services.plan_generation import run_plan_generation
from celery import shared_task


@shared_task(bind=True, max_retries=0, name="ai.generate_plan")
def generate_plan_task(self, async_task_id: str, payload: dict):
    run_plan_generation(async_task_id, payload)
