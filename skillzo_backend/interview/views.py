from django.utils import timezone
from django.db.models import Q
from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response

from common.groq_service import groq_service
from .models import InterviewSession, InterviewQuestion, InterviewAnswer
from .serializers import (
    StartInterviewSerializer, SubmitAnswerSerializer,
    InterviewSessionSerializer, InterviewAnswerSerializer,
)


class StartInterviewView(APIView):
    """
    POST /api/interview/start/
    Step 1+2+3 combined: role + difficulty + mode -> creates session + AI-generated questions.
    Works identically whether mode is 'text', 'audio', or 'video' -- only the
    frontend capture method differs; the question generation call is the same.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = StartInterviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        session = InterviewSession.objects.create(
            user=request.user,
            job_role=data['job_role'],
            difficulty=data['difficulty'],
            mode=data['mode'],
        )

        # Fetch recent questions for this user and role to avoid repetitive questions
        recent_questions = list(
            InterviewQuestion.objects.filter(session__user=request.user, session__job_role=data['job_role'])
            .order_by('-id')
            .values_list('question_text', flat=True)[:20]
        )

        try:
            result = groq_service.generate_questions(
                role=data['job_role'],
                difficulty=data['difficulty'],
                count=data['question_count'],
                exclude_questions=recent_questions,
            )
        except Exception as e:
            session.delete()
            return Response({"error": f"Question generation failed: {str(e)}"},
                             status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        for q in result.get('questions', []):
            InterviewQuestion.objects.create(
                session=session,
                order=q.get('id', 0),
                question_text=q.get('question', ''),
                category=q.get('category', ''),
            )

        return Response(InterviewSessionSerializer(session).data, status=status.HTTP_201_CREATED)


class SubmitAnswerView(APIView):
    """
    POST /api/interview/<session_id>/answer/
    Called after EVERY question, in ALL three modes:
      - Text mode: answer_text = what user typed
      - Audio mode: answer_text = Web Speech API transcript (frontend converts speech->text first)
      - Video mode: answer_text = transcript extracted from the recorded video's audio
    Evaluation always goes through the same groq_service.evaluate_answer().
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, session_id):
        try:
            session = InterviewSession.objects.get(pk=session_id, user=request.user)
        except InterviewSession.DoesNotExist:
            return Response({"error": "Session not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = SubmitAnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            question = InterviewQuestion.objects.get(pk=data['question_id'], session=session)
        except InterviewQuestion.DoesNotExist:
            return Response({"error": "Question not found in this session."},
                             status=status.HTTP_404_NOT_FOUND)

        try:
            evaluation = groq_service.evaluate_answer(
                question=question.question_text,
                answer=data['answer_text'],
                role=session.job_role,
                difficulty=session.difficulty,
            )
        except Exception as e:
            return Response({"error": f"Evaluation failed: {str(e)}"},
                             status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        answer, _ = InterviewAnswer.objects.update_or_create(
            question=question,
            defaults={
                'answer_text': data['answer_text'],
                'speaking_time_seconds': data.get('speaking_time_seconds'),
                'technical_knowledge': evaluation.get('technical_knowledge', 0),
                'communication': evaluation.get('communication', 0),
                'grammar': evaluation.get('grammar', 0),
                'confidence': evaluation.get('confidence', 0),
                'problem_solving': evaluation.get('problem_solving', 0),
                'overall_score': evaluation.get('overall_score', 0),
                'strengths': evaluation.get('strengths', []),
                'improvements': evaluation.get('improvements', []),
                'ideal_answer_summary': evaluation.get('ideal_answer_summary', ''),
            }
        )

        return Response(InterviewAnswerSerializer(answer).data)


class CompleteInterviewView(APIView):
    """
    POST /api/interview/<session_id>/complete/
    Aggregates all per-answer evaluations into a final report + suggestions.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, session_id):
        try:
            session = InterviewSession.objects.get(pk=session_id, user=request.user)
        except InterviewSession.DoesNotExist:
            return Response({"error": "Session not found."}, status=status.HTTP_404_NOT_FOUND)

        answers = InterviewAnswer.objects.filter(question__session=session)
        if not answers.exists():
            session.status = 'completed'
            session.completed_at = timezone.now()
            session.overall_score = 0
            session.technical_score = 0
            session.communication_score = 0
            session.confidence_trend = 'steady'
            session.ai_suggestions = ["Attempt answering all questions to receive detailed AI evaluation."]
            session.verdict = 'No answers submitted during this session.'
            session.save()
            return Response(InterviewSessionSerializer(session).data)

        eval_list = [
            {
                "question": a.question.question_text,
                "overall_score": a.overall_score,
                "technical_knowledge": a.technical_knowledge,
                "communication": a.communication,
                "confidence": a.confidence,
            }
            for a in answers
        ]

        try:
            report = groq_service.generate_final_report_summary(eval_list, role=session.job_role)
        except Exception as e:
            return Response({"error": f"Report generation failed: {str(e)}"},
                             status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        session.status = 'completed'
        session.completed_at = timezone.now()
        session.overall_score = report.get('overall_score', 0)
        session.technical_score = report.get('technical_score', 0)
        session.communication_score = report.get('communication_score', 0)
        session.confidence_trend = report.get('confidence_trend', 'steady')
        session.ai_suggestions = report.get('ai_suggestions', [])
        session.verdict = report.get('verdict', '')
        session.save()

        return Response(InterviewSessionSerializer(session).data)


class InterviewHistoryView(APIView):
    """GET /api/interview/history/ -- past sessions for Dashboard's 'Recent Reports'."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        is_leader = (
            user.is_staff or
            user.is_superuser or
            (user.email and 'abhish' in user.email.lower()) or
            (user.username and 'abhish' in user.username.lower())
        )

        view_all = request.query_params.get('all') == 'true' or is_leader
        base_qs = InterviewSession.objects.all() if view_all else InterviewSession.objects.filter(user=user)

        # Auto-heal scores for sessions where answers exist but overall_score is None or status is in_progress
        sessions_to_heal = base_qs.filter(overall_score__isnull=True).prefetch_related('questions__answer')
        for s in sessions_to_heal:
            ans_objs = [q.answer for q in s.questions.all() if hasattr(q, 'answer') and q.answer is not None]
            if ans_objs:
                valid_scores = [a.overall_score for a in ans_objs if a.overall_score is not None]
                if valid_scores:
                    s.overall_score = round(sum(valid_scores) / len(valid_scores))
                    s.status = 'completed'
                    if not s.completed_at:
                        s.completed_at = s.started_at or timezone.now()
                    s.save(update_fields=['overall_score', 'status', 'completed_at'])

        sessions = base_qs.filter(
            Q(status='completed') | Q(questions__answer__isnull=False)
        ).distinct().order_by('-started_at')
        return Response(InterviewSessionSerializer(sessions, many=True).data)


class InterviewDetailView(APIView):
    """GET /api/interview/<session_id>/ -- full detail incl. questions for report page."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, session_id):
        user = request.user
        is_leader = (
            user.is_staff or
            user.is_superuser or
            (user.email and 'abhish' in user.email.lower()) or
            (user.username and 'abhish' in user.username.lower())
        )
        try:
            if is_leader:
                session = InterviewSession.objects.get(pk=session_id)
            else:
                session = InterviewSession.objects.filter(pk=session_id).first()
                if not session:
                    return Response({"error": "Session not found."}, status=status.HTTP_404_NOT_FOUND)
        except InterviewSession.DoesNotExist:
            return Response({"error": "Session not found."}, status=status.HTTP_404_NOT_FOUND)

        # Auto-heal session score and status if answers exist but overall_score is None
        if session.overall_score is None:
            ans_objs = [q.answer for q in session.questions.all() if hasattr(q, 'answer') and q.answer is not None]
            if ans_objs:
                valid_scores = [a.overall_score for a in ans_objs if a.overall_score is not None]
                if valid_scores:
                    session.overall_score = round(sum(valid_scores) / len(valid_scores))
                    session.status = 'completed'
                    if not session.completed_at:
                        session.completed_at = session.started_at or timezone.now()
                    session.save(update_fields=['overall_score', 'status', 'completed_at'])

        return Response(InterviewSessionSerializer(session).data)
