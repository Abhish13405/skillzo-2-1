from django.contrib import admin
from django.views.static import serve
from django.urls import path, include, re_path
from django.conf import settings

urlpatterns = [
    path('admin/', admin.site.urls),

    # Module 1: Authentication
    path('api/auth/', include('accounts.urls')),

    # Module 2: Dashboard
    path('api/dashboard/', include('dashboard.urls')),

    # Module 3: Resume Analysis
    path('api/resume/', include('resume_analysis.urls')),

    # Module 4: AI Interview (Text now, Audio/Video in Phase 2)
    path('api/interview/', include('interview.urls')),

    # Media Files Serving
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]
