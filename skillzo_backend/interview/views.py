import logging
from django.utils import timezone
from django.db.models import Q
from rest_framework import permissions, status, parsers
from rest_framework.views import APIView
from rest_framework.response import Response

logger = logging.getLogger(__name__)

from common.groq_service import groq_service
from common.cloud_storage import upload_media_to_cloud
from .models import InterviewSession, InterviewQuestion, InterviewAnswer
from .serializers import (
    StartInterviewSerializer, SubmitAnswerSerializer,
    InterviewSessionSerializer, InterviewAnswerSerializer,
)

def evaluate_and_reward_session(session, user):
    """
    Candidate Reward System:
    If session.overall_score >= 80 AND at least one answer in this session has
    cloud_video_url or cloud_audio_url:
    - Awards '🌟 Star Performer' and '☁️ Cloud Verified' badges to user.earned_badges.
    - If session.bonus_credited is False, awards +1 free interview credit (bonus_interviews += 1)
      and marks session.bonus_credited = True.
    """
    if not session or not user or not user.is_authenticated:
        return None

    # Check for cloud recording in any answer of this session
    has_cloud_recording = InterviewAnswer.objects.filter(
        question__session=session
    ).filter(
        (Q(cloud_video_url__isnull=False) & ~Q(cloud_video_url='')) |
        (Q(cloud_audio_url__isnull=False) & ~Q(cloud_audio_url=''))
    ).exists()

    overall_score = session.overall_score or 0
    if overall_score >= 80 and has_cloud_recording:
        badges = list(getattr(user, 'earned_badges', []) or [])
        badge_added = False
        if '🌟 Star Performer' not in badges:
            badges.append('🌟 Star Performer')
            badge_added = True
        if '☁️ Cloud Verified' not in badges:
            badges.append('☁️ Cloud Verified')
            badge_added = True

        bonus_awarded = False
        if not getattr(session, 'bonus_credited', False):
            user.bonus_interviews = (getattr(user, 'bonus_interviews', 0) or 0) + 1
            session.bonus_credited = True
            session.save(update_fields=['bonus_credited'])
            bonus_awarded = True

        if badge_added or bonus_awarded:
            user.earned_badges = badges
            user.save(update_fields=['bonus_interviews', 'earned_badges'])

        return {
            'reward_unlocked': True,
            'bonus_awarded': bonus_awarded,
            'total_bonus_interviews': user.bonus_interviews,
            'earned_badges': badges,
            'message': '🎉 Star Performer Badge Unlocked! +1 Free Interview Credited to your account.'
        }
    return None



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

        resume_id = data.get('resume_id')
        resume = None
        if resume_id:
            try:
                from resume_analysis.models import Resume
                resume = Resume.objects.get(pk=resume_id, user=request.user)
            except Resume.DoesNotExist:
                return Response(
                    {"error": "The specified resume was not found or does not belong to you."},
                    status=status.HTTP_404_NOT_FOUND
                )

        # ─── QUOTA & SUBSCRIPTION ENFORCEMENT ───
        is_guest = (
            request.user.email == 'guest@skillzo.ai' or
            request.data.get('is_guest') is True or
            request.headers.get('X-Is-Guest') == 'true' or
            getattr(request.user, 'is_guest', False)
        )
        guest_count = int(request.data.get('guest_count') or request.headers.get('X-Guest-Count') or 0)

        if is_guest:
            if guest_count >= 5:
                return Response(
                    {
                        'error': 'GUEST_LIMIT_REACHED',
                        'message': 'Guest interview limit reached (5/5). Sign up with your personal email to get 10 free interviews + earn bonus credits, or purchase a Pro subscription!',
                        'requires_auth': True,
                        'requires_subscription': True,
                        'limit': 5,
                        'completed': guest_count,
                        'is_guest': True,
                    },
                    status=status.HTTP_403_FORBIDDEN
                )
        else:
            is_leader = (
                request.user.is_staff or
                request.user.is_superuser or
                (request.user.email and request.user.email.lower() in [
                    'abhishekkushwaha13405@gmail.com', 'abhish@gmail.com', 'abhishekkushwaha31387@bbdu.ac.in'
                ])
            )
            is_subscribed = bool(getattr(request.user, 'is_subscribed', False))

            if not is_leader and not is_subscribed:
                completed_count = InterviewSession.objects.filter(user=request.user, status='completed').count()
                bonus = getattr(request.user, 'bonus_interviews', 0) or 0
                total_allowed = 10 + bonus
                if completed_count >= total_allowed:
                    return Response(
                        {
                            'error': 'LIMIT_REACHED',
                            'message': f'Free interview limit reached ({completed_count}/{total_allowed}). Upgrade to Skillzo Pro for unlimited practice, or score >= 80% on cloud verified interviews to earn bonus credits!',
                            'requires_subscription': True,
                            'limit': total_allowed,
                            'completed': completed_count,
                            'bonus_interviews': bonus,
                            'is_subscribed': False,
                        },
                        status=status.HTTP_403_FORBIDDEN
                    )

        session = InterviewSession.objects.create(
            resume=resume,
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
            if resume:
                from resume_analysis.services import extract_text_from_resume
                resume_text = ""
                try:
                    resume_text = extract_text_from_resume(resume.file)
                except Exception as ext_err:
                    logger.warning(f"Failed to extract resume text for interview: {ext_err}")
                    resume_text = ", ".join(resume.extracted_skills or [])

                result = groq_service.generate_resume_questions(
                    resume_text=resume_text,
                    role=data['job_role'],
                    difficulty=data['difficulty'],
                    count=data['question_count'],
                    skills=resume.extracted_skills or [],
                    exclude_questions=recent_questions,
                    language=data.get('language', 'en'),
                )
            else:
                result = groq_service.generate_questions(
                    role=data['job_role'],
                    difficulty=data['difficulty'],
                    count=data['question_count'],
                    exclude_questions=recent_questions,
                    language=data.get('language', 'en'),
                )
        except Exception as e:
            session.delete()
            return Response({"error": f"Question generation failed: {str(e)}"},
                             status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        generated_questions = result.get('questions', [])
        if not resume and generated_questions:
            role_lower = (data.get('job_role') or '').lower()
            is_hr_role = any(k in role_lower for k in ['hr', 'behavioral', 'placement', 'culture', 'leadership'])
            if is_hr_role:
                if 'introduce' not in generated_questions[0].get('question', '').lower():
                    generated_questions[0]['question'] = "Welcome! Please introduce yourself, walk me through your background, and tell me what excites you about this role."
                    generated_questions[0]['category'] = "Introduction"
            else:
                if 'introduce' not in generated_questions[0].get('question', '').lower():
                    generated_questions[0]['question'] = "Introduce yourself."
                    generated_questions[0]['category'] = "Introduction"

        for q in generated_questions:
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
        reward_info = evaluate_and_reward_session(session, request.user)
        resp_data = InterviewAnswerSerializer(answer, context={'request': request}).data
        resp_data['cloud_url'] = uploaded_cloud_url or answer.cloud_video_url or answer.cloud_audio_url
        if reward_info:
            resp_data['reward_info'] = reward_info
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
            logger.warning(f"Groq final report failed, using aggregate fallback: {e}")
            valid_scores = [a.overall_score for a in answers if a.overall_score is not None]
            tech_scores = [a.technical_knowledge for a in answers if a.technical_knowledge is not None]
            comm_scores = [a.communication for a in answers if a.communication is not None]
            avg_overall = round(sum(valid_scores) / len(valid_scores)) if valid_scores else 65
            avg_tech = round(sum(tech_scores) / len(tech_scores)) if tech_scores else 65
            avg_comm = round(sum(comm_scores) / len(comm_scores)) if comm_scores else 65
            report = {
                "overall_score": avg_overall,
                "technical_score": avg_tech,
                "communication_score": avg_comm,
                "confidence_trend": "steady",
                "ai_suggestions": [
                    "Continue practicing with structured explanations to improve communication clarity.",
                    "Highlight practical tools, methodologies, and quantified results in your answers.",
                    "Demonstrate proactive problem-solving frameworks like STAR when answering behavioral questions.",
                ],
                "verdict": "Candidate demonstrated relevant domain knowledge and positive interview engagement." if avg_overall >= 60 else "Requires further hands-on practice and conceptual clarity."
            }

        session.status = 'completed'
        session.completed_at = timezone.now()
        session.overall_score = report.get('overall_score', 0)
        session.technical_score = report.get('technical_score', 0)
        session.communication_score = report.get('communication_score', 0)
        session.confidence_trend = report.get('confidence_trend', 'steady')
        session.ai_suggestions = report.get('ai_suggestions', [])
        session.verdict = report.get('verdict', '')
        session.save()

        reward_info = evaluate_and_reward_session(session, request.user)
        resp_data = InterviewSessionSerializer(session, context={'request': request}).data
        if reward_info:
            resp_data['reward_info'] = reward_info
        return Response(resp_data)


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
        ).select_related('user').prefetch_related('questions__answer').distinct().order_by('-started_at')
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
            qs = InterviewSession.objects.select_related('user').prefetch_related('questions__answer')
            if is_leader:
                session = qs.get(pk=session_id)
            else:
                session = qs.filter(pk=session_id).first()
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

        # Guarantee Question 1 is always 'Introduce yourself.' for in-progress sessions
        if session.status == 'in_progress':
            first_q = session.questions.order_by('order').first()
            if first_q and first_q.order == 1 and first_q.question_text != 'Introduce yourself.':
                first_q.question_text = 'Introduce yourself.'
                first_q.category = 'Introduction'
                first_q.save(update_fields=['question_text', 'category'])

        return Response(InterviewSessionSerializer(session, context={'request': request}).data)


class SubmitLiveEvaluationView(APIView):
    """
    POST /api/interview/live-evaluation/
    Interviewer HR submits real-time live evaluation for a candidate.
    Creates a completed session so candidate and leader dashboard reflect it immediately.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        candidate_id = request.data.get('candidate_id')
        job_role = request.data.get('job_role', 'Live 1:1 HR Interview')
        try:
            tech_score = int(request.data.get('technical_score', 80))
        except (ValueError, TypeError):
            tech_score = 80
        try:
            comm_score = int(request.data.get('communication_score', 80))
        except (ValueError, TypeError):
            comm_score = 80
        try:
            fit_score = int(request.data.get('cultural_fit_score', 80))
        except (ValueError, TypeError):
            fit_score = 80

        overall = round((tech_score + comm_score + fit_score) / 3)
        verdict = request.data.get('verdict', 'Hire')
        notes = (request.data.get('notes') or '').strip()

        from django.contrib.auth import get_user_model
        UserModel = get_user_model()
        candidate = None
        if candidate_id:
            try:
                candidate = UserModel.objects.get(pk=candidate_id)
            except UserModel.DoesNotExist:
                candidate = None
        if not candidate:
            candidate = request.user

        session = InterviewSession.objects.create(
            user=candidate,
            job_role=job_role,
            difficulty='Intermediate',
            mode='video',
            status='completed',
            completed_at=timezone.now(),
            overall_score=overall,
            technical_score=tech_score,
            communication_score=comm_score,
            verdict=f"Live HR Evaluation [{verdict}]: {notes}" if notes else f"Live HR Evaluation [{verdict}]",
            ai_suggestions=[
                f"HR Evaluator: {request.user.username}",
                f"Technical Depth: {tech_score}/100",
                f"Communication: {comm_score}/100",
                f"Cultural Fit: {fit_score}/100",
                f"Hiring Verdict: {verdict}",
            ]
        )
        return Response({"success": True, "session_id": session.id, "overall_score": overall})


class InterviewQuotaView(APIView):
    """
    GET /api/interview/quota/
    Returns quota details for current user or guest.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        is_guest = (
            user.email == 'guest@skillzo.ai' or
            request.query_params.get('is_guest') == 'true' or
            request.headers.get('X-Is-Guest') == 'true'
        )
        if is_guest:
            guest_count = int(request.query_params.get('guest_count') or 0)
            return Response({
                'is_guest': True,
                'is_unlimited': False,
                'limit': 5,
                'completed': guest_count,
                'remaining': max(0, 5 - guest_count),
                'can_interview': guest_count < 5,
                'bonus_interviews': 0,
                'earned_badges': [],
                'is_subscribed': False,
                'plan': 'guest',
            })

        is_leader = (
            user.is_staff or
            user.is_superuser or
            (user.email and user.email.lower() in [
                'abhishekkushwaha13405@gmail.com', 'abhish@gmail.com', 'abhishekkushwaha31387@bbdu.ac.in'
            ])
        )
        completed_count = InterviewSession.objects.filter(user=user, status='completed').count()

        if is_leader or getattr(user, 'is_subscribed', False):
            return Response({
                'is_guest': False,
                'is_unlimited': True,
                'limit': 9999,
                'completed': completed_count,
                'remaining': 'Unlimited',
                'can_interview': True,
                'bonus_interviews': getattr(user, 'bonus_interviews', 0) or 0,
                'earned_badges': getattr(user, 'earned_badges', []) or [],
                'is_subscribed': bool(getattr(user, 'is_subscribed', False)),
                'plan': 'Pro Unlimited' if getattr(user, 'is_subscribed', False) else 'Leader Unlimited',
            })

        bonus = getattr(user, 'bonus_interviews', 0) or 0
        total_limit = 10 + bonus
        remaining = max(0, total_limit - completed_count)
        return Response({
            'is_guest': False,
            'is_unlimited': False,
            'base_limit': 10,
            'bonus_interviews': bonus,
            'limit': total_limit,
            'completed': completed_count,
            'remaining': remaining,
            'can_interview': (remaining > 0),
            'earned_badges': getattr(user, 'earned_badges', []) or [],
            'is_subscribed': False,
            'plan': getattr(user, 'subscription_plan', 'free') or 'free',
        })


class SubscribePlanView(APIView):
    """
    POST /api/interview/subscribe/
    Upgrades user account to Skillzo Pro subscription.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        plan = request.data.get('plan', 'monthly_pro')
        user.is_subscribed = True
        user.subscription_plan = plan
        user.save(update_fields=['is_subscribed', 'subscription_plan'])

        return Response({
            'success': True,
            'message': 'Subscription activated successfully! You now have unlimited mock interviews.',
            'is_subscribed': True,
            'subscription_plan': plan,
        })
