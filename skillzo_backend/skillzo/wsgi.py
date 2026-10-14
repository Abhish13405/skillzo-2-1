import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skillzo.settings')
application = get_wsgi_application()

try:
    from django.core.management import call_command
    print("[WSGI BOOT] Executing automatic database migrations...")
    call_command('migrate', interactive=False)
    print("[WSGI BOOT] Database migrations applied successfully.")

    from django.contrib.auth import get_user_model
    User = get_user_model()

    # 1. Ensure Abhishek leader accounts exist and have superuser rights
    leader_seeds = [
        ('abhish@gmail.com', 'abhish', 'Project Leader'),
        ('abhishekkushwaha13405@gmail.com', 'abhishek13405', 'Project Leader'),
    ]
    for email, uname, role in leader_seeds:
        user, _ = User.objects.get_or_create(email=email, defaults={'username': uname, 'target_role': role})
        user.set_password('Skillzo@2026')
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.target_role = role
        user.save()
        print(f"[WSGI BOOT] Configured leader account: {email}")

    # 2. Seed initial candidates so Leaderboard has registered candidates
    candidate_seeds = [
        ('asti@gmail.com', 'asti', 'Full Stack Developer'),
        ('jai@gmail.com', 'jai', 'Frontend Developer'),
        ('b@gmail.com', 'b', 'Backend Developer'),
    ]
    for email, uname, role in candidate_seeds:
        user, created = User.objects.get_or_create(email=email, defaults={'username': uname, 'target_role': role})
        if created:
            user.set_password('Skillzo@2026')
            user.save()
            print(f"[WSGI BOOT] Seeded candidate: {email}")

except Exception as e:
    import logging
    print(f"[WSGI BOOT] Migration/seed warning: {e}")
    logging.getLogger('django').warning(f"Startup migration: {e}")

