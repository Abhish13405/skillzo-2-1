from django.contrib import admin
from .models import Resume


@admin.register(Resume)
class ResumeAdmin(admin.ModelAdmin):
    list_display = ('user', 'ats_score', 'is_analyzed', 'uploaded_at')
    list_filter = ('is_analyzed',)
    search_fields = ('user__email',)
