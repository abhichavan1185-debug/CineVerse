import os

from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("bookmyshow")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

app.conf.beat_schedule = {
    "sweep-expired-seat-locks": {
        "task": "apps.bookings.tasks.sweep_expired_locks_task",
        "schedule": 30.0,  # every 30s — the row-level lock check is the real
                            # guarantee; this is just a cleanup backstop.
    },
}
