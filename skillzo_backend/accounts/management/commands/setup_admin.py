from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Create or update default admin superuser for project leader and company setup'

    def handle(self, *args, **options):
        accounts = [
            {'username': 'abhish', 'email': 'abhish@gmail.com', 'is_admin': True, 'role': 'Project Leader', 'password': 'Skillzo@2026'},
            {'username': 'abhishek13405', 'email': 'abhishekkushwaha13405@gmail.com', 'is_admin': True, 'role': 'Project Leader', 'password': 'Skillzo@2026'},
            {'username': 'abhishekkushwaha31387', 'email': 'abhishekkushwaha31387@bbdu.ac.in', 'is_admin': True, 'role': 'Project Leader', 'password': 'Skillzo@2026'},
            {'username': 'demo', 'email': 'abhishekkushwaha965@gmail.com', 'is_admin': True, 'role': 'Project Leader', 'password': 'Skillzo@2026'},
            {'username': 'raj', 'email': 'raj@gmail.com', 'is_admin': False, 'role': 'Python Developer', 'password': 'Skillzo@2026'},
            {'username': 'asti', 'email': 'asti@gmail.com', 'is_admin': False, 'role': 'Full Stack Developer', 'password': 'Skillzo@2026'},
            {'username': 'jai', 'email': 'jai@gmail.com', 'is_admin': False, 'role': 'Frontend Developer', 'password': 'Skillzo@2026'},
            {'username': 'b', 'email': 'b@gmail.com', 'is_admin': False, 'role': 'Backend Developer', 'password': 'Skillzo@2026'},
        ]

        created_users = []
        for acc in accounts:
            email = acc['email']
            username = acc['username']
            user = User.objects.filter(email__iexact=email).first() or User.objects.filter(username__iexact=username).first()

            pwd = acc['password']
            if not user:
                if acc['is_admin']:
                    user = User.objects.create_superuser(
                        username=username,
                        email=email,
                        password=pwd,
                        target_role=acc['role'],
                    )
                else:
                    user = User.objects.create_user(
                        username=username,
                        email=email,
                        password=pwd,
                        target_role=acc['role'],
                    )
                self.stdout.write(self.style.SUCCESS(f"User {email} created successfully."))
            else:
                # For admin/leader ensure password and superuser rights
                if acc['is_admin']:
                    user.set_password(pwd)
                    user.is_staff = True
                    user.is_superuser = True
                elif not user.password:
                    user.set_password(pwd)
                user.is_active = True
                if not user.target_role:
                    user.target_role = acc['role']
                user.save()
                self.stdout.write(self.style.SUCCESS(f"User {email} preserved/updated successfully."))
            created_users.append(user)

        # Multi-Tenant Company Setup
        try:
            from company.models import Company, LeaderProfile, CompanyCandidate
            company, _ = Company.objects.get_or_create(name='Skillzo', defaults={'slug': 'skillzo'})

            for acc in accounts:
                if acc['is_admin']:
                    u = User.objects.filter(email__iexact=acc['email']).first()
                    if u:
                        LeaderProfile.objects.update_or_create(
                            user=u,
                            defaults={
                                'company': company,
                                'role': 'admin',
                                'is_owner': True,
                                'is_active': True
                            }
                        )

            # Auto enroll candidates into CompanyCandidate
            all_db_users = User.objects.all()
            for u in all_db_users:
                if not LeaderProfile.objects.filter(user=u, is_owner=True).exists():
                    CompanyCandidate.objects.get_or_create(
                        company=company,
                        candidate=u,
                        defaults={
                            'target_role': u.target_role or 'Candidate',
                            'status': 'new',
                            'shares_with_company': True,
                            'remark': 'Registered on Skillzo',
                        }
                    )
            self.stdout.write(self.style.SUCCESS("Company and LeaderProfiles initialized successfully."))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"Company initialization skipped: {e}"))
