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

        return Response({
            "total_interviews": stats['total'] or 0,
            "average_score": round(stats['avg_score'], 1) if stats['avg_score'] else 0,
            "best_score": stats['best_score'] or 0,
            "progress_chart": progress_chart,
            "recent_reports": recent_reports,
            "ai_suggestions": ai_suggestions,
            "daily_goal": {
                "target": 1,
                "completed_today": completed_today,
                "current_streak": user.current_streak,
                "longest_streak": user.longest_streak,
            },
        })
