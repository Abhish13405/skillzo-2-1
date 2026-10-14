from django.utils import timezone
from django.db.models import Q
from rest_framework import permissions, status, parsers
from rest_framework.views import APIView
from rest_framework.response import Response

from common.groq_service import groq_service
from common.cloud_storage import upload_media_to_cloud
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

        return Response(InterviewSessionSerializer(session, context={'request': request}).data, status=status.HTTP_201_CREATED)


class SubmitAnswerView(APIView):
    """
    POST /api/interview/<session_id>/answer/
    Called after EVERY question, in ALL three modes:
      - Text mode: answer_text = what user typed
      - Audio mode: answer_text = Web Speech API transcript + raw audio_file
      - Video mode: answer_text = transcript + candidate's recorded video_file
    Saves the media file directly to disk and evaluates answer via Groq.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

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

        defaults = {
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

        # Save video or audio recording file if attached in multipart request
        uploaded_video = request.FILES.get('video_file') or data.get('video_file')
        if uploaded_video:
            defaults['video_file'] = uploaded_video
            cloud_url = upload_media_to_cloud(uploaded_video, resource_type='video')
            if cloud_url:
                defaults['cloud_video_url'] = cloud_url

        uploaded_audio = request.FILES.get('audio_file') or data.get('audio_file')
        if uploaded_audio:
            defaults['audio_file'] = uploaded_audio
            cloud_url = upload_media_to_cloud(uploaded_audio, resource_type='video')
            if cloud_url:
                defaults['cloud_audio_url'] = cloud_url

        answer, _ = InterviewAnswer.objects.update_or_create(
            question=question,
            defaults=defaults,
        )

        return Response(InterviewAnswerSerializer(answer, context={'request': request}).data)


class UploadRecordingView(APIView):
    """
    POST /api/interview/<session_id>/upload-recording/
    Asynchronous multipart endpoint to attach or update video/audio file for a question.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def post(self, request, session_id):
        try:
            session = InterviewSession.objects.get(pk=session_id, user=request.user)
        except InterviewSession.DoesNotExist:
            return Response({"error": "Session not found."}, status=status.HTTP_404_NOT_FOUND)

        question_id = request.data.get('question_id')
        question = None
        if question_id:
            try:
                question = InterviewQuestion.objects.get(pk=question_id, session=session)
            except (InterviewQuestion.DoesNotExist, ValueError):
                pass

        if not question:
            order = request.data.get('order') or request.data.get('question_number') or request.data.get('questionNumber')
            if order:
                try:
                    question = InterviewQuestion.objects.filter(session=session, order=int(order)).first()
                except (ValueError, TypeError):
                    pass

        if not question:
            question = InterviewQuestion.objects.filter(session=session).order_by('order').first()

        if not question:
            return Response({"error": "No question found for this interview session."}, status=status.HTTP_404_NOT_FOUND)

        answer, _ = InterviewAnswer.objects.get_or_create(
            question=question,
            defaults={'answer_text': 'Verbal answer submitted.'}
        )

        file_obj = (
            request.FILES.get('video_file') or
            request.FILES.get('audio_file') or
            request.FILES.get('file') or
            request.FILES.get('blob')
        )
        mode = request.data.get('mode', '').lower()

        uploaded_cloud_url = None
        if file_obj:
            content_type = getattr(file_obj, 'content_type', '').lower()
            is_audio = ('audio' in content_type) or (mode == 'audio')
            if is_audio:
                answer.audio_file = file_obj
                uploaded_cloud_url = upload_media_to_cloud(file_obj, resource_type='video')
                if uploaded_cloud_url:
                    answer.cloud_audio_url = uploaded_cloud_url
            else:
                answer.video_file = file_obj
                uploaded_cloud_url = upload_media_to_cloud(file_obj, resource_type='video')
                if uploaded_cloud_url:
                    answer.cloud_video_url = uploaded_cloud_url

        if request.data.get('speaking_time_seconds'):
            try:
                answer.speaking_time_seconds = int(request.data.get('speaking_time_seconds'))
            except (ValueError, TypeError):
                pass

        answer.save()
        resp_data = InterviewAnswerSerializer(answer, context={'request': request}).data
        resp_data['cloud_url'] = uploaded_cloud_url or answer.cloud_video_url or answer.cloud_audio_url
        return Response(resp_data)


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

        return Response(InterviewSessionSerializer(session, context={'request': request}).data)


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
        return Response(InterviewSessionSerializer(sessions, many=True, context={'request': request}).data)


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

        return Response(InterviewSessionSerializer(session, context={'request': request}).data)
