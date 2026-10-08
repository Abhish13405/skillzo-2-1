from django.urls import path
from .views import DashboardSummaryView, LeaderPortalStatsView, PlatformLeaderboardView

urlpatterns = [
    path('summary/', DashboardSummaryView.as_view(), name='dashboard-summary'),
    path('leader-stats/', LeaderPortalStatsView.as_view(), name='leader-portal-stats'),
    path('leaderboard/', PlatformLeaderboardView.as_view(), name='platform-leaderboard'),
]
