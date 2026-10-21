from django.db import models
from django.conf import settings
from django.utils.text import slugify
import secrets


class Company(models.Model):
    name = models.CharField(max_length=150, unique=True)
    slug = models.SlugField(max_length=160, unique=True, blank=True)
    logo = models.ImageField(upload_to='company_logos/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Companies'
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class LeaderProfile(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('viewer', 'Viewer'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='leader_profile'
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='leaders'
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='viewer')
    is_active = models.BooleanField(default=True)
    is_owner = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-is_owner', 'role', 'user__username']

    def __str__(self):
        return f"{self.user.email} - {self.company.name} ({self.role})"


class CompanyCandidate(models.Model):
    STATUS_CHOICES = [
        ('new', 'New'),
        ('shortlisted', 'Shortlisted'),
        ('hold', 'On Hold'),
        ('rejected', 'Rejected'),
    ]

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='candidates'
    )
    candidate = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='company_enrollments'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    remark = models.TextField(blank=True, default='')
    target_role = models.CharField(max_length=100, blank=True, default='')
    shares_with_company = models.BooleanField(
        default=True,
        help_text="Consent: candidate grants permission for company leaders to view full AI interview reports & video recordings."
    )
    version = models.IntegerField(default=1, help_text="Optimistic concurrency locking counter")
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('company', 'candidate')
        indexes = [
            models.Index(fields=['company', 'status']),
            models.Index(fields=['company', 'created_at']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.candidate.email} @ {self.company.name} [{self.status}]"


class LiveInterviewInvite(models.Model):
    STATUS_CHOICES = [
        ('Created', 'Created'),
        ('Sent', 'Sent'),
        ('Opened', 'Opened'),
        ('Joined', 'Joined'),
        ('Expired', 'Expired'),
        ('Cancelled', 'Cancelled'),
    ]
    SENT_VIA_CHOICES = [
        ('email', 'Email'),
        ('whatsapp', 'WhatsApp'),
        ('both', 'Both'),
    ]

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='invites'
    )
    candidate = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='interview_invites'
    )
    scheduled_at = models.DateTimeField()
    token = models.CharField(max_length=64, unique=True, db_index=True)
    expires_at = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Created')
    sent_via = models.CharField(max_length=20, choices=SENT_VIA_CHOICES, default='both')
    last_sent_at = models.DateTimeField(null=True, blank=True)
    message = models.TextField(blank=True, default='')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_invites'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['company', 'scheduled_at']),
        ]
        ordering = ['-scheduled_at']

    @classmethod
    def generate_token(cls):
        return secrets.token_urlsafe(32)

    def __str__(self):
        return f"Invite for {self.candidate.email} by {self.company.name} ({self.status})"


class AuditLog(models.Model):
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='audit_logs'
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='actor_audit_logs'
    )
    candidate = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='candidate_audit_logs'
    )
    action = models.CharField(max_length=100)
    old_value = models.TextField(blank=True, default='')
    new_value = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if self.pk is not None:
            raise PermissionError("AuditLog records are strictly immutable and cannot be updated.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise PermissionError("AuditLog records are strictly immutable and cannot be deleted.")

    def __str__(self):
        actor_name = self.actor.email if self.actor else "System"
        cand_name = self.candidate.email if self.candidate else "—"
        return f"[{self.created_at.strftime('%Y-%m-%d %H:%M')}] {actor_name} -> {self.action} on {cand_name}"
