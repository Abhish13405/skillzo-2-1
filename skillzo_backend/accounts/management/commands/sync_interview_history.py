import json
import os
from django.core.management.base import BaseCommand
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils.dateparse import parse_datetime

User = get_user_model()

class Command(BaseCommand):
    help = 'Safely sync historical interview sessions, reports, and accounts into database'

    def handle(self, *args, **options):
        current_dir = os.path.dirname(os.path.abspath(__file__))
        candidates = [
            os.path.join(settings.BASE_DIR, 'initial_prod_data.json'),
            os.path.abspath(os.path.join(current_dir, '..', '..', '..', 'initial_prod_data.json')),
            os.path.join(os.getcwd(), 'initial_prod_data.json'),
            os.path.join(os.getcwd(), 'skillzo_backend', 'initial_prod_data.json'),
        ]
        fixture_path = None
        for p in candidates:
            if os.path.exists(p):
                fixture_path = p
                break

        if not fixture_path:
            self.stdout.write(self.style.WARNING("initial_prod_data.json fixture file not found in candidates. Skipping sync."))
            return

        try:
            from interview.models import InterviewSession, InterviewQuestion, InterviewAnswer
            from resume_analysis.models import Resume
        except ImportError as e:
            self.stdout.write(self.style.ERROR(f"Could not import models: {e}"))
            return

        with open(fixture_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        user_map = {}       # local_pk -> User object
        session_map = {}    # local_pk -> InterviewSession object
        question_map = {}   # local_pk -> InterviewQuestion object

        # 1. Sync Users
        users_synced = 0
        for item in data:
            if item.get('model') == 'accounts.user':
                pk = item.get('pk')
                fields = item.get('fields', {})
                email = fields.get('email', '').strip().lower()
                username = fields.get('username', '').strip()

                user = User.objects.filter(email__iexact=email).first()
                if not user:
                    user = User.objects.filter(username__iexact=username).first()

                if not user:
                    user = User(
                        email=email,
                        username=username,
                        phone=fields.get('phone', ''),
                        college_or_company=fields.get('college_or_company', ''),
                        target_role=fields.get('target_role', ''),
                        bio=fields.get('bio', ''),
                        is_staff=fields.get('is_staff', False),
                        is_superuser=fields.get('is_superuser', False),
                        is_active=fields.get('is_active', True),
                        current_streak=fields.get('current_streak', 0),
                        longest_streak=fields.get('longest_streak', 0),
                    )
                    # Preserve original password hash from local development!
                    user.password = fields.get('password', '')
                    if fields.get('date_joined'):
                        dt = parse_datetime(fields.get('date_joined'))
                        if dt:
                            user.date_joined = dt
                    user.save()
                    users_synced += 1
                else:
                    updated = False
                    if not user.target_role and fields.get('target_role'):
                        user.target_role = fields.get('target_role')
                        updated = True
                    if not user.phone and fields.get('phone'):
                        user.phone = fields.get('phone')
                        updated = True
                    if updated:
                        user.save()

                user_map[pk] = user

        self.stdout.write(self.style.SUCCESS(f"Synced {users_synced} new users. Total user mapping: {len(user_map)}."))

        # 2. Sync Resumes
        resumes_synced = 0
        for item in data:
            if item.get('model') == 'resume_analysis.resume':
                fields = item.get('fields', {})
                user_pk = fields.get('user')
                user_obj = user_map.get(user_pk)
                if not user_obj:
                    continue

                uploaded_at = parse_datetime(fields.get('uploaded_at')) if fields.get('uploaded_at') else None
                exists = Resume.objects.filter(user=user_obj, ats_score=fields.get('ats_score')).exists()
                if not exists:
                    Resume.objects.create(
                        user=user_obj,
                        ats_score=fields.get('ats_score'),
                        extracted_skills=fields.get('extracted_skills', []),
                        suggested_job_roles=fields.get('suggested_job_roles', []),
                        missing_keywords=fields.get('missing_keywords', []),
                        feedback=fields.get('feedback', []),
                        is_analyzed=fields.get('is_analyzed', True),
                        uploaded_at=uploaded_at or None,
                    )
                    resumes_synced += 1

        self.stdout.write(self.style.SUCCESS(f"Synced {resumes_synced} historical resumes."))

        # 3. Sync Interview Sessions
        sessions_synced = 0
        for item in data:
            if item.get('model') == 'interview.interviewsession':
                pk = item.get('pk')
                fields = item.get('fields', {})
                user_pk = fields.get('user')
                user_obj = user_map.get(user_pk)
                if not user_obj:
                    continue

                started_at = parse_datetime(fields.get('started_at')) if fields.get('started_at') else None
                completed_at = parse_datetime(fields.get('completed_at')) if fields.get('completed_at') else None

                session = InterviewSession.objects.filter(user=user_obj, started_at=started_at).first()
                if not session:
                    session = InterviewSession.objects.create(
                        user=user_obj,
                        job_role=fields.get('job_role', 'General'),
                        difficulty=fields.get('difficulty', 'Intermediate'),
                        mode=fields.get('mode', 'text'),
                        overall_score=fields.get('overall_score'),
                        technical_score=fields.get('technical_score'),
                        communication_score=fields.get('communication_score'),
                        confidence_trend=fields.get('confidence_trend'),
                        ai_suggestions=fields.get('ai_suggestions', []),
                        verdict=fields.get('verdict'),
                        status=fields.get('status', 'completed'),
                    )
                    if started_at:
                        InterviewSession.objects.filter(pk=session.pk).update(started_at=started_at, completed_at=completed_at)
                        session.refresh_from_db()
                    sessions_synced += 1

                session_map[pk] = session

        self.stdout.write(self.style.SUCCESS(f"Synced {sessions_synced} historical interview sessions. Total session mapping: {len(session_map)}."))

        # 4. Sync Interview Questions
        questions_synced = 0
        for item in data:
            if item.get('model') == 'interview.interviewquestion':
                pk = item.get('pk')
                fields = item.get('fields', {})
                sess_pk = fields.get('session')
                session_obj = session_map.get(sess_pk)
                if not session_obj:
                    continue

                order = fields.get('order', 1)
                question = InterviewQuestion.objects.filter(session=session_obj, order=order).first()
                if not question:
                    question = InterviewQuestion.objects.create(
                        session=session_obj,
                        order=order,
                        question_text=fields.get('question_text', ''),
                        category=fields.get('category', ''),
                    )
                    questions_synced += 1

                question_map[pk] = question

        self.stdout.write(self.style.SUCCESS(f"Synced {questions_synced} interview questions."))

        # 5. Sync Interview Answers
        answers_synced = 0
        for item in data:
            if item.get('model') == 'interview.interviewanswer':
                fields = item.get('fields', {})
                q_pk = fields.get('question')
                question_obj = question_map.get(q_pk)
                if not question_obj:
                    continue

                if not hasattr(question_obj, 'answer') or not question_obj.answer:
                    answered_at = parse_datetime(fields.get('answered_at')) if fields.get('answered_at') else None
                    ans = InterviewAnswer.objects.create(
                        question=question_obj,
                        answer_text=fields.get('answer_text', ''),
                        technical_knowledge=fields.get('technical_knowledge', 0),
                        communication=fields.get('communication', 0),
                        grammar=fields.get('grammar', 0),
                        confidence=fields.get('confidence', 0),
                        problem_solving=fields.get('problem_solving', 0),
                        overall_score=fields.get('overall_score', 0),
                        strengths=fields.get('strengths', []),
                        improvements=fields.get('improvements', []),
                        ideal_answer_summary=fields.get('ideal_answer_summary', ''),
                        speaking_time_seconds=fields.get('speaking_time_seconds', 0),
                        cloud_video_url=fields.get('cloud_video_url', '') or None,
                        cloud_audio_url=fields.get('cloud_audio_url', '') or None,
                    )
                    if answered_at:
                        InterviewAnswer.objects.filter(pk=ans.pk).update(answered_at=answered_at)
                    answers_synced += 1

        self.stdout.write(self.style.SUCCESS(f"Synced {answers_synced} interview answers with scores and recordings."))
        self.stdout.write(self.style.SUCCESS("All historical data synced successfully!"))
