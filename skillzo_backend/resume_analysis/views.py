from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response

from common.groq_service import groq_service
from .models import Resume
from .serializers import ResumeSerializer
from .services import extract_text_from_resume


class ResumeListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/resume/          -> list this user's resumes
    POST /api/resume/          -> upload a new resume (PDF/DOCX)
    """
    serializer_class = ResumeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Resume.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ResumeAnalyzeView(APIView):
    """POST /api/resume/<id>/analyze/ -- runs Groq analysis on an uploaded resume."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            resume = Resume.objects.get(pk=pk, user=request.user)
        except Resume.DoesNotExist:
            return Response({"error": "Resume not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            resume_text = extract_text_from_resume(resume.file)
            analysis = groq_service.analyze_resume(resume_text)
        except Exception as e:
            return Response({"error": f"Analysis failed: {str(e)}"},
                             status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        resume.extracted_skills = analysis.get('extracted_skills', [])
        resume.ats_score = analysis.get('ats_score', 0)
        resume.feedback = analysis.get('feedback', [])
        resume.suggested_job_roles = analysis.get('suggested_job_roles', [])
        resume.missing_keywords = analysis.get('missing_keywords', [])
        resume.is_analyzed = True
        resume.save()

        return Response(ResumeSerializer(resume).data)
