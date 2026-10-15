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
        ('abhishekkushwaha31387@bbdu.ac.in', 'abhishekkushwaha31387', 'Project Leader'),
        ('abhishekkushwaha965@gmail.com', 'demo', 'Project Leader'),
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

    # 2. Seed registered candidates so they are PERMANENTLY preserved on boot
    candidate_seeds = [
        ('raj@gmail.com', 'raj', 'Python Developer'),
        ('asti@gmail.com', 'asti', 'Full Stack Developer'),
        ('jai@gmail.com', 'jai', 'Frontend Developer'),
        ('b@gmail.com', 'b', 'Backend Developer'),
        ('skill@gmail.com', 'skill', 'Full Stack Developer'),
        ('p@gmail.com', 'p', 'Frontend Developer'),
    ]
    for email, uname, role in candidate_seeds:
        user, created = User.objects.get_or_create(email=email, defaults={'username': uname, 'target_role': role})
        if created or not user.password:
            user.set_password('Skillzo@2026')
        user.is_active = True
        user.save()
        print(f"[WSGI BOOT] Configured candidate: {email}")

    # 3. Synchronize all historical interview sessions, reports, and accounts
    try:
        call_command('sync_interview_history', interactive=False)
        print("[WSGI BOOT] Historical interview sessions and candidate accounts synced successfully.")
    except Exception as sync_err:
        print(f"[WSGI BOOT] sync_interview_history warning: {sync_err}")

except Exception as e:
    import logging
    print(f"[WSGI BOOT] Migration/seed warning: {e}")
    logging.getLogger('django').warning(f"Startup migration: {e}")

