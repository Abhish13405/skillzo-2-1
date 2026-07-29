from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, PasswordResetOTP


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('email', 'username', 'target_role', 'current_streak', 'is_staff')
    search_fields = ('email', 'username')


admin.site.register(PasswordResetOTP)
