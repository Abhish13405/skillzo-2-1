from django.urls import path
from .views import (
    StartInterviewView, SubmitAnswerView, CompleteInterviewView,
    InterviewHistoryView, InterviewDetailView,
)

urlpatterns = [
    path('start/', StartInterviewView.as_view(), name='interview-start'),
    path('history/', InterviewHistoryView.as_view(), name='interview-history'),
    path('<int:session_id>/', InterviewDetailView.as_view(), name='interview-detail'),
    path('<int:session_id>/answer/', SubmitAnswerView.as_view(), name='interview-answer'),
    path('<int:session_id>/complete/', CompleteInterviewView.as_view(), name='interview-complete'),
]
