from rest_framework import permissions
from django.core.exceptions import PermissionDenied
from .models import LeaderProfile


class IsCompanyLeader(permissions.BasePermission):
    """
    Ensures the user is authenticated and holds an active LeaderProfile.
    Binds `request.leader` and `request.company` to the request object.
    """
    message = "Access restricted. You must be an authorized active Company Leader to view this portal."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        try:
            profile = LeaderProfile.objects.select_related('company').get(
                user=request.user,
                is_active=True
            )
            request.leader = profile
            request.company = profile.company
            return True
        except LeaderProfile.DoesNotExist:
            return False


class IsCompanyAdmin(permissions.BasePermission):
    """
    Ensures the authenticated user has 'admin' privileges in their company.
    Viewers are strictly blocked with 403 Forbidden.
    """
    message = "Admin clearance required. Viewers cannot perform this operation."

    def has_permission(self, request, view):
        if not hasattr(request, 'leader') or not request.leader:
            try:
                profile = LeaderProfile.objects.select_related('company').get(
                    user=request.user,
                    is_active=True
                )
                request.leader = profile
                request.company = profile.company
            except LeaderProfile.DoesNotExist:
                return False

        return request.leader.role == 'admin' or request.leader.is_owner
