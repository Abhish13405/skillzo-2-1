from django.contrib import admin
from .models import InterviewSession, InterviewQuestion, InterviewAnswer


class InterviewQuestionInline(admin.TabularInline):
    model = InterviewQuestion
    extra = 0


@admin.register(InterviewSession)
class InterviewSessionAdmin(admin.ModelAdmin):
    list_display = ('user', 'job_role', 'difficulty', 'mode', 'status', 'overall_score', 'started_at')
    list_filter = ('status', 'mode', 'difficulty', 'job_role')
    search_fields = ('user__email', 'job_role')
    inlines = [InterviewQuestionInline]


@admin.register(InterviewAnswer)
class InterviewAnswerAdmin(admin.ModelAdmin):
    list_display = ('question', 'overall_score', 'answered_at')
