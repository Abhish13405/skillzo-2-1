from rest_framework import permissions
from django.core.exceptions import PermissionDenied
from .models import LeaderProfile, Company


class IsCompanyLeader(permissions.BasePermission):
    """
    Ensures the user is authenticated and holds an active LeaderProfile.
    Binds `request.leader` and `request.company` to the request object.
    Automatically assigns leadership for superusers and staff members.
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
            if request.user.is_staff or request.user.is_superuser:
                company = Company.objects.first()
                if not company:
                    company = Company.objects.create(name='Skillzo', slug='skillzo')
                profile, _ = LeaderProfile.objects.get_or_create(
                    user=request.user,
                    defaults={'company': company, 'role': 'admin', 'is_owner': True, 'is_active': True}
                )
                request.leader = profile
                request.company = company
                return True
            return False


class IsCompanyAdmin(permissions.BasePermission):
    """
    Ensures the authenticated user has 'admin' privileges in their company.
    Viewers are strictly blocked with 403 Forbidden.
    """
    message = "Admin clearance required. Viewers cannot perform this operation."

    def has_permission(self, request, view):
        if request.user and (request.user.is_staff or request.user.is_superuser):
            return True

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
