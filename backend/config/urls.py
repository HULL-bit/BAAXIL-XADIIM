from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
import os

def root(request):
    """Réponse sur la racine pour éviter 404."""
    return JsonResponse({
        'message': 'DBM API',
        'admin': '/admin/',
        'api': '/api/',
    })

urlpatterns = [
    path('', root),
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/', include('apps.conservatoire.urls')),  # AVANT informations
    path('api/', include('apps.informations.urls')),
    path('api/', include('apps.finance.urls')),
    path('api/', include('apps.culturelle.urls')),
    path('api/', include('apps.communication.urls')),
    path('api/', include('apps.sociale.urls')),
    path('api/', include('apps.scientifique.urls')),
    path('api/', include('apps.organisation.urls')),
    path('api/', include('apps.bibliotheque.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Optionnel: servir les médias en production (utile si vous utilisez un Disk Render)
# Recommandé: préférez S3/CDN en production.
if not settings.DEBUG and os.environ.get('SERVE_MEDIA', '').lower() == 'true':
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
