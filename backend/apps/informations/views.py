from rest_framework import generics, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from django.db import models

from apps.accounts.permissions import IsAdminOrJewrinCommunication
from .models import (
    Groupe,
    Evenement,
    ParticipationEvenement,
    Publication,
    Annonce,
    GalerieMedia,
    News,
    NewsLike,
    NewsSave,
    NewsComment,
)
from .serializers import (
    GroupeSerializer,
    EvenementSerializer,
    ParticipationEvenementSerializer,
    PublicationSerializer,
    AnnonceSerializer,
    GalerieMediaSerializer,
    NewsSerializer,
    NewsCommentSerializer,
)


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


class NewsViewSet(viewsets.ModelViewSet):
    serializer_class = NewsSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = News.objects.select_related('auteur').all().order_by('-date_creation')
        if not IsAdminOrJewrinCommunication().has_permission(self.request, self):
            qs = qs.filter(est_publiee=True)
        user = self.request.user
        return qs.annotate(
            likes_count=models.Count('likes', distinct=True),
            comments_count=models.Count('comments', distinct=True),
            saves_count=models.Count('saves', distinct=True),
            liked=models.Exists(NewsLike.objects.filter(news=models.OuterRef('pk'), user=user)),
            saved=models.Exists(NewsSave.objects.filter(news=models.OuterRef('pk'), user=user)),
        )

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinCommunication()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(auteur=self.request.user)

    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        news = self.get_object()
        NewsLike.objects.get_or_create(news=news, user=request.user)
        return Response({'detail': 'ok'})

    @action(detail=True, methods=['post'])
    def unlike(self, request, pk=None):
        news = self.get_object()
        NewsLike.objects.filter(news=news, user=request.user).delete()
        return Response({'detail': 'ok'})

    @action(detail=True, methods=['post'])
    def save(self, request, pk=None):
        news = self.get_object()
        NewsSave.objects.get_or_create(news=news, user=request.user)
        return Response({'detail': 'ok'})

    @action(detail=True, methods=['post'])
    def unsave(self, request, pk=None):
        news = self.get_object()
        NewsSave.objects.filter(news=news, user=request.user).delete()
        return Response({'detail': 'ok'})

    @action(detail=True, methods=['get'])
    def comments(self, request, pk=None):
        news = self.get_object()
        qs = NewsComment.objects.filter(news=news).select_related('user')
        ser = NewsCommentSerializer(qs, many=True)
        return Response(ser.data)

    @action(detail=True, methods=['post'])
    def add_comment(self, request, pk=None):
        news = self.get_object()
        txt = (request.data.get('commentaire') or '').strip()
        if not txt:
            return Response({'detail': 'Commentaire requis.'}, status=status.HTTP_400_BAD_REQUEST)
        c = NewsComment.objects.create(news=news, user=request.user, commentaire=txt)
        return Response(NewsCommentSerializer(c).data, status=status.HTTP_201_CREATED)
