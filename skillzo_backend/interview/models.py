from django.db import models
from django.conf import settings


class InterviewSession(models.Model):
    """One full interview attempt: role + difficulty + mode."""

    MODE_CHOICES = [
        ('text', 'Text Interview'),
        ('audio', 'Audio Interview'),   # Phase 2
        ('video', 'Video Interview'),   # Phase 2
    ]
    DIFFICULTY_CHOICES = [
        ('Beginner', 'Beginner'),
        ('Intermediate', 'Intermediate'),
        ('Advanced', 'Advanced'),
    ]
    STATUS_CHOICES = [
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('abandoned', 'Abandoned'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                              related_name='interview_sessions')
    job_role = models.CharField(max_length=100)          # Python Developer, HR Interview, Custom Role, etc.
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES)
    mode = models.CharField(max_length=10, choices=MODE_CHOICES, default='text')
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='in_progress')

    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    # Final report fields (filled by GroqService.generate_final_report_summary)
    overall_score = models.IntegerField(null=True, blank=True)
    technical_score = models.IntegerField(null=True, blank=True)
    communication_score = models.IntegerField(null=True, blank=True)
    confidence_trend = models.CharField(max_length=20, blank=True, null=True)
    ai_suggestions = models.JSONField(default=list, blank=True)
    verdict = models.CharField(max_length=500, blank=True, null=True)  # Groq's one-line hiring verdict

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return f"{self.user.email} - {self.job_role} ({self.mode})"


class InterviewQuestion(models.Model):
    session = models.ForeignKey(InterviewSession, on_delete=models.CASCADE, related_name='questions')
    order = models.IntegerField()
    question_text = models.TextField()
    category = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"Q{self.order}: {self.question_text[:50]}"


class InterviewAnswer(models.Model):
    """
    Stores candidate's answer + AI evaluation for that answer.

    - Text mode: answer_text filled directly by user typing.
    - Audio mode: answer_text = Web Speech API transcript; audio_file = raw recording (optional).
    - Video mode: answer_text = transcript from recorded video's audio track; video_file = recording.

    Regardless of mode, evaluation always goes through the SAME
    groq_service.evaluate_answer(question, answer_text, role) call.
    """
    question = models.OneToOneField(InterviewQuestion, on_delete=models.CASCADE, related_name='answer')
    answer_text = models.TextField()

    # Phase 2 fields (audio/video) -- already modeled now so no migration surprises later
    audio_file = models.FileField(upload_to='interview_audio/', blank=True, null=True)
    video_file = models.FileField(upload_to='interview_video/', blank=True, null=True)
    speaking_time_seconds = models.IntegerField(blank=True, null=True)

    answered_at = models.DateTimeField(auto_now_add=True)

    # AI evaluation (from GroqService.evaluate_answer)
    technical_knowledge = models.IntegerField(default=0)
    communication = models.IntegerField(default=0)
    grammar = models.IntegerField(default=0)
    confidence = models.IntegerField(default=0)
    problem_solving = models.IntegerField(default=0)
    overall_score = models.IntegerField(default=0)
    strengths = models.JSONField(default=list, blank=True)
    improvements = models.JSONField(default=list, blank=True)
    ideal_answer_summary = models.TextField(blank=True, null=True)  # AI hint for the ideal answer

    def __str__(self):
        return f"Answer to {self.question}"
