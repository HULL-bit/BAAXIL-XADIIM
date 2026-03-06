from rest_framework import generics, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny

from .models import Groupe, Evenement, ParticipationEvenement, Publication, Annonce, GalerieMedia
from .serializers import GroupeSerializer, EvenementSerializer, ParticipationEvenementSerializer, PublicationSerializer, AnnonceSerializer, GalerieMediaSerializer


class GroupeViewSet(viewsets.ModelViewSet):
    queryset = Groupe.objects.filter(est_actif=True)
    serializer_class = GroupeSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]


class EvenementViewSet(viewsets.ModelViewSet):
    queryset = Evenement.objects.select_related('cree_par').filter(est_publie=True).order_by('-date_debut')
    serializer_class = EvenementSerializer
    filterset_fields = ['type_evenement', 'est_publie']

    def get_queryset(self):
        qs = Evenement.objects.select_related('cree_par').all().order_by('-date_debut')
        if not (self.request.user.is_staff or self.request.user.role == 'admin'):
            qs = qs.filter(est_publie=True)
        return qs

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(cree_par=self.request.user)

    @action(detail=True, methods=['post'])
    def s_inscrire(self, request, pk=None):
        evt = self.get_object()
        part, created = ParticipationEvenement.objects.get_or_create(evenement=evt, membre=request.user)
        if not created:
            return Response({'detail': 'Déjà inscrit'}, status=400)
        return Response({'detail': 'Inscription enregistrée'}, status=201)

    @action(detail=True, methods=['post'])
    def se_desinscrire(self, request, pk=None):
        evt = self.get_object()
        deleted, _ = ParticipationEvenement.objects.filter(evenement=evt, membre=request.user).delete()
        if not deleted:
            return Response({'detail': 'Non inscrit'}, status=400)
        return Response(status=204)


class PublicationViewSet(viewsets.ModelViewSet):
    queryset = Publication.objects.filter(est_publiee=True).order_by('-date_publication')
    serializer_class = PublicationSerializer
    filterset_fields = ['categorie', 'est_publiee']

    def get_queryset(self):
        qs = Publication.objects.all().order_by('-date_publication')
        if not (self.request.user.is_staff or self.request.user.role == 'admin'):
            qs = qs.filter(est_publiee=True)
        return qs

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(auteur=self.request.user)


class AnnonceViewSet(viewsets.ModelViewSet):
    queryset = Annonce.objects.filter(est_active=True).order_by('-date_publication')
    serializer_class = AnnonceSerializer
    filterset_fields = ['priorite', 'est_active']

    def get_queryset(self):
        qs = Annonce.objects.all().order_by('-date_publication')
        if not (self.request.user.is_staff or self.request.user.role == 'admin'):
            qs = qs.filter(est_active=True)
        return qs

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(auteur=self.request.user)


class GalerieMediaViewSet(viewsets.ModelViewSet):
    queryset = GalerieMedia.objects.all().order_by('-date_upload')
    serializer_class = GalerieMediaSerializer
    filterset_fields = ['type_media', 'evenement']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]
