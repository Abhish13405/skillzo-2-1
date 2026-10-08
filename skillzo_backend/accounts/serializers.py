from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()


class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'confirm_password']

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
        user = User.objects.create_user(
            username=validated_data['username'].strip(),
            email=validated_data['email'].strip().lower(),
            password=validated_data['password'],
        )
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.CharField()  # Accepts either email or username
    password = serializers.CharField(write_only=True)


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'phone', 'profile_photo',
            'college_or_company', 'target_role', 'bio',
            'current_streak', 'longest_streak',
            'is_staff', 'is_superuser',
        ]
        read_only_fields = ['id', 'email', 'current_streak', 'longest_streak', 'is_staff', 'is_superuser']


class ForgotPasswordRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)
    new_password = serializers.CharField(validators=[validate_password])
