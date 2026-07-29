from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    SignupView, LoginView, ForgotPasswordRequestView,
    ResetPasswordView, ProfileView,
)

urlpatterns = [
    path('signup/', SignupView.as_view(), name='signup'),
    path('login/', LoginView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('forgot-password/', ForgotPasswordRequestView.as_view(), name='forgot_password'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset_password'),
    path('profile/', ProfileView.as_view(), name='profile'),
]
