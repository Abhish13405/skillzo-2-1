from django.db.models import Avg, Max, Count
from django.utils import timezone
from rest_framework import permissions
from rest_framework.views import APIView
from rest_framework.response import Response

from interview.models import InterviewSession
from interview.serializers import InterviewSessionSerializer


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
        completed = InterviewSession.objects.filter(user=user, status='completed')

        stats = completed.aggregate(
            avg_score=Avg('overall_score'),
            best_score=Max('overall_score'),
            total=Count('id'),
        )

        # Progress chart: last 10 completed interviews, oldest to newest
        recent_for_chart = completed.order_by('-completed_at')[:10]
        progress_chart = [
            {
                "date": s.completed_at.strftime('%Y-%m-%d') if s.completed_at else None,
                "score": s.overall_score,
                "role": s.job_role,
            }
            for s in reversed(list(recent_for_chart))
        ]

        recent_reports = InterviewSessionSerializer(
            completed.order_by('-completed_at')[:5], many=True
        ).data

        # Pull latest AI suggestions from most recent completed interview
        latest_session = completed.order_by('-completed_at').first()
        ai_suggestions = latest_session.ai_suggestions if latest_session else []

        # Daily goal: has the user completed at least 1 interview today?
        today = timezone.localdate()
        completed_today = completed.filter(completed_at__date=today).count()

        leader_stats = None
        if user.is_staff or user.is_superuser or (user.email and user.email.lower() == 'abhish@gmail.com'):
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
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        is_leader = (
            user.is_staff or 
            user.is_superuser or 
            (user.email and 'abhish' in user.email.lower()) or
            (user.username and 'abhish' in user.username.lower())
        )
        if not is_leader:
            return Response({"error": "Leader access required."}, status=403)

        from django.contrib.auth import get_user_model
        from resume_analysis.models import Resume
        UserModel = get_user_model()

        users_qs = UserModel.objects.order_by('-date_joined')
        all_users = [
            {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "target_role": u.target_role or "Not specified",
                "current_streak": u.current_streak,
                "date_joined": u.date_joined.strftime('%d %b %Y, %I:%M %p') if u.date_joined else "—",
                "is_active": u.is_active,
            }
            for u in users_qs
        ]

        recent_sessions = [
            {
                "id": s.id,
                "candidate": s.user.username if s.user else "Anonymous",
                "email": s.user.email if s.user else "—",
                "role": s.job_role,
                "difficulty": s.difficulty,
                "score": s.overall_score,
                "status": s.status,
                "date": s.started_at.strftime('%d %b %Y') if s.started_at else "—",
            }
            for s in InterviewSession.objects.select_related('user').order_by('-id')[:20]
        ]

        return Response({
            "is_leader": True,
            "total_users": UserModel.objects.count(),
            "total_interviews": InterviewSession.objects.count(),
            "total_resumes": Resume.objects.count(),
            "users": all_users,
            "recent_sessions": recent_sessions,
        })


class PlatformLeaderboardView(APIView):
    """
    GET /api/dashboard/leaderboard/
    Returns community candidates leaderboard with rankings, scores, and account information.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from django.contrib.auth import get_user_model
        from resume_analysis.models import Resume
        UserModel = get_user_model()

        candidates = []
        for u in UserModel.objects.all().order_by('id'):
            sessions = InterviewSession.objects.filter(user=u)
            resumes = Resume.objects.filter(user=u)
            best = sessions.filter(status='completed').aggregate(Max('overall_score'))['overall_score__max'] or 0
            avg_s = sessions.filter(status='completed').aggregate(Avg('overall_score'))['overall_score__avg'] or 0

            is_leader = (
                u.is_staff or 
                u.is_superuser or 
                (u.email and 'abhish' in u.email.lower()) or
                (u.username and 'abhish' in u.username.lower())
            )

            candidates.append({
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "role": u.target_role or "Candidate",
                "joined": u.date_joined.strftime('%d %b %Y, %I:%M %p') if u.date_joined else "—",
                "interviews_count": sessions.count(),
                "completed_interviews": sessions.filter(status='completed').count(),
                "resumes_count": resumes.count(),
                "best_score": round(best, 1),
                "avg_score": round(avg_s, 1),
                "streak": u.current_streak,
                "is_active": u.is_active,
                "is_leader": is_leader,
            })

        # Rank candidates by best_score descending, then completed_interviews descending, then streak descending
        ranked = sorted(
            candidates,
            key=lambda c: (c['best_score'], c['completed_interviews'], c['streak']),
            reverse=True
        )

        return Response({
            "total_candidates": len(candidates),
            "total_interviews": InterviewSession.objects.count(),
            "total_resumes": Resume.objects.count(),
            "candidates": ranked,
        })

