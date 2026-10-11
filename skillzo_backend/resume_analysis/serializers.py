import os
from rest_framework import serializers
from .models import Resume


class ResumeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resume
        fields = [
            'id', 'file', 'uploaded_at', 'extracted_skills', 'ats_score',
            'feedback', 'suggested_job_roles', 'missing_keywords', 'is_analyzed',
        ]
        read_only_fields = [
            'id', 'uploaded_at', 'extracted_skills', 'ats_score',
            'feedback', 'suggested_job_roles', 'missing_keywords', 'is_analyzed',
        ]

    def validate_file(self, value):
        ext = os.path.splitext(value.name)[1].lower()
        if ext not in ('.pdf', '.docx'):
            raise serializers.ValidationError("Only PDF (.pdf) and Word (.docx) documents are supported.")
        if value.size > 25 * 1024 * 1024:
            raise serializers.ValidationError("File size exceeds the 25MB limit.")
        return value
