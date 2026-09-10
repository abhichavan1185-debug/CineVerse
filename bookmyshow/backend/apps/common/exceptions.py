from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    """
    Wraps DRF's default handler so every error the frontend receives has a
    predictable shape: {"error": {"code": ..., "message": ..., "detail": ...}}
    Frontend error-state components key off `error.code`.
    """
    response = exception_handler(exc, context)
    if response is not None:
        response.data = {
            "error": {
                "code": response.status_code,
                "message": getattr(exc, "default_detail", str(exc)),
                "detail": response.data,
            }
        }
    return response
