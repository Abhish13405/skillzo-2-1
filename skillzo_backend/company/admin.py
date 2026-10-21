from django.contrib import admin
from .models import Company, LeaderProfile, CompanyCandidate, LiveInterviewInvite, AuditLog


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'created_at')
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(LeaderProfile)
class LeaderProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'company', 'role', 'is_owner', 'is_active', 'created_at')
    list_filter = ('company', 'role', 'is_owner', 'is_active')
    search_fields = ('user__username', 'user__email', 'company__name')


@admin.register(CompanyCandidate)
class CompanyCandidateAdmin(admin.ModelAdmin):
    list_display = ('candidate', 'company', 'target_role', 'status', 'shares_with_company', 'version', 'created_at')
    list_filter = ('company', 'status', 'shares_with_company')
    search_fields = ('candidate__username', 'candidate__email', 'target_role')


@admin.register(LiveInterviewInvite)
class LiveInterviewInviteAdmin(admin.ModelAdmin):
    list_display = ('candidate', 'company', 'scheduled_at', 'status', 'sent_via', 'expires_at', 'created_at')
    list_filter = ('company', 'status', 'sent_via')
    search_fields = ('candidate__username', 'candidate__email', 'token')
    readonly_fields = ('token', 'created_at')


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'company', 'actor', 'candidate', 'action')
    list_filter = ('company', 'action', 'created_at')
    search_fields = ('actor__username', 'candidate__username', 'action', 'new_value')
    readonly_fields = ('company', 'actor', 'candidate', 'action', 'old_value', 'new_value', 'created_at')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
