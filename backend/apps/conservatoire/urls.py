from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
router = DefaultRouter()
router.register(r'conservatoire/categories', views.CategorieDocumentViewSet)
router.register(r'conservatoire/documents', views.DocumentNumeriqueViewSet)
router.register(r'conservatoire/audio', views.MediaAudioViewSet)
router.register(r'conservatoire/videos', views.MediaVideoViewSet)
router.register(r'conservatoire/archives', views.ArchiveHistoriqueViewSet)
router.register(r'conservatoire/albums', views.AlbumPhotoViewSet)
router.register(r'conservatoire/photos', views.PhotoViewSet)
router.register(r'conservatoire/kourels', views.KourelViewSet)
router.register(r'conservatoire/seances', views.SeanceConservatoireViewSet)
router.register(r'conservatoire/presences', views.PresenceSeanceViewSet)

# Route export AVANT router : sinon conservatoire/seances/<pk>/ capture "rapport-export"
from django.http import HttpResponse

def _rapport_export_wrapper(req):
    """Wrapper: appelle la logique d'export (contourne DRF ViewSet qui renvoyait 404)."""
    from rest_framework_simplejwt.authentication import JWTAuthentication
    # Auth JWT ou Session
    user = getattr(req, 'user', None)
    if not user or not user.is_authenticated:
        try:
            auth = JWTAuthentication()
            auth_result = auth.authenticate(req)
            if auth_result:
                user = auth_result[0]
        except Exception:
            pass
    if not user or not user.is_authenticated:
        from django.http import JsonResponse
        return JsonResponse({'detail': 'Authentification requise.'}, status=401)
    if not (user.is_staff or getattr(user, 'role', None) == 'admin'):
        from django.http import JsonResponse
        return JsonResponse({'detail': 'Droits insuffisants.'}, status=403)
    from .rapport_export import export_rapport_excel, export_rapport_pdf, export_rapport_csv
    fmt = req.GET.get('format', 'excel').lower()
    if fmt not in ('pdf', 'excel', 'xlsx', 'csv'):
        fmt = 'excel'
    buf = None
    content_type = 'application/octet-stream'
    filename = 'rapport_seances_toutes'
    if fmt in ('excel', 'xlsx'):
        buf = export_rapport_excel(None, None)
        content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        filename += '.xlsx'
    elif fmt == 'pdf':
        buf = export_rapport_pdf(None, None)
        content_type = 'application/pdf'
        filename += '.pdf'
    elif fmt == 'csv':
        buf = export_rapport_csv(None, None)
        content_type = 'text/csv; charset=utf-8'
        filename += '.csv'
    if not buf:
        return HttpResponse('Erreur génération', status=500)
    resp = HttpResponse(buf.read(), content_type=content_type)
    resp['Content-Disposition'] = f'attachment; filename="{filename}"'
    return resp
urlpatterns = [
    path('conservatoire/seances/rapport-export/', _rapport_export_wrapper),
    path('', include(router.urls)),
]
