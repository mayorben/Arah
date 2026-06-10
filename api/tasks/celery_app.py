from celery import Celery
from celery.schedules import crontab
from core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "arah",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["tasks.invoice_tasks", "tasks.whatsapp_tasks", "tasks.alert_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Africa/Lagos",
    enable_utc=True,
    task_routes={
        "tasks.invoice_tasks.*": {"queue": "invoices"},
        "tasks.whatsapp_tasks.*": {"queue": "whatsapp"},
        "tasks.alert_tasks.*": {"queue": "alerts"},
    },
    beat_schedule={
        "check-low-stock-every-6h": {
            "task": "tasks.alert_tasks.check_low_stock_and_notify",
            "schedule": crontab(minute=0, hour="*/6"),
        },
        "weekly-report-monday-8am": {
            "task": "tasks.alert_tasks.send_weekly_report",
            "schedule": crontab(minute=0, hour=8, day_of_week=1),
        },
    },
)
