from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom user model -- extends Django's built-in auth with profile fields."""
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=15, blank=True, null=True)
    profile_photo = models.ImageField(upload_to='profile_photos/', blank=True, null=True)
    college_or_company = models.CharField(max_length=255, blank=True, null=True)
    target_role = models.CharField(max_length=100, blank=True, null=True)  # e.g. "Python Developer"
    bio = models.TextField(blank=True, null=True)

    # Streak / gamification (used by Dashboard + Bonus features)
    current_streak = models.IntegerField(default=0)
    longest_streak = models.IntegerField(default=0)
    last_active_date = models.DateField(blank=True, null=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.email


class PasswordResetOTP(models.Model):
    """OTP-based forgot password flow."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reset_otps')
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    def __str__(self):
        return f"OTP for {self.user.email}"
