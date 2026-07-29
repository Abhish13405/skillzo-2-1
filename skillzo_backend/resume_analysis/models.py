from django.db import models
from django.conf import settings


class Resume(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='resumes')
    file = models.FileField(upload_to='resumes/')  # PDF or DOCX
    uploaded_at = models.DateTimeField(auto_now_add=True)

    # AI analysis results (from GroqService.analyze_resume)
    extracted_skills = models.JSONField(default=list, blank=True)
    ats_score = models.IntegerField(default=0)
    feedback = models.JSONField(default=list, blank=True)
    suggested_job_roles = models.JSONField(default=list, blank=True)
    missing_keywords = models.JSONField(default=list, blank=True)

    is_analyzed = models.BooleanField(default=False)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"Resume({self.user.email}) - {self.uploaded_at.date()}"
