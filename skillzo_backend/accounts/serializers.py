from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()


class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)
    phone = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'phone', 'password', 'confirm_password']

    def validate_email(self, value):
        norm = value.strip().lower()
        if User.objects.filter(email__iexact=norm).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return norm

    def validate_username(self, value):
        norm = value.strip()
        if User.objects.filter(username__iexact=norm).exists():
            raise serializers.ValidationError("This username is already taken.")
        return norm

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return data

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        phone = validated_data.pop('phone', None)
        user = User.objects.create_user(
            username=validated_data['username'].strip(),
            email=validated_data['email'].strip().lower(),
            password=validated_data['password'],
        )
        if phone:
            user.phone = phone.strip()
            user.save(update_fields=['phone'])
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.CharField()  # Accepts either email or username
    password = serializers.CharField(write_only=True)


class ProfileSerializer(serializers.ModelSerializer):
    is_leader = serializers.SerializerMethodField()
    interview_quota = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'phone', 'profile_photo',
            'college_or_company', 'target_role', 'bio',
            'current_streak', 'longest_streak',
            'is_staff', 'is_superuser', 'is_leader',
            'is_subscribed', 'subscription_plan',
            'bonus_interviews', 'earned_badges',
            'interview_quota',
        ]
        read_only_fields = [
            'id', 'email', 'current_streak', 'longest_streak',
            'is_staff', 'is_superuser', 'is_leader',
            'bonus_interviews', 'earned_badges', 'interview_quota',
        ]

    def get_is_leader(self, obj):
        return bool(
            obj.is_superuser or
            obj.is_staff or
            (obj.email and obj.email.lower() in [
                'abhishekkushwaha13405@gmail.com',
                'abhish@gmail.com',
                'abhishekkushwaha31387@bbdu.ac.in',
            ])
        )

    def get_interview_quota(self, obj):
        is_leader = self.get_is_leader(obj)
        # Count non-abandoned completed interviews
        completed_count = getattr(obj, 'interview_sessions', None)
        if completed_count is not None:
            completed_count = obj.interview_sessions.filter(status='completed').count()
        else:
            completed_count = 0

        if is_leader or obj.is_subscribed:
            return {
                "is_unlimited": True,
                "base_limit": 9999,
                "bonus_interviews": obj.bonus_interviews or 0,
                "total_limit": 9999,
                "completed": completed_count,
                "remaining": "Unlimited",
                "can_interview": True,
                "plan": "Pro Unlimited" if obj.is_subscribed else "Leader Unlimited",
            }

        base_limit = 10
        bonus = obj.bonus_interviews or 0
        total_limit = base_limit + bonus
        remaining = max(0, total_limit - completed_count)
        return {
            "is_unlimited": False,
            "base_limit": base_limit,
            "bonus_interviews": bonus,
            "total_limit": total_limit,
            "completed": completed_count,
            "remaining": remaining,
            "can_interview": (remaining > 0),
            "plan": obj.subscription_plan or 'free',
        }


class ForgotPasswordRequestSerializer(serializers.Serializer):
    email = serializers.CharField()  # Accepts either email or username


class ResetPasswordSerializer(serializers.Serializer):
    email = serializers.CharField()  # Accepts either email or username
    otp = serializers.CharField(max_length=6)
    new_password = serializers.CharField(validators=[validate_password])


class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.CharField()  # Accepts either email or username
    otp = serializers.CharField(max_length=6)
