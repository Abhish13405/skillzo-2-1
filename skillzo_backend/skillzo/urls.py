import time
from django.contrib import admin
from django.views.static import serve
from django.urls import path, include, re_path
from django.conf import settings
from django.http import JsonResponse


def health_check(request):
    """Ultra-lightweight ping endpoint for Render keep-alive (UptimeRobot). Responds in < 1ms."""
    return JsonResponse({
        "status": "ok",
        "app": "skillzo-backend",
        "timestamp": int(time.time()),
    })


urlpatterns = [
    # Health checks (for UptimeRobot / pingers to prevent Render cold starts)
    path('', health_check, name='home'),
    path('api/health/', health_check, name='health_check'),
    path('health/', health_check, name='health_root'),

    path('admin/', admin.site.urls),

    # Module 1: Authentication
    path('api/auth/', include('accounts.urls')),

    # Module 2: Dashboard
    path('api/dashboard/', include('dashboard.urls')),

    # Module 3: Resume Analysis
    path('api/resume/', include('resume_analysis.urls')),

    # Module 4: AI Interview (Text now, Audio/Video in Phase 2)
    path('api/interview/', include('interview.urls')),

    # Module 5: Company Multi-Tenant Leader Portal
    path('api/company/', include('company.urls')),

    # Media Files Serving
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]
