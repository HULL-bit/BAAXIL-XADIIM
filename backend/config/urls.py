from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

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
    path('api/', include('apps.documents.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# En production sans S3 configuré, servir quand même les médias stockés sur le
# disque local de Render — sinon toute photo/pièce jointe uploadée renvoie un 404
# même quand le fichier existe bien sur le disque (le stockage local reste
# éphémère entre deux déploiements sauf Disk Render monté sur MEDIA_ROOT_PATH ;
# préférez S3/CDN, déjà pris en charge ci-dessus, pour une vraie persistance).
if not settings.DEBUG and not settings.USE_S3_MEDIA:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
