from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import Company, LeaderProfile, CompanyCandidate, LiveInterviewInvite, AuditLog

User = get_user_model()


class CompanyCandidateListSerializer(serializers.ModelSerializer):
    candidate_id = serializers.IntegerField(source='candidate.id', read_only=True)
    username = serializers.CharField(source='candidate.username', read_only=True)
    email = serializers.CharField(source='candidate.email', read_only=True)
    phone = serializers.CharField(source='candidate.phone', read_only=True)
    college_or_company = serializers.CharField(source='candidate.college_or_company', read_only=True)
    date_joined = serializers.DateTimeField(source='candidate.date_joined', format='%d %b %Y', read_only=True)
    
    interview_status = serializers.SerializerMethodField()
    interview_score = serializers.SerializerMethodField()
    interview_date = serializers.SerializerMethodField()
    interview_type = serializers.SerializerMethodField()
    latest_invite_status = serializers.SerializerMethodField()
    latest_invite_token = serializers.SerializerMethodField()

    class Meta:
        model = CompanyCandidate
        fields = [
            'id',
            'candidate_id',
            'username',
            'email',
            'phone',
            'college_or_company',
            'target_role',
            'status',
            'remark',
            'shares_with_company',
            'version',
            'date_joined',
            'interview_status',
            'interview_score',
            'interview_date',
            'interview_type',
            'latest_invite_status',
            'latest_invite_token',
            'created_at',
            'updated_at',
        ]

    def get_interview_status(self, obj):
        sessions = getattr(obj.candidate, '_prefetched_sessions', None)
        if sessions is not None:
            has_completed = any(s.status == 'completed' for s in sessions)
            return 'Completed' if has_completed else ('In Progress' if sessions else 'Not started')
        return 'Not started'

    def get_interview_score(self, obj):
        sessions = getattr(obj.candidate, '_prefetched_sessions', None)
        if sessions:
            scores = [s.overall_score for s in sessions if s.overall_score is not None]
            return round(sum(scores) / len(scores), 1) if scores else None
        return None

    def get_interview_date(self, obj):
        sessions = getattr(obj.candidate, '_prefetched_sessions', None)
        if sessions and len(sessions) > 0:
            return sessions[0].started_at.strftime('%d %b %Y')
        return None

    def get_interview_type(self, obj):
        sessions = getattr(obj.candidate, '_prefetched_sessions', None)
        if sessions and len(sessions) > 0:
            # If any session is a live HR session or completed
            return 'Real interview' if any(s.status == 'completed' for s in sessions) else 'Practice'
        return 'None'

    def get_latest_invite_status(self, obj):
        invites = getattr(obj.candidate, '_prefetched_invites', None)
        if invites and len(invites) > 0:
            return invites[0].status
        return None

    def get_latest_invite_token(self, obj):
        invites = getattr(obj.candidate, '_prefetched_invites', None)
        if invites and len(invites) > 0:
            return invites[0].token
        return None


class CandidateStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=CompanyCandidate.STATUS_CHOICES, required=False)
    remark = serializers.CharField(required=False, allow_blank=True)
    target_role = serializers.CharField(required=False, allow_blank=True, max_length=100)
    name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    phone = serializers.CharField(required=False, allow_blank=True, max_length=20)
    version = serializers.IntegerField(required=True)

    def validate_version(self, value):
        if value < 1:
            raise serializers.ValidationError("Invalid version counter.")
        return value


class CreateLiveInviteSerializer(serializers.Serializer):
    candidate_id = serializers.IntegerField(required=True)
    scheduled_at = serializers.DateTimeField(required=True)
    message = serializers.CharField(required=False, allow_blank=True)
    sent_via = serializers.ChoiceField(choices=LiveInterviewInvite.SENT_VIA_CHOICES, default='both')

    def validate_scheduled_at(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError("Scheduled time must be in the future.")
        return value


class LiveInterviewInviteSerializer(serializers.ModelSerializer):
    candidate_name = serializers.CharField(source='candidate.username', read_only=True)
    candidate_email = serializers.CharField(source='candidate.email', read_only=True)
    candidate_phone = serializers.CharField(source='candidate.phone', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = LiveInterviewInvite
        fields = [
            'id',
            'candidate_id',
            'candidate_name',
            'candidate_email',
            'candidate_phone',
            'scheduled_at',
            'token',
            'expires_at',
            'status',
            'sent_via',
            'last_sent_at',
            'message',
            'created_by_name',
            'created_at',
        ]
