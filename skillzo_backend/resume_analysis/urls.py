from django.urls import path
from .views import ResumeListCreateView, ResumeDetailView, ResumeAnalyzeView

urlpatterns = [
    path('', ResumeListCreateView.as_view(), name='resume-list-create'),
    path('<int:pk>/', ResumeDetailView.as_view(), name='resume-detail'),
    path('<int:pk>/analyze/', ResumeAnalyzeView.as_view(), name='resume-analyze'),
]
