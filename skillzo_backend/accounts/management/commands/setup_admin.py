from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Create or update default admin superuser for project leader'

    def handle(self, *args, **options):
        accounts = [
            {'username': 'abhish', 'email': 'abhish@gmail.com', 'is_admin': True, 'role': 'Project Leader'},
            {'username': 'asti', 'email': 'asti@gmail.com', 'is_admin': False, 'role': 'Full Stack Developer'},
            {'username': 'jai', 'email': 'jai@gmail.com', 'is_admin': False, 'role': 'Frontend Developer'},
            {'username': 'b', 'email': 'b@gmail.com', 'is_admin': False, 'role': 'Backend Developer'},
        ]
        password = 'Skillzo@2026'

        for acc in accounts:
            email = acc['email']
            username = acc['username']
            user = User.objects.filter(email__iexact=email).first() or User.objects.filter(username__iexact=username).first()

            if not user:
                if acc['is_admin']:
                    user = User.objects.create_superuser(
                        username=username,
                        email=email,
                        password=password,
                        target_role=acc['role'],
                    )
                else:
                    user = User.objects.create_user(
                        username=username,
                        email=email,
                        password=password,
                        target_role=acc['role'],
                    )
                self.stdout.write(self.style.SUCCESS(f"User {email} created successfully."))
            else:
                user.set_password(password)
                user.is_active = True
                if acc['is_admin']:
                    user.is_staff = True
                    user.is_superuser = True
                if not user.target_role:
                    user.target_role = acc['role']
                user.save()
                self.stdout.write(self.style.SUCCESS(f"User {email} updated successfully."))
