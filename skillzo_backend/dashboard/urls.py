from django.urls import path
from .views import DashboardSummaryView, LeaderPortalStatsView

urlpatterns = [
    path('summary/', DashboardSummaryView.as_view(), name='dashboard-summary'),
    path('leader-stats/', LeaderPortalStatsView.as_view(), name='leader-portal-stats'),
]
