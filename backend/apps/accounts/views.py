from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.utils import timezone

from .serializers import UserSerializer, UserCreateSerializer, UserMeSerializer, BadgeSerializer, AttributionBadgeSerializer
from .models import AttributionBadge
from .permissions import IsAdminRoleOrStaff

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserMeSerializer(self.user).data
        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    serializer = UserCreateSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def me(request):
    if request.method == 'GET':
        serializer = UserMeSerializer(request.user, context={'request': request})
        return Response(serializer.data)
    
    # Pour PATCH avec fichier (photo), DRF met les fichiers dans request.data directement
    # ou dans request.FILES selon le parser utilisé
    data = {}
    photo_file = None
    
    for key in request.data:
        value = request.data.get(key)
        if key == 'photo':
            # Vérifie si c'est un fichier (InMemoryUploadedFile ou TemporaryUploadedFile)
            if hasattr(value, 'read'):
                photo_file = value
        else:
            data[key] = value
    
    # Aussi vérifier request.FILES (au cas où)
    if not photo_file and request.FILES.get('photo'):
        photo_file = request.FILES.get('photo')
    
    if photo_file:
        data['photo'] = photo_file
    
    serializer = UserMeSerializer(request.user, data=data, partial=True, context={'request': request})
    if serializer.is_valid():
        user = serializer.save()
        if photo_file:
            from django.utils import timezone
            user.photo_updated_at = timezone.now()
            user.save(update_fields=['photo_updated_at'])
        # Recharger l'utilisateur pour avoir l'URL mise à jour
        user.refresh_from_db()
        return Response(UserMeSerializer(user, context={'request': request}).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')
    if not old_password or not new_password:
        return Response(
            {'detail': 'old_password et new_password requis'},
            status=status.HTTP_400_BAD_REQUEST
        )
    if not request.user.check_password(old_password):
        return Response(
            {'detail': 'Ancien mot de passe incorrect'},
            status=status.HTTP_400_BAD_REQUEST
        )
    if len(new_password) < 8:
        return Response(
            {'detail': 'Le nouveau mot de passe doit faire au moins 8 caractères'},
            status=status.HTTP_400_BAD_REQUEST
        )
    request.user.set_password(new_password)
    request.user.save(update_fields=['password'])
    return Response({'detail': 'Mot de passe modifié avec succès'})


class UserList(generics.ListAPIView):
    queryset = User.objects.filter(is_active=True).order_by('-date_inscription')
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdminRoleOrStaff]
    filterset_fields = ['role', 'est_actif']

    def get_queryset(self):
        # Optimize queries with select_related for foreign keys
        qs = User.objects.filter(is_active=True).select_related(
            'regroupement', 'section', 'sous_section', 'dahira'
        ).order_by('-date_inscription')
        dahira = self.request.query_params.get('dahira')
        sous_section = self.request.query_params.get('sous_section')
        section = self.request.query_params.get('section')
        regroupement = self.request.query_params.get('regroupement')
        if regroupement:
            qs = qs.filter(regroupement_id=regroupement)
        if section:
            qs = qs.filter(section_id=section)
        if sous_section:
            qs = qs.filter(sous_section_id=sous_section)
        if dahira:
            qs = qs.filter(dahira_id=dahira)
        return qs


class UserDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [IsAdminUser()]
        return [IsAuthenticated()]
    
    def partial_update(self, request, *args, **kwargs):
        """Override pour s'assurer que la catégorie est bien sauvegardée"""
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stats_admin(request):
    if not request.user.is_staff and request.user.role != 'admin':
        return Response({'detail': 'Non autorisé'}, status=403)
    from apps.accounts.models import CustomUser
    from apps.finance.models import CotisationMensuelle
    from apps.informations.models import Evenement

    now = timezone.now()
    annee = now.year
    mois = now.month

    # Aligné sur Gestion des membres : tous les utilisateurs actifs
    membres_actifs = CustomUser.objects.filter(is_active=True, est_actif=True).count()
    total_membres = CustomUser.objects.filter(is_active=True).count()
    # Cotisations du mois courant
    cotisations_total_ce_mois = CotisationMensuelle.objects.filter(annee=annee, mois=mois).count()
    cotisations_payees_ce_mois = CotisationMensuelle.objects.filter(
        annee=annee, mois=mois, statut='payee'
    ).count()
    if cotisations_total_ce_mois > 0:
        taux_paiement_cotisations_ce_mois = (cotisations_payees_ce_mois / cotisations_total_ce_mois) * 100
    else:
        taux_paiement_cotisations_ce_mois = 0.0

    # Global (toutes cotisations depuis le début)
    cotisations_total_global = CotisationMensuelle.objects.all().count()
    cotisations_payees_global = CotisationMensuelle.objects.filter(statut='payee').count()
    if cotisations_total_global > 0:
        taux_paiement_cotisations_global = (cotisations_payees_global / cotisations_total_global) * 100
    else:
        taux_paiement_cotisations_global = 0.0

    evenements_count = Evenement.objects.filter(est_publie=True).count()
    return Response({
        'membres_actifs': membres_actifs,
        'total_membres': total_membres,
        'cotisations_payees_ce_mois': cotisations_payees_ce_mois,
        'cotisations_total_ce_mois': cotisations_total_ce_mois,
        'taux_paiement_cotisations_ce_mois': round(taux_paiement_cotisations_ce_mois, 2),
        'cotisations_total_global': cotisations_total_global,
        'cotisations_payees_global': cotisations_payees_global,
        'taux_paiement_cotisations_global': round(taux_paiement_cotisations_global, 2),
        'evenements': evenements_count,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mes_badges(request):
    qs = AttributionBadge.objects.filter(user=request.user).select_related('badge')
    serializer = AttributionBadgeSerializer(qs, many=True)
    return Response(serializer.data)
