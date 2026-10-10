import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skillzo.settings')
application = get_wsgi_application()

try:
    from django.core.management import call_command
    print("[WSGI BOOT] Executing automatic database migrations...")
    call_command('migrate', interactive=False)
    print("[WSGI BOOT] Database migrations applied successfully.")
except Exception as e:
    import logging
    print(f"[WSGI BOOT] Migration warning: {e}")
    logging.getLogger('django').warning(f"Startup migration: {e}")
