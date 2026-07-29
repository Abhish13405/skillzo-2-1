from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

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
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
