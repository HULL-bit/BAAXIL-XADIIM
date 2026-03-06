from datetime import datetime
from django.http import HttpResponse

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAdminUser, BasePermission
from apps.accounts.permissions import IsAdminOrJewrinConservatoire, has_admin_access


class IsAdminUserOrRole(BasePermission):
    """Autorise is_staff OU role='admin' (CustomUser) OU jewrin conservatoire."""
    def has_permission(self, request, view):
        return has_admin_access(request.user, 'conservatoire')
from rest_framework.response import Response

from .models import (
    CategorieDocument, DocumentNumerique, MediaAudio, MediaVideo,
    ArchiveHistorique, AlbumPhoto, Photo,
    Kourel, SeanceConservatoire, PresenceSeance, KhassidaRepetee
)
from .serializers import (
    CategorieDocumentSerializer, DocumentNumeriqueSerializer, MediaAudioSerializer,
    MediaVideoSerializer, ArchiveHistoriqueSerializer, AlbumPhotoSerializer, PhotoSerializer,
    KourelSerializer, SeanceConservatoireSerializer, PresenceSeanceSerializer
)


class CategorieDocumentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CategorieDocument.objects.all()
    serializer_class = CategorieDocumentSerializer
    permission_classes = [IsAuthenticated]


class DocumentNumeriqueViewSet(viewsets.ModelViewSet):
    queryset = DocumentNumerique.objects.select_related('telecharge_par', 'categorie').order_by('-date_ajout')
    serializer_class = DocumentNumeriqueSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['categorie', 'type_document']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinConservatoire()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(telecharge_par=self.request.user)


class MediaAudioViewSet(viewsets.ModelViewSet):
    queryset = MediaAudio.objects.select_related('upload_par').order_by('-date_ajout')
    serializer_class = MediaAudioSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['categorie']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinConservatoire()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(upload_par=self.request.user)


class MediaVideoViewSet(viewsets.ModelViewSet):
    queryset = MediaVideo.objects.select_related('upload_par').order_by('-date_ajout')
    serializer_class = MediaVideoSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['categorie']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinConservatoire()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(upload_par=self.request.user)


class ArchiveHistoriqueViewSet(viewsets.ModelViewSet):
    queryset = ArchiveHistorique.objects.select_related('archiviste').order_by('-annee', 'date_evenement')
    serializer_class = ArchiveHistoriqueSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['type_archive', 'annee']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinConservatoire()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(archiviste=self.request.user)


class AlbumPhotoViewSet(viewsets.ModelViewSet):
    queryset = AlbumPhoto.objects.select_related('cree_par').filter(est_public=True).order_by('-date_evenement')
    serializer_class = AlbumPhotoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = AlbumPhoto.objects.select_related('cree_par').all().order_by('-date_evenement')
        if not (self.request.user.is_staff or self.request.user.role == 'admin'):
            qs = qs.filter(est_public=True)
        return qs

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinConservatoire()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(cree_par=self.request.user)


class PhotoViewSet(viewsets.ModelViewSet):
    queryset = Photo.objects.select_related('album', 'photographe').order_by('album', 'ordre')
    serializer_class = PhotoSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['album']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinConservatoire()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(photographe=self.request.user)


class KourelViewSet(viewsets.ModelViewSet):
    queryset = Kourel.objects.all().prefetch_related('membres').select_related('maitre_de_coeur').order_by('ordre', 'nom')
    serializer_class = KourelSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = []

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinConservatoire()]
        return [IsAuthenticated()]


