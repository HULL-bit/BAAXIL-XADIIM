from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from apps.accounts.permissions import IsAdminOrJewrinSociale

from .models import ProjetEntraide, ActionSociale, Beneficiaire, AideAccordee, ContributionSociale
from .serializers import (
    ProjetEntraideSerializer,
    ActionSocialeSerializer,
    BeneficiaireSerializer,
    AideAccordeeSerializer,
    ContributionSocialeSerializer,
)


class ProjetEntraideViewSet(viewsets.ModelViewSet):
    queryset = ProjetEntraide.objects.all().order_by('-date_creation')
    serializer_class = ProjetEntraideSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['statut', 'categorie']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'assignations']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(responsable=self.request.user)

    @action(detail=True, methods=['post'])
    def assignations(self, request, pk=None):
        """Enregistrer en une fois les montants à contribuer pour chaque membre."""
        projet = self.get_object()
        assignations = request.data.get('assignations', [])
        if not isinstance(assignations, list):
            return Response({'detail': 'assignations doit être une liste.'}, status=status.HTTP_400_BAD_REQUEST)
        created = updated = deleted = 0
        for item in assignations:
            membre_id = item.get('membre')
            montant = item.get('montant')
            if membre_id is None:
                continue
            try:
                montant_val = int(montant) if montant not in (None, '') else 0
            except (TypeError, ValueError):
                montant_val = 0
            contrib, created_contrib = ContributionSociale.objects.get_or_create(
                projet=projet, membre_id=membre_id,
                defaults={'montant': montant_val, 'statut': 'en_attente'}
            )
            if created_contrib:
                created += 1
            else:
                if montant_val <= 0:
                    contrib.delete()
                    deleted += 1
                else:
                    contrib.montant = montant_val
                    contrib.save(update_fields=['montant'])
                    updated += 1
        return Response({
            'created': created, 'updated': updated, 'deleted': deleted,
            'detail': f'{created} créée(s), {updated} mise(s) à jour, {deleted} supprimée(s).'
        })


class ActionSocialeViewSet(viewsets.ModelViewSet):
    queryset = ActionSociale.objects.all().order_by('-date_action')
    serializer_class = ActionSocialeSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['type_action', 'projet']


class BeneficiaireViewSet(viewsets.ModelViewSet):
    queryset = Beneficiaire.objects.filter(est_actif=True).order_by('nom_complet')
    serializer_class = BeneficiaireSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['categorie', 'est_actif']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinSociale()]
        return [IsAuthenticated()]


class AideAccordeeViewSet(viewsets.ModelViewSet):
    queryset = AideAccordee.objects.all().order_by('-date_aide')
    serializer_class = AideAccordeeSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['beneficiaire', 'type_aide', 'projet']

    def perform_create(self, serializer):
        serializer.save(accorde_par=self.request.user)

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinSociale()]
        return [IsAuthenticated()]


class ContributionSocialeViewSet(viewsets.ModelViewSet):
    queryset = ContributionSociale.objects.all().order_by('-date_creation')
    serializer_class = ContributionSocialeSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['projet', 'membre', 'statut']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinSociale()]
        return [IsAuthenticated()]
