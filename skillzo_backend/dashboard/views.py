from django.db.models import Avg, Max, Count, Q
from django.utils import timezone
from rest_framework import permissions
from rest_framework.views import APIView
from rest_framework.response import Response

from interview.models import InterviewSession
from interview.serializers import InterviewSessionSerializer


class IsLeaderUser(permissions.BasePermission):
    """Allows access only to authenticated leaders (staff, superuser, or designated leader emails/usernames)."""
    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        email = (user.email or '').strip().lower()
        username = (user.username or '').strip().lower()
        leader_identifiers = [
            'abhishekkushwaha13405@gmail.com',
            'abhish@gmail.com',
            'abhishek13405',
            'abhish',
        ]
        return bool(
            user.is_superuser or
            user.is_staff or
            email in leader_identifiers or
            username in leader_identifiers
        )


class DashboardSummaryView(APIView):
    """
    GET /api/dashboard/summary/

    Returns everything the Dashboard module needs in ONE call:
    Total Interviews, Average Score, Best Score, Progress Chart data,
    Recent Reports, AI Suggestions, Daily Goal / streak.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        is_leader = bool(
            user.is_staff or
            user.is_superuser or
            (user.email and user.email.lower() in ['abhishekkushwaha13405@gmail.com', 'abhish@gmail.com'])
        )

        # For regular candidates, fetch their completed/answered sessions.
        # For leader if they don't have personal sessions, fallback to platform sessions.
        user_completed = InterviewSession.objects.filter(
            Q(user=user) & (Q(status='completed') | Q(questions__answer__isnull=False))
        ).distinct()

        if not user_completed.exists() and is_leader:
            completed = InterviewSession.objects.filter(
                Q(status='completed') | Q(questions__answer__isnull=False)
            ).distinct()
        else:
            completed = user_completed

        stats = completed.aggregate(
            avg_score=Avg('overall_score'),
            best_score=Max('overall_score'),
            total=Count('id'),
        )

        # Progress chart: last 10 completed interviews, oldest to newest
        recent_for_chart = completed.order_by('-completed_at', '-started_at')[:10]
        progress_chart = [
            {
                "date": (s.completed_at or s.started_at).strftime('%Y-%m-%d') if (s.completed_at or s.started_at) else None,
                "score": s.overall_score or 0,
                "role": s.job_role,
            }
            for s in reversed(list(recent_for_chart))
        ]

        recent_reports = InterviewSessionSerializer(
            completed.order_by('-completed_at', '-started_at')[:5], many=True
        ).data

        # Pull latest AI suggestions from most recent completed interview
        latest_session = completed.order_by('-completed_at').first()
        ai_suggestions = latest_session.ai_suggestions if latest_session else []

        # Daily goal: has the user completed at least 1 interview today?
        today = timezone.localdate()
        completed_today = completed.filter(completed_at__date=today).count()

        leader_stats = None
        if is_leader:
            from django.contrib.auth import get_user_model
            from resume_analysis.models import Resume
            UserModel = get_user_model()
            leader_stats = {
                "total_users": UserModel.objects.count(),
                "all_users": list(UserModel.objects.order_by('-date_joined').values('id', 'username', 'email', 'date_joined', 'current_streak')[:20]),
                "total_all_interviews": InterviewSession.objects.count(),
                "total_all_resumes": Resume.objects.count(),
            }

        return Response({
            "total_interviews": stats['total'] or 0,
            "average_score": round(stats['avg_score'], 1) if stats['avg_score'] else 0,
            "best_score": stats['best_score'] or 0,
            "progress_chart": progress_chart,
            "recent_reports": recent_reports,
            "ai_suggestions": ai_suggestions,
            "leader_stats": leader_stats,
            "daily_goal": {
                "target": 1,
                "completed_today": completed_today,
                "current_streak": user.current_streak,
                "longest_streak": user.longest_streak,
            },
        })


class LeaderPortalStatsView(APIView):
    """
    GET /api/dashboard/leader-stats/
    Dedicated endpoint for the Project Leader Portal.
    Returns complete data for every registered user across the platform.
    """
    permission_classes = [permissions.IsAuthenticated, IsLeaderUser]

    def get(self, request):
        import os
        from django.contrib.auth import get_user_model
        from resume_analysis.models import Resume
        UserModel = get_user_model()
        users_qs = list(UserModel.objects.all().order_by('-date_joined'))

        # Efficient batch aggregation for interview stats
        user_int_stats = {
            item['user']: item
            for item in InterviewSession.objects.values('user').annotate(
                total=Count('id'),
                completed=Count('id', filter=Q(status='completed')),
                avg_score=Avg('overall_score'),
                best_score=Max('overall_score'),
            )
        }

        # Pre-group resumes and sessions by user
        all_resumes = Resume.objects.all().order_by('-uploaded_at')
        resumes_by_user = {}
        for r in all_resumes:
            uid = r.user_id
            if uid not in resumes_by_user:
                resumes_by_user[uid] = []
            resumes_by_user[uid].append({
                "id": r.id,
                "filename": os.path.basename(r.file.name) if r.file else "Resume",
                "url": r.file.url if r.file else None,
                "uploaded_at": r.uploaded_at.strftime('%d %b %Y, %I:%M %p') if r.uploaded_at else "—",
                "ats_score": r.ats_score,
                "is_analyzed": r.is_analyzed,
                "extracted_skills": r.extracted_skills or [],
                "suggested_job_roles": r.suggested_job_roles or [],
                "missing_keywords": r.missing_keywords or [],
                "feedback": r.feedback or [],
            })

        all_sessions = list(InterviewSession.objects.select_related('user').prefetch_related('questions__answer').order_by('-started_at'))
        sessions_by_user = {}
        server_recordings = []
        for s in all_sessions:
            uid = s.user_id
            if uid not in sessions_by_user:
                sessions_by_user[uid] = []

            session_questions = []
            for q in s.questions.all():
                ans_data = None
                if hasattr(q, 'answer') and q.answer:
                    ans = q.answer
                    # Leader Portal strictly receives cloud URLs only when uploaded to cloud
                    vid_url = ans.cloud_video_url if ans.cloud_video_url else None
                    aud_url = ans.cloud_audio_url if ans.cloud_audio_url else None
                    ans_data = {
                        "id": ans.id,
                        "answer_text": ans.answer_text,
                        "overall_score": ans.overall_score,
                        "video_url": vid_url,
                        "audio_url": aud_url,
                        "speaking_time_seconds": ans.speaking_time_seconds,
                    }
                    # Only include recording in Leader Portal if candidate uploaded to cloud!
                    cloud_url = ans.cloud_video_url or ans.cloud_audio_url
                    if cloud_url:
                        ans_time = ans.answered_at or s.started_at
                        server_recordings.append({
                            "id": f"srv_{ans.id}",
                            "sessionId": s.id,
                            "userId": s.user_id,
                            "userEmail": s.user.email if s.user else "",
                            "candidateName": s.user.username if s.user else "Candidate",
                            "jobRole": s.job_role or "AI Interview",
                            "difficulty": s.difficulty or "Intermediate",
                            "mode": "video" if ans.cloud_video_url else "audio",
                            "questionNumber": q.order,
                            "questionText": q.question_text,
                            "url": cloud_url,
                            "durationSeconds": ans.speaking_time_seconds or 0,
                            "createdAt": ans_time.isoformat() if ans_time else "",
                            "displayDate": ans_time.strftime('%d %b %Y, %I:%M %p') if ans_time else "—",
                            "score": ans.overall_score,
                            "timestamp": ans_time.timestamp() if ans_time else 0,
                        })

                session_questions.append({
                    "id": q.id,
                    "order": q.order,
                    "question_text": q.question_text,
                    "answer": ans_data,
                })

            sessions_by_user[uid].append({
                "id": s.id,
                "role": s.job_role or "General",
                "difficulty": s.difficulty or "Intermediate",
                "score": s.overall_score,
                "status": s.status,
                "started_at": s.started_at.strftime('%d %b %Y, %I:%M %p') if s.started_at else "—",
                "completed_at": s.completed_at.strftime('%d %b %Y, %I:%M %p') if s.completed_at else "—",
                "questions": session_questions,
            })

        all_users = []
        for u in users_qs:
            st = user_int_stats.get(u.id, {})
            u_resumes = resumes_by_user.get(u.id, [])
            u_sessions = sessions_by_user.get(u.id, [])

            # Latest ATS score & skills from analyzed resumes
            analyzed_res = [r for r in u_resumes if r.get('is_analyzed')]
            latest_ats = analyzed_res[0].get('ats_score') if analyzed_res else None
            extracted_skills = analyzed_res[0].get('extracted_skills', []) if analyzed_res else []

            u_recordings = [r for r in server_recordings if r.get('userId') == u.id]

            all_users.append({
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "phone": u.phone or "—",
                "college_or_company": u.college_or_company or "—",
                "target_role": u.target_role or "Candidate",
                "bio": u.bio or "",
                "current_streak": u.current_streak,
                "longest_streak": u.longest_streak,
                "date_joined": u.date_joined.strftime('%d %b %Y, %I:%M %p') if u.date_joined else "—",
                "last_active_date": u.last_active_date.strftime('%d %b %Y') if u.last_active_date else (u.date_joined.strftime('%d %b %Y') if u.date_joined else "—"),
                "last_login": u.last_login.strftime('%d %b %Y, %I:%M %p') if u.last_login else "—",
                "is_active": u.is_active,
                "is_staff": u.is_staff,
                "is_superuser": u.is_superuser,
                "is_leader": bool(
                    u.is_superuser or
                    u.is_staff or
                    (u.email and u.email.lower().strip() in ['abhishekkushwaha13405@gmail.com', 'abhish@gmail.com']) or
                    (u.username and u.username.lower().strip() in ['abhish', 'abhishek13405'])
                ),
                "total_interviews": st.get('total', len(u_sessions)),
                "completed_interviews": st.get('completed', len([s for s in u_sessions if s['status'] == 'completed'])),
                "avg_score": round(st['avg_score'], 1) if st.get('avg_score') is not None else 0,
                "best_score": st.get('best_score') or 0,
                "total_resumes": len(u_resumes),
                "latest_ats_score": latest_ats,
                "extracted_skills": extracted_skills,
                "resumes": u_resumes,
                "sessions": u_sessions,
                "recordings": u_recordings,
            })

        recent_sessions = [
            {
                "id": s.id,
                "candidate": s.user.username if s.user else "Anonymous",
                "email": s.user.email if s.user else "—",
                "role": s.job_role or "General",
                "difficulty": s.difficulty or "Intermediate",
                "score": s.overall_score,
                "status": s.status,
                "date": s.started_at.strftime('%d %b %Y') if s.started_at else "—",
            }
            for s in all_sessions[:25]
        ]

        server_recordings.sort(key=lambda r: r.get("timestamp", 0), reverse=True)

        return Response({
            "is_leader": True,
            "total_users": len(all_users),
            "total_interviews": len(all_sessions),
            "total_resumes": len(all_resumes),
            "users": all_users,
            "all_users": all_users,
            "recent_sessions": recent_sessions,
            "server_recordings": server_recordings,
        })

