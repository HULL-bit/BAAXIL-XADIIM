from django.urls import path, include
from django.http import HttpResponse
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.authentication import JWTAuthentication
from . import views

router = DefaultRouter()
router.register(r'cotisations', views.CotisationMensuelleViewSet)
router.register(r'levees-fonds', views.LeveeFondsViewSet)
router.register(r'transactions', views.TransactionViewSet)
router.register(r'dons', views.DonViewSet)
router.register(r'parametres-financiers', views.ParametresFinanciersViewSet)


def _rapport_cotisations_wrapper(req):
    """Export PDF/Excel des cotisations. GET ?format=pdf|excel&annee=&mois=&date_debut=&date_fin="""
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

    from datetime import datetime
    from .rapport_export import export_rapport_excel, export_rapport_pdf

    fmt = req.GET.get('format', 'excel').lower()
    if fmt not in ('pdf', 'excel', 'xlsx'):
        fmt = 'excel'
    annee = req.GET.get('annee')
    mois = req.GET.get('mois')
    date_debut_str = req.GET.get('date_debut')
    date_fin_str = req.GET.get('date_fin')
    annee = int(annee) if annee and annee.isdigit() else None
    mois = int(mois) if mois and mois.isdigit() and 1 <= int(mois) <= 12 else None
    date_debut = None
    date_fin = None
    try:
        if date_debut_str:
            date_debut = datetime.strptime(date_debut_str, '%Y-%m-%d').date()
        if date_fin_str:
            date_fin = datetime.strptime(date_fin_str, '%Y-%m-%d').date()
    except (ValueError, TypeError):
        pass

    buf = None
    content_type = 'application/octet-stream'
    filename = 'rapport_cotisations'
    if annee:
        filename += f'_an{annee}'
        if mois:
            filename += f'_m{mois}'
    filename += '_toutes' if not (annee or date_debut) else ''
    if fmt in ('excel', 'xlsx'):
        buf = export_rapport_excel(date_debut, date_fin, annee, mois)
        content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        filename += '.xlsx'
    elif fmt == 'pdf':
        buf = export_rapport_pdf(date_debut, date_fin, annee, mois)
        content_type = 'application/pdf'
        filename += '.pdf'

    if not buf:
        return HttpResponse('Erreur génération.', status=500)
    resp = HttpResponse(buf.read(), content_type=content_type)
    resp['Content-Disposition'] = f'attachment; filename="{filename}"'
    return resp


urlpatterns = [
    path('finance/export-rapport-cotisations/', _rapport_cotisations_wrapper),
    path('finance/', include(router.urls)),
]
