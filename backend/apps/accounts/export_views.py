"""
Export du rapport des membres (Excel/PDF) pour la page Gestion des membres.

Vue Django simple (pas un DRF APIView) : le paramètre ?format= entre en conflit
avec le mécanisme de négociation de contenu de DRF (URL_FORMAT_OVERRIDE='format'
par défaut), qui renvoie 404 si la valeur ne correspond à aucun renderer DRF
configuré — même bug déjà rencontré et contourné pour les exports conservatoire
et finance (cf. _rapport_export_wrapper / _rapport_cotisations_wrapper).
"""
from django.http import HttpResponse, JsonResponse
from rest_framework_simplejwt.authentication import JWTAuthentication

from .rapport_export import export_membres_excel, export_membres_pdf


def export_membres_view(request):
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
    if not (user.is_staff or getattr(user, 'role', None) == 'admin'):
        return JsonResponse({'detail': 'Droits insuffisants.'}, status=403)

    fmt = request.GET.get('format', 'excel').lower()
    if fmt not in ('pdf', 'excel', 'xlsx'):
        fmt = 'excel'

    buf = None
    content_type = 'application/octet-stream'
    filename = 'rapport_membres'
    if fmt in ('excel', 'xlsx'):
        buf = export_membres_excel(request.GET)
        content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        filename += '.xlsx'
    elif fmt == 'pdf':
        buf = export_membres_pdf(request.GET)
        content_type = 'application/pdf'
        filename += '.pdf'

    if buf is None:
        return JsonResponse({'detail': 'Erreur génération du rapport.'}, status=500)

    resp = HttpResponse(buf.read(), content_type=content_type)
    resp['Content-Disposition'] = f'attachment; filename="{filename}"'
    return resp
