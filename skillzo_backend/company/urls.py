from django.urls import path
from .views import (
    CompanyDashboardStatsView,
    CompanyCandidateListView,
    CompanyCandidateDetailView,
    UpdateCandidateStatusView,
    CreateLiveInviteView,
    VerifyTokenView
)

urlpatterns = [
    path('stats/', CompanyDashboardStatsView.as_view(), name='company-stats'),
    path('candidates/', CompanyCandidateListView.as_view(), name='company-candidates'),
    path('candidates/<int:pk>/', CompanyCandidateDetailView.as_view(), name='company-candidate-detail'),
    path('candidates/<int:pk>/status/', UpdateCandidateStatusView.as_view(), name='company-candidate-status-update'),
    path('invite/', CreateLiveInviteView.as_view(), name='company-create-invite'),
    path('invite/verify/<str:token>/', VerifyTokenView.as_view(), name='company-verify-token'),
]
