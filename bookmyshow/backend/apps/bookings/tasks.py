from celery import shared_task

from . import services


@shared_task
def sweep_expired_locks_task():
    released = services.sweep_expired_locks()
    return {"released": released}
