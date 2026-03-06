from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from apps.accounts.permissions import IsAdminOrJewrinScientifique, has_admin_access

from .models import DomaineScientifique, Cours, ModuleCours, LeconCours, InscriptionCours, OuvrageScientifique, PublicationScientifique
from .serializers import DomaineScientifiqueSerializer, CoursSerializer, ModuleCoursSerializer, LeconCoursSerializer, InscriptionCoursSerializer, OuvrageScientifiqueSerializer, PublicationScientifiqueSerializer


class DomaineScientifiqueViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DomaineScientifique.objects.all()
    serializer_class = DomaineScientifiqueSerializer
    permission_classes = [IsAuthenticated]


class CoursViewSet(viewsets.ModelViewSet):
    queryset = Cours.objects.filter(statut='publie').order_by('-date_creation')
    serializer_class = CoursSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['statut', 'niveau', 'domaine']

    def get_queryset(self):
        qs = Cours.objects.all().order_by('-date_creation')
        if not has_admin_access(self.request.user, 'scientifique'):
            qs = qs.filter(statut='publie')
        return qs

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinScientifique()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(formateur=self.request.user)

    @action(detail=True, methods=['post'])
    def s_inscrire(self, request, pk=None):
        cours = self.get_object()
        insc, created = InscriptionCours.objects.get_or_create(cours=cours, apprenant=request.user)
        if not created:
            return Response({'detail': 'Déjà inscrit'}, status=400)
        return Response({'detail': 'Inscription enregistrée'}, status=201)


class ModuleCoursViewSet(viewsets.ModelViewSet):
    queryset = ModuleCours.objects.all().order_by('cours', 'ordre')
    serializer_class = ModuleCoursSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['cours']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinScientifique()]
        return [IsAuthenticated()]


class LeconCoursViewSet(viewsets.ModelViewSet):
    queryset = LeconCours.objects.all().order_by('module', 'ordre')
    serializer_class = LeconCoursSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['module']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinScientifique()]
        return [IsAuthenticated()]


class InscriptionCoursViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = InscriptionCours.objects.all()
    serializer_class = InscriptionCoursSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = InscriptionCours.objects.all().select_related('cours', 'apprenant')
        if not (self.request.user.is_staff or self.request.user.role == 'admin'):
            qs = qs.filter(apprenant=self.request.user)
        return qs


class OuvrageScientifiqueViewSet(viewsets.ModelViewSet):
    queryset = OuvrageScientifique.objects.all().order_by('-date_ajout')
    serializer_class = OuvrageScientifiqueSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['domaine']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinScientifique()]
        return [IsAuthenticated()]


class PublicationScientifiqueViewSet(viewsets.ModelViewSet):
    queryset = PublicationScientifique.objects.all().order_by('-annee')
    serializer_class = PublicationScientifiqueSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['type_publication', 'domaine', 'annee']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinScientifique()]
        return [IsAuthenticated()]