class SeanceConservatoireViewSet(viewsets.ModelViewSet):
    queryset = SeanceConservatoire.objects.all().select_related('kourel').prefetch_related('presences', 'presences__membre', 'khassidas').order_by('-date_heure')
    serializer_class = SeanceConservatoireSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['kourel', 'type_seance']

    def get_queryset(self):
        qs = SeanceConservatoire.objects.all().select_related('kourel').prefetch_related('presences', 'presences__membre', 'khassidas').order_by('-date_heure')
        # Membres voient les séances des kourels auxquels ils appartiennent
        if not has_admin_access(self.request.user, 'conservatoire'):
            qs = qs.filter(kourel__membres=self.request.user)
        return qs.distinct()

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinConservatoire()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(cree_par=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrJewrinConservatoire()])
    def presences(self, request, pk=None):
        """
        Met à jour les présences des membres du kourel pour cette séance.
        Payload: { "presences": [ { "membre": id, "statut": "present"|"absent_justifie"|"absent_non_justifie", "remarque": "" } ] }
        """
        seance = self.get_object()
        data = request.data.get('presences', [])
        kourel_membres = set(seance.kourel.membres.values_list('id', flat=True))
        for item in data:
            mid = item.get('membre')
            if mid not in kourel_membres:
                continue
            statut = item.get('statut', 'present')
            if statut not in ['present', 'absent_justifie', 'absent_non_justifie']:
                statut = 'present'
            PresenceSeance.objects.update_or_create(
                seance=seance,
                membre_id=mid,
                defaults={'statut': statut, 'remarque': item.get('remarque', '')}
            )
        serializer = SeanceConservatoireSerializer(seance)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated, IsAdminUserOrRole], url_path='rapport-export')
    def rapport_export(self, request):
        """
        Export rapport des séances de répétition (PDF, Excel, CSV).
        GET ?date_debut=YYYY-MM-DD&date_fin=YYYY-MM-DD&format=pdf|excel|csv
        """
        from .rapport_export import export_rapport_excel, export_rapport_pdf, export_rapport_csv

        fmt = request.query_params.get('format', 'excel').lower()
        if fmt not in ('pdf', 'excel', 'xlsx', 'csv'):
            fmt = 'excel'
        date_debut, date_fin = None, None
        try:
            date_debut_str = request.query_params.get('date_debut')
            date_fin_str = request.query_params.get('date_fin')
            if date_debut_str:
                date_debut = datetime.strptime(date_debut_str, '%Y-%m-%d').date()
            if date_fin_str:
                date_fin = datetime.strptime(date_fin_str, '%Y-%m-%d').date()
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
            return Response({'detail': 'Erreur génération. Vérifiez openpyxl et reportlab.'}, status=500)

        from django.http import HttpResponse
        resp = HttpResponse(buf.read(), content_type=content_type)
        resp['Content-Disposition'] = f'attachment; filename="{filename}"'
        return resp

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrJewrinConservatoire()])
    def khassidas(self, request, pk=None):
        """
        Met à jour les khassidas répétées pour cette séance.
        Payload: { "khassidas": [ { "nom_khassida": "...", "dathie": "Serigne Massamba", "khassida_portion": "...", "ordre": 0 } ] }
        """
        seance = self.get_object()
        data = request.data.get('khassidas', [])
        seance.khassidas.all().delete()
        for i, item in enumerate(data):
            nom = (item.get('nom_khassida') or '').strip()
            dathie = (item.get('dathie') or '').strip()
            if not nom or not dathie:
                continue
            KhassidaRepetee.objects.create(
                seance=seance,
                nom_khassida=nom,
                dathie=dathie,
                khassida_portion=(item.get('khassida_portion') or '').strip(),
                ordre=item.get('ordre', i)
            )
        serializer = SeanceConservatoireSerializer(seance)
        return Response(serializer.data)


class PresenceSeanceViewSet(viewsets.ModelViewSet):
    queryset = PresenceSeance.objects.all().select_related('seance', 'membre').order_by('seance', 'membre')
    serializer_class = PresenceSeanceSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['seance', 'membre', 'statut']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinConservatoire()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['get'])
    def stats_membres(self, request):
        """Pour chaque membre ayant des présences : nb_presents, nb_absents, nb_total, pourcentage."""
        from django.db.models import Count, Q
        qs = PresenceSeance.objects.values('membre').annotate(
            nb_total=Count('id'),
            nb_presents=Count('id', filter=Q(statut='present')),
            nb_absents=Count('id', filter=Q(statut__in=['absent_non_justifie', 'absent_justifie'])),
        )
        from django.contrib.auth import get_user_model
        User = get_user_model()
        result = []
        for row in qs:
            user = User.objects.filter(id=row['membre']).first()
            if not user:
                continue
            nb_total = row['nb_total'] or 0
            nb_presents = row['nb_presents'] or 0
            nb_absents = row['nb_absents'] or 0
            pourcentage = round((nb_presents / nb_total * 100), 1) if nb_total > 0 else 0
            result.append({
                'membre_id': row['membre'],
                'membre_nom': user.get_full_name() or user.username,
                'nb_presents': nb_presents,
                'nb_absents': nb_absents,
                'nb_total': nb_total,
                'pourcentage': pourcentage,
            })
        result.sort(key=lambda x: -x['pourcentage'])
        return Response(result)

