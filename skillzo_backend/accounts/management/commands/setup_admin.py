from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Create or update default admin superuser for project leader'

    def handle(self, *args, **options):
        email = 'abhish@gmail.com'
        username = 'abhish'
        password = 'Skillzo@2026'

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            user = User.objects.filter(username__iexact=username).first()

        if not user:
            user = User.objects.create_superuser(
                username=username,
                email=email,
                password=password,
                target_role='Project Leader',
            )
            self.stdout.write(self.style.SUCCESS(f'Superuser {email} created successfully.'))
        else:
            user.is_staff = True
            user.is_superuser = True
            user.is_active = True
            if not user.target_role:
                user.target_role = 'Project Leader'
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Superuser {email} updated with admin privileges.'))
