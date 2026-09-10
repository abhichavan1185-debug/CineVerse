from rest_framework.permissions import BasePermission


class IsAdminOrStaff(BasePermission):
    """Allows access to staff members or users with is_admin_user=True."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_staff or getattr(request.user, "is_admin_user", False))
        )
