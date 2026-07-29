from rest_framework import serializers
from .models import InterviewSession, InterviewQuestion, InterviewAnswer


class StartInterviewSerializer(serializers.Serializer):
    job_role = serializers.CharField(max_length=100)
    difficulty = serializers.ChoiceField(choices=InterviewSession.DIFFICULTY_CHOICES)
    mode = serializers.ChoiceField(choices=InterviewSession.MODE_CHOICES, default='text')
    question_count = serializers.IntegerField(default=5, min_value=1, max_value=15)


class SubmitAnswerSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    answer_text = serializers.CharField()
    speaking_time_seconds = serializers.IntegerField(required=False, allow_null=True)


class InterviewAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterviewAnswer
        fields = [
            'id', 'answer_text', 'speaking_time_seconds', 'answered_at',
            'technical_knowledge', 'communication', 'grammar', 'confidence',
            'problem_solving', 'overall_score', 'strengths', 'improvements',
            'ideal_answer_summary',
        ]


class InterviewQuestionSerializer(serializers.ModelSerializer):
    answer = InterviewAnswerSerializer(read_only=True)

    class Meta:
        model = InterviewQuestion
        fields = ['id', 'order', 'question_text', 'category', 'answer']


class InterviewSessionSerializer(serializers.ModelSerializer):
    questions = InterviewQuestionSerializer(many=True, read_only=True)

    class Meta:
        model = InterviewSession
        fields = [
            'id', 'job_role', 'difficulty', 'mode', 'status',
            'started_at', 'completed_at', 'overall_score', 'technical_score',
            'communication_score', 'confidence_trend', 'ai_suggestions', 'verdict', 'questions',
        ]
