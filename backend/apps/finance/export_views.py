"""
Export standalone des rapports finance (synthèse hiérarchique) en PDF/Excel.

Vue Django simple (pas un DRF APIView) : ?format= entre en conflit avec la
négociation de contenu DRF (URL_FORMAT_OVERRIDE='format'), qui renvoie 404 si
la valeur ne correspond à aucun renderer DRF — même contournement que
_rapport_cotisations_wrapper (finance/urls.py) et _rapport_export_wrapper
(conservatoire/urls.py).
"""
from django.http import HttpResponse, JsonResponse
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.accounts.permissions import has_admin_access
from .rapport_export import export_hierarchie_excel, export_hierarchie_pdf


def export_hierarchie_view(request):
    user = getattr(request, 'user', None)
    if not user or not user.is_authenticated:
        try:
            auth_result = JWTAuthentication().authenticate(request)
            if auth_result:
                user = auth_result[0]
        except Exception:
            pass
    if not user or not user.is_authenticated:
        return JsonResponse({'detail': 'Authentification requise.'}, status=401)
    if not has_admin_access(user, 'finance'):
        return JsonResponse({'detail': 'Droits insuffisants.'}, status=403)

    fmt = request.GET.get('format', 'excel').lower()
    if fmt not in ('pdf', 'excel', 'xlsx'):
        fmt = 'excel'
    annee = request.GET.get('annee')
    mois = request.GET.get('mois')

    buf = None
    content_type = 'application/octet-stream'
    filename = 'synthese_hierarchique'
    if annee:
        filename += f'_{annee}' + (f'_{mois}' if mois else '')
    if fmt in ('excel', 'xlsx'):
        buf = export_hierarchie_excel(annee, mois)
        content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        filename += '.xlsx'
    elif fmt == 'pdf':
        buf = export_hierarchie_pdf(annee, mois)
        content_type = 'application/pdf'
        filename += '.pdf'

    if buf is None:
        return JsonResponse({'detail': 'Erreur génération du rapport.'}, status=500)

    resp = HttpResponse(buf.read(), content_type=content_type)
    resp['Content-Disposition'] = f'attachment; filename="{filename}"'
    return resp
