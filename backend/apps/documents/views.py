from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from apps.accounts.permissions import IsAdminRoleOrStaff

from .models import Document
from .serializers import DocumentSerializer


class DocumentViewSet(viewsets.ModelViewSet):
    """
    Bibliothèque de documents (PDF, images, Excel, Word...) partagée à toute
    la plateforme : consultable par tout compte connecté, gérée (ajout,
    modification, suppression) par le Super Admin uniquement.
    """
    queryset = Document.objects.select_related('ajoute_par').all()
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get('search')
        type_fichier = self.request.query_params.get('type_fichier')
        categorie = self.request.query_params.get('categorie')
        if search:
            from django.db.models import Q
            qs = qs.filter(Q(nom__icontains=search) | Q(description__icontains=search))
        if type_fichier:
            qs = qs.filter(type_fichier=type_fichier)
        if categorie:
            qs = qs.filter(categorie__iexact=categorie)
        return qs

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminRoleOrStaff()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(ajoute_par=self.request.user)
