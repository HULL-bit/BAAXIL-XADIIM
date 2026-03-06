from django.db.models import Sum

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.accounts.permissions import IsAdminOrJewrinOrganisation

from .models import (
    TypeReunion,
    Reunion,
    ProcesVerbal,
    Decision,
    Vote,
    StructureOrganisation,
    RapportActivite,
    Materiel,
    Regroupement,
    Section,
    SousSection,
    Dahira,
    Famille,
    LienFamilial,
)
from .serializers import (
    TypeReunionSerializer,
    ReunionSerializer,
    ProcesVerbalSerializer,
    DecisionSerializer,
    VoteSerializer,
    StructureOrganisationSerializer,
    RapportActiviteSerializer,
    MaterielSerializer,
    RegroupementSerializer,
    SectionSerializer,
    SousSectionSerializer,
    DahiraSerializer,
    FamilleSerializer,
    LienFamilialSerializer,
)


class TypeReunionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = TypeReunion.objects.all()
    serializer_class = TypeReunionSerializer
    permission_classes = [IsAuthenticated]


class ReunionViewSet(viewsets.ModelViewSet):
    queryset = Reunion.objects.select_related('organisateur', 'type_reunion').all().order_by('-date_reunion')
    serializer_class = ReunionSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['statut', 'type_reunion']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinOrganisation()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(organisateur=self.request.user)


class ProcesVerbalViewSet(viewsets.ModelViewSet):
    queryset = ProcesVerbal.objects.all().order_by('-date_redaction')
    serializer_class = ProcesVerbalSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['statut']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinOrganisation()]
        return [IsAuthenticated()]


class DecisionViewSet(viewsets.ModelViewSet):
    queryset = Decision.objects.all().order_by('-date_proposition')
    serializer_class = DecisionSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['statut', 'pv', 'reunion']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinOrganisation()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(propose_par=self.request.user)


class VoteViewSet(viewsets.ModelViewSet):
    queryset = Vote.objects.all().order_by('-date_ouverture')
    serializer_class = VoteSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['statut', 'decision']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinOrganisation()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(lance_par=self.request.user)


class StructureOrganisationViewSet(viewsets.ModelViewSet):
    queryset = StructureOrganisation.objects.all().order_by('ordre', 'nom')
    serializer_class = StructureOrganisationSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinOrganisation()]
        return [IsAuthenticated()]


class RapportActiviteViewSet(viewsets.ModelViewSet):
    queryset = RapportActivite.objects.all().order_by('-date_fin')
    serializer_class = RapportActiviteSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['periode']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinOrganisation()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(redige_par=self.request.user)


class MaterielViewSet(viewsets.ModelViewSet):
    queryset = Materiel.objects.all().order_by('nom')
    serializer_class = MaterielSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinOrganisation()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Statistiques globales et par catégorie sur les matériels du daara.
        """
        qs = self.get_queryset()
        aggregates = qs.aggregate(
            total_quantite=Sum('quantite_totale'),
            total_disponible=Sum('quantite_disponible'),
            total_defectueuse=Sum('quantite_defectueuse'),
        )
        total_quantite = aggregates['total_quantite'] or 0
        total_disponible = aggregates['total_disponible'] or 0
        total_defectueuse = aggregates['total_defectueuse'] or 0
        pourcentage_disponible = round(100 * total_disponible / total_quantite, 1) if total_quantite else 0

        # Stats par catégorie (None et '' fusionnés en "Non classé")
        par_categorie_by_label = {}
        categories = qs.values_list('categorie', flat=True).distinct()
        for cat in categories:
            cat_label = (cat or '').strip() or 'Non classé'
            sub = qs.filter(categorie=cat)
            agg = sub.aggregate(
                total=Sum('quantite_totale'),
                disponible=Sum('quantite_disponible'),
                defectueuse=Sum('quantite_defectueuse'),
            )
            t = agg['total'] or 0
            d = agg['disponible'] or 0
            defect = agg['defectueuse'] or 0
            nb = sub.count()
            if cat_label in par_categorie_by_label:
                prev = par_categorie_by_label[cat_label]
                prev['total_quantite'] += t
                prev['total_disponible'] += d
                prev['total_defectueuse'] += defect
                prev['nb_types'] += nb
            else:
                par_categorie_by_label[cat_label] = {
                    'categorie': cat_label,
                    'nb_types': nb,
                    'total_quantite': t,
                    'total_disponible': d,
                    'total_defectueuse': defect,
                    'pourcentage_disponible': 0,
                }
        for row in par_categorie_by_label.values():
            t = row['total_quantite']
            row['pourcentage_disponible'] = round(100 * row['total_disponible'] / t, 1) if t else 0
        par_categorie = list(par_categorie_by_label.values())

        data = {
            'total_types': qs.count(),
            'total_quantite': total_quantite,
            'total_disponible': total_disponible,
            'total_defectueuse': total_defectueuse,
            'pourcentage_disponible': pourcentage_disponible,
            'par_categorie': par_categorie,
        }
        return Response(data)


class RegroupementViewSet(viewsets.ModelViewSet):
    queryset = Regroupement.objects.all().order_by('nom')
    serializer_class = RegroupementSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        # Lecture publique (structure visible par tous), écriture réservée aux responsables
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinOrganisation()]
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]


class SectionViewSet(viewsets.ModelViewSet):
    queryset = Section.objects.select_related('regroupement').all().order_by('nom')
    serializer_class = SectionSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinOrganisation()]
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]


class SousSectionViewSet(viewsets.ModelViewSet):
    queryset = SousSection.objects.select_related('section', 'section__regroupement').all()
    serializer_class = SousSectionSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinOrganisation()]
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]


class DahiraViewSet(viewsets.ModelViewSet):
    queryset = Dahira.objects.select_related('sous_section', 'sous_section__section').all().order_by('nom')
    serializer_class = DahiraSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinOrganisation()]
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]


class FamilleViewSet(viewsets.ModelViewSet):
    queryset = Famille.objects.all().order_by('nom')
    serializer_class = FamilleSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinOrganisation()]
        return [IsAuthenticated()]


class LienFamilialViewSet(viewsets.ModelViewSet):
    queryset = LienFamilial.objects.select_related('famille', 'membre').all()
    serializer_class = LienFamilialSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinOrganisation()]
        return [IsAuthenticated()]
