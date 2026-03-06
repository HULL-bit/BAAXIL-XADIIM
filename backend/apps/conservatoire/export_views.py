"""Vue standalone pour l'export du rapport des séances (évite les conflits de routing)."""
from datetime import datetime
from django.http import HttpResponse

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, BasePermission

from .rapport_export import export_rapport_excel, export_rapport_pdf, export_rapport_csv


class IsAdminUserOrRole(BasePermission):
    """Autorise is_staff OU role='admin' (CustomUser)."""
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_staff or getattr(request.user, 'role', None) == 'admin')
        )


class RapportSeancesExportView(APIView):
    """Export PDF/Excel/CSV des séances de répétition. GET ?format=pdf|excel|csv"""
    permission_classes = [IsAuthenticated, IsAdminUserOrRole]

    def get(self, request):
        fmt = request.query_params.get('format', 'excel').lower()
        if fmt not in ('pdf', 'excel', 'xlsx', 'csv'):
            fmt = 'excel'

        date_debut, date_fin = None, None
        try:
            if request.query_params.get('date_debut'):
                date_debut = datetime.strptime(request.query_params['date_debut'], '%Y-%m-%d').date()
            if request.query_params.get('date_fin'):
                date_fin = datetime.strptime(request.query_params['date_fin'], '%Y-%m-%d').date()
        except (ValueError, TypeError):
            date_debut, date_fin = None, None

        buf = None
        content_type = 'application/octet-stream'
        filename = f'rapport_seances_{date_debut}_{date_fin}' if (date_debut and date_fin) else 'rapport_seances_toutes'
        if fmt in ('excel', 'xlsx'):
            buf = export_rapport_excel(date_debut, date_fin)
            content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            filename += '.xlsx'
        elif fmt == 'pdf':
            buf = export_rapport_pdf(date_debut, date_fin)
            content_type = 'application/pdf'
            filename += '.pdf'
        elif fmt == 'csv':
            buf = export_rapport_csv(date_debut, date_fin)
            content_type = 'text/csv; charset=utf-8'
            filename += '.csv'

        if buf is None:
            from rest_framework.response import Response
            return Response({'detail': 'Erreur génération.'}, status=500)

        resp = HttpResponse(buf.read(), content_type=content_type)
        resp['Content-Disposition'] = f'attachment; filename="{filename}"'
        return resp
