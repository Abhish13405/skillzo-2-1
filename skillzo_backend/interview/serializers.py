from rest_framework import serializers
from .models import InterviewSession, InterviewQuestion, InterviewAnswer


class StartInterviewSerializer(serializers.Serializer):
    job_role = serializers.CharField(max_length=100)
    difficulty = serializers.ChoiceField(choices=InterviewSession.DIFFICULTY_CHOICES)
    mode = serializers.ChoiceField(choices=InterviewSession.MODE_CHOICES, default='text')
    question_count = serializers.IntegerField(default=10, min_value=1, max_value=25)
    resume_id = serializers.IntegerField(required=False, allow_null=True)
    language = serializers.CharField(max_length=20, default='en', required=False)
    guest_count = serializers.IntegerField(required=False, default=0)


class SubmitAnswerSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    answer_text = serializers.CharField()
    speaking_time_seconds = serializers.IntegerField(required=False, allow_null=True)
    video_file = serializers.FileField(required=False, allow_null=True)
    audio_file = serializers.FileField(required=False, allow_null=True)


class InterviewAnswerSerializer(serializers.ModelSerializer):
    video_url = serializers.SerializerMethodField()
    audio_url = serializers.SerializerMethodField()

    class Meta:
        model = InterviewAnswer
        fields = [
            'id', 'answer_text', 'speaking_time_seconds', 'answered_at',
            'technical_knowledge', 'communication', 'grammar', 'confidence',
            'problem_solving', 'overall_score', 'strengths', 'improvements',
            'ideal_answer_summary', 'video_file', 'audio_file', 'cloud_video_url', 'cloud_audio_url', 'video_url', 'audio_url',
        ]

    def get_video_url(self, obj):
        if obj.cloud_video_url:
            return obj.cloud_video_url
        if obj.video_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.video_file.url)
            return obj.video_file.url
        return None

    def get_audio_url(self, obj):
        if obj.cloud_audio_url:
            return obj.cloud_audio_url
        if obj.audio_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.audio_file.url)
            return obj.audio_file.url
        return None


class InterviewQuestionSerializer(serializers.ModelSerializer):
    answer = InterviewAnswerSerializer(read_only=True)

    class Meta:
        model = InterviewQuestion
        fields = ['id', 'order', 'question_text', 'category', 'answer']


class InterviewSessionSerializer(serializers.ModelSerializer):
    questions = InterviewQuestionSerializer(many=True, read_only=True)
    candidate_name = serializers.CharField(source='user.username', read_only=True, default='')
    candidate_email = serializers.CharField(source='user.email', read_only=True, default='')
    candidate_badges = serializers.JSONField(source='user.earned_badges', read_only=True, default=list)

    class Meta:
        model = InterviewSession
        fields = [
            'id', 'job_role', 'difficulty', 'mode', 'status',
            'started_at', 'completed_at', 'overall_score', 'technical_score',
            'communication_score', 'confidence_trend', 'ai_suggestions', 'verdict',
            'bonus_credited', 'questions', 'candidate_name', 'candidate_email',
            'candidate_badges', 'resume',
        ]
