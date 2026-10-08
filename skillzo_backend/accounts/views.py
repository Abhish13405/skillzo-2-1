import random
from django.contrib.auth import get_user_model, authenticate
from django.utils import timezone
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import (
    SignupSerializer, LoginSerializer, ProfileSerializer,
    ForgotPasswordRequestSerializer, ResetPasswordSerializer,
)
from .models import PasswordResetOTP

User = get_user_model()


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


class SignupView(generics.CreateAPIView):
    """POST /api/auth/signup/"""
    queryset = User.objects.all()
    serializer_class = SignupSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        tokens = get_tokens_for_user(user)
        return Response({
            "message": "Signup successful.",
            "user": ProfileSerializer(user).data,
            "tokens": tokens,
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """POST /api/auth/login/"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        identifier = serializer.validated_data['email'].strip()
        password = serializer.validated_data['password']

        # Flexible case-insensitive lookup: match email OR username
        user_obj = User.objects.filter(email__iexact=identifier).first()
        if not user_obj:
            user_obj = User.objects.filter(username__iexact=identifier).first()

        if not user_obj:
            return Response({"error": "Invalid email or password."},
                             status=status.HTTP_401_UNAUTHORIZED)

        user = authenticate(username=user_obj.email, password=password)
        if not user:
            if user_obj.check_password(password) and user_obj.is_active:
                user = user_obj
            else:
                return Response({"error": "Invalid email or password."},
                                 status=status.HTTP_401_UNAUTHORIZED)

        # Ensure project leader always has superuser & staff privileges
        if user.email.lower() == 'abhish@gmail.com' and (not user.is_staff or not user.is_superuser):
            user.is_staff = True
            user.is_superuser = True
            user.save(update_fields=['is_staff', 'is_superuser'])

        # Streak update on login (used by Dashboard's Daily Goal / streak feature)
        today = timezone.localdate()
        if user.last_active_date != today:
            if user.last_active_date == today - timezone.timedelta(days=1):
                user.current_streak += 1
            else:
                user.current_streak = 1
            user.longest_streak = max(user.longest_streak, user.current_streak)
            user.last_active_date = today
            user.save(update_fields=['current_streak', 'longest_streak', 'last_active_date'])

        tokens = get_tokens_for_user(user)
        return Response({
            "message": "Login successful.",
            "user": ProfileSerializer(user).data,
            "tokens": tokens,
        })


class ForgotPasswordRequestView(APIView):
    """POST /api/auth/forgot-password/ -- generates OTP (send via email in production)"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ForgotPasswordRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        identifier = serializer.validated_data['email'].strip()

        user = User.objects.filter(email__iexact=identifier).first()
        if not user:
            user = User.objects.filter(username__iexact=identifier).first()

        if not user:
            # Don't reveal whether email exists
            return Response({"message": "If this email exists, an OTP has been sent."})

        otp = str(random.randint(100000, 999999))
        PasswordResetOTP.objects.create(user=user, otp=otp)

        # TODO Phase 2: integrate actual email sending (Django email backend / SMTP)
        return Response({
            "message": "If this email exists, an OTP has been sent.",
            "debug_otp": otp,  # remove this field once real email sending is wired up
        })


class ResetPasswordView(APIView):
    """POST /api/auth/reset-password/"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = User.objects.filter(email__iexact=data['email'].strip()).first()
        if not user:
            user = User.objects.filter(username__iexact=data['email'].strip()).first()

        if not user:
            return Response({"error": "Invalid OTP or account not found."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            otp_obj = PasswordResetOTP.objects.filter(
                user=user, otp=data['otp'].strip(), is_used=False
            ).latest('created_at')
        except PasswordResetOTP.DoesNotExist:
            return Response({"error": "Invalid OTP."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(data['new_password'])
        user.save()
        otp_obj.is_used = True
        otp_obj.save()

        return Response({"message": "Password reset successful. Please log in."})


class ProfileView(generics.RetrieveUpdateAPIView):
    """GET/PUT/PATCH /api/auth/profile/"""
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user
