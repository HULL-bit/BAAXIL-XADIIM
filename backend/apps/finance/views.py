from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.db.models import Sum, Q, Count
from decimal import Decimal
from apps.accounts.permissions import (
    IsFinanceWriteAccess,
    has_admin_access,
    is_super_admin,
    can_view_finance,
    can_write_finance,
    FINANCE_READ_ROLES,
    scope_filter,
)

from .models import CotisationMensuelle, LeveeFonds, Transaction, Don, ParametresFinanciers
from .serializers import CotisationMensuelleSerializer, LeveeFondsSerializer, TransactionSerializer, DonSerializer, ParametresFinanciersSerializer


class CotisationMensuelleViewSet(viewsets.ModelViewSet):
    queryset = CotisationMensuelle.objects.all().order_by('-annee', '-mois')
    serializer_class = CotisationMensuelleSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['membre', 'mois', 'annee', 'statut']

    def get_queryset(self):
        # Optimize queries with select_related and only necessary fields
        qs = CotisationMensuelle.objects.select_related('membre').order_by('-annee', '-mois')
        user = self.request.user
        role = getattr(user, 'role', None)
        if is_super_admin(user) or role in FINANCE_READ_ROLES:
            qs = scope_filter(qs, user, 'membre__dahira', 'membre__section')
            regroupement_id = self.request.query_params.get('regroupement')
            section_id = self.request.query_params.get('section')
            dahira_id = self.request.query_params.get('dahira')
            if regroupement_id:
                qs = qs.filter(membre__regroupement_id=regroupement_id)
            if section_id:
                qs = qs.filter(membre__section_id=section_id)
            if dahira_id:
                qs = qs.filter(membre__dahira_id=dahira_id)
        else:
            qs = qs.filter(membre=user)
        return qs

    def get_permissions(self):
        # Important : ce get_permissions() personnalisé prend le pas sur le
        # permission_classes déclaré directement sur @action — toute action réservée
        # à l'écriture finance doit donc être listée ici explicitement, sinon elle
        # retombe silencieusement sur IsAuthenticated (accessible à un simple membre).
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'valider_paiements', 'generer']:
            return [IsFinanceWriteAccess()]
        if self.action == 'generer_assignation_annuelle':
            # Réservé au Super Admin uniquement (aucun rôle Section n'a l'écriture
            # dans la matrice pilote — décision produit validée) : IsFinanceWriteAccess
            # laisserait passer un Secrétaire aux Finances de Cellule, trop permissif ici.
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        """Create cotisation with validated data."""
        from rest_framework.exceptions import PermissionDenied

        membre = serializer.validated_data.get('membre')
        if membre is not None and not can_write_finance(self.request.user, dahira_id=membre.dahira_id):
            raise PermissionDenied("Vous ne pouvez enregistrer une cotisation que pour un membre de votre propre cellule.")
        # Ensure type_cotisation is set before saving
        if not serializer.validated_data.get('type_cotisation'):
            serializer.validated_data['type_cotisation'] = 'mensualite'
        instance = serializer.save()
        # Double-check after save
        if not instance.type_cotisation:
            instance.type_cotisation = 'mensualite'
            instance.save(update_fields=['type_cotisation'])

    def perform_update(self, serializer):
        instance = serializer.save()
        if instance.statut == 'payee' and not instance.date_paiement:
            from django.utils import timezone
            instance.date_paiement = timezone.now()
            instance.save(update_fields=['date_paiement'])
        elif instance.statut != 'payee' and instance.date_paiement:
            # Ex : correction d'une validation faite par erreur (repassée en attente) —
            # on efface la date de paiement pour ne pas laisser une donnée incohérente.
            instance.date_paiement = None
            instance.save(update_fields=['date_paiement'])

    @action(detail=False, methods=['get'])
    def statistiques(self, request):
        """
        Statistiques globales sur les cotisations.
        - Pour un membre simple : uniquement ses cotisations.
        - Pour l'admin : toutes les cotisations, avec possibilité de filtrer.
        Filtres possibles : ?annee=2026&mois=2&membre=ID
        """
        qs = self.get_queryset()

        # Filtres optionnels pour affiner les stats
        annee = request.query_params.get('annee')
        mois = request.query_params.get('mois')
        membre_id = request.query_params.get('membre')
        # Filtres organisationnels
        dahira_id = request.query_params.get('dahira')
        sous_section_id = request.query_params.get('sous_section')
        section_id = request.query_params.get('section')
        regroupement_id = request.query_params.get('regroupement')

        if annee:
            qs = qs.filter(annee=annee)
        if mois:
            qs = qs.filter(mois=mois)
        # Le filtre membre est utile surtout pour l'admin qui veut voir un membre précis
        if membre_id:
            qs = qs.filter(membre_id=membre_id)

        # Filtres hiérarchiques (Ahibahil Khadim)
        if dahira_id:
            qs = qs.filter(membre__dahira_id=dahira_id)
        if sous_section_id:
            qs = qs.filter(membre__sous_section_id=sous_section_id)
        if section_id:
            qs = qs.filter(membre__section_id=section_id)
        if regroupement_id:
            qs = qs.filter(membre__regroupement_id=regroupement_id)

        total_assignations = qs.count()

        if total_assignations == 0:
            return Response({
                'total_assignations': 0,
                'total_payees': 0,
                'total_en_attente': 0,
                'total_retard': 0,
                'total_annulees': 0,
                'pourcentage_payees': 0.0,
                'montant_total_assigne': 0.0,
                'montant_total_paye': 0.0,
                'pourcentage_montant_paye': 0.0,
            })

        total_payees = qs.filter(statut='payee').count()
        total_en_attente = qs.filter(statut='en_attente').count()
        total_retard = qs.filter(statut='retard').count()
        total_annulees = qs.filter(statut='annulee').count()

        aggregates = qs.aggregate(
            montant_total_assigne=Sum('montant'),
            montant_total_paye=Sum('montant', filter=Q(statut='payee')),
        )

        montant_total_assigne = aggregates.get('montant_total_assigne') or Decimal('0')
        montant_total_paye = aggregates.get('montant_total_paye') or Decimal('0')

        pourcentage_payees = (total_payees / total_assignations) * 100 if total_assignations > 0 else 0
        pourcentage_montant_paye = (
            (montant_total_paye / montant_total_assigne) * 100 if montant_total_assigne > 0 else 0
        )

        # Top 5 dahiras les plus à jour (en pourcentage de cotisations payées)
        top_dahiras = []
        try:
            from apps.organisation.models import Dahira

            par_dahira = (
                qs.exclude(membre__dahira__isnull=True)
                .values('membre__dahira', 'membre__dahira__nom')
                .annotate(
                    total=Count('id'),
                    payees=Count('id', filter=Q(statut='payee')),
                )
            )
            for row in par_dahira:
                total = row['total'] or 0
                payees = row['payees'] or 0
                taux = (payees / total) * 100 if total else 0
                top_dahiras.append({
                    'dahira_id': row['membre__dahira'],
                    'dahira_nom': row['membre__dahira__nom'],
                    'total_cotisations': total,
                    'cotisations_payees': payees,
                    'taux_recouvrement': float(round(taux, 2)),
                })
            top_dahiras = sorted(top_dahiras, key=lambda x: (-x['taux_recouvrement'], -x['cotisations_payees']))[:5]
        except Exception:
            top_dahiras = []

        return Response({
            'total_assignations': total_assignations,
            'total_payees': total_payees,
            'total_en_attente': total_en_attente,
            'total_retard': total_retard,
            'total_annulees': total_annulees,
            'pourcentage_payees': float(round(pourcentage_payees, 2)),
            'montant_total_assigne': float(montant_total_assigne),
            'montant_total_paye': float(montant_total_paye),
            'pourcentage_montant_paye': float(round(pourcentage_montant_paye, 2)),
            'top_dahiras': top_dahiras,
        })

    @action(detail=False, methods=['get'])
    def stats_hierarchie(self, request):
        """
        Synthèse hiérarchique : Regroupement → Section → Sous-section → Dahira.
        Réservée aux rôles nationaux/section (Super Admin, national_lecture,
        finance_national, section_lecture) — un rôle de cellule voit déjà sa cellule
        via /finance/cotisations/ et n'a pas besoin de la vue multi-niveaux.
        Filtres optionnels : ?annee=2026&mois=2
        """
        from apps.accounts.permissions import user_scope

        user = request.user
        scope = user_scope(user)
        role = getattr(user, 'role', None)
        if scope['level'] not in ('all', 'national', 'section') or (
            scope['level'] != 'all' and role not in FINANCE_READ_ROLES
        ):
            return Response({'detail': 'Non autorisé'}, status=status.HTTP_403_FORBIDDEN)

        from .rapport_export import build_hierarchie_data

        annee = request.query_params.get('annee')
        mois = request.query_params.get('mois')
        only_pilote = scope['level'] in ('national', 'section')
        only_section_id = scope.get('section_id') if scope['level'] == 'section' else None
        regroupements = build_hierarchie_data(annee, mois, only_pilote=only_pilote, only_section_id=only_section_id)

        return Response({
            'annee': int(annee) if annee else None,
            'mois': int(mois) if mois else None,
            'regroupements': regroupements,
        })

    @action(detail=True, methods=['post'])
    def payer(self, request, pk=None):
        """Membre déclare un paiement (référence Wave/OM). Seul l'admin marque comme payée après vérification."""
        cotisation = self.get_object()
        if cotisation.membre != request.user:
            return Response({'detail': 'Non autorisé'}, status=status.HTTP_403_FORBIDDEN)
        if cotisation.statut == 'payee':
            return Response({'detail': 'Cette cotisation est déjà marquée comme payée.'}, status=status.HTTP_400_BAD_REQUEST)
        reference_wave = request.data.get('reference_wave', '').strip()
        mode_paiement = request.data.get('mode_paiement', 'wave')
        cotisation.reference_wave = reference_wave or cotisation.reference_wave
        cotisation.mode_paiement = mode_paiement
        cotisation.save(update_fields=['reference_wave', 'mode_paiement'])
        return Response(CotisationMensuelleSerializer(cotisation).data)

    @action(detail=False, methods=['post'], permission_classes=[IsFinanceWriteAccess])
    def valider_paiements(self, request):
        """
        Valide en une fois plusieurs cotisations déclarées payées par les membres
        (coche + bouton côté Secrétaire aux Finances de Cellule ou Super Admin). Body : {"ids": [1, 2, 3]}
        """
        from django.utils import timezone

        ids = request.data.get('ids') or []
        if not isinstance(ids, list) or not ids:
            return Response({'detail': 'ids (liste) requis.'}, status=status.HTTP_400_BAD_REQUEST)

        # Un Secrétaire aux Finances de Cellule ne peut valider que les cotisations
        # de ses propres membres — on repart du queryset scopé (get_queryset), pas
        # de CotisationMensuelle.objects.all(), pour ne jamais valider hors périmètre.
        qs = self.get_queryset().filter(id__in=ids).exclude(statut='payee')
        updated = qs.update(statut='payee', date_paiement=timezone.now())
        return Response({'valides': updated})

    @action(detail=False, methods=['post'], permission_classes=[IsFinanceWriteAccess])
    def generer(self, request):
        """
        Génère automatiquement les cotisations mensuelles de tous les membres actifs
        pour un mois/année donnés, en utilisant le montant_cotisation assigné à chaque membre.
        Idempotent : relancer pour un mois déjà généré ne crée pas de doublons
        (unique_together membre/mois/annee/type_cotisation).
        Body : {"mois": 1-12, "annee": ex. 2026}
        """
        from datetime import date
        from django.contrib.auth import get_user_model

        try:
            mois = int(request.data.get('mois'))
            annee = int(request.data.get('annee'))
        except (TypeError, ValueError):
            return Response({'detail': 'mois et annee sont requis (entiers).'}, status=status.HTTP_400_BAD_REQUEST)
        if not (1 <= mois <= 12):
            return Response({'detail': 'mois doit être entre 1 et 12.'}, status=status.HTTP_400_BAD_REQUEST)

        User = get_user_model()
        jour_echeance = 5
        parametres = ParametresFinanciers.objects.first()
        if parametres:
            jour_echeance = parametres.jour_echeance_cotisation

        # bulk_create + une seule requête pour les cotisations déjà existantes, au lieu
        # d'un get_or_create par membre (jusqu'à ~1800 allers-retours avec les ~900
        # membres actuels — c'est cette version qui prenait plusieurs minutes en pratique).
        membres = list(User.objects.filter(is_active=True, est_actif=True))
        existing_membre_ids = set(
            CotisationMensuelle.objects.filter(mois=mois, annee=annee, type_cotisation='mensualite')
            .values_list('membre_id', flat=True)
        )
        date_echeance = date(annee, mois, min(jour_echeance, 28))
        to_create = [
            CotisationMensuelle(
                membre=membre,
                mois=mois,
                annee=annee,
                type_cotisation='mensualite',
                montant=membre.montant_cotisation,
                date_echeance=date_echeance,
                statut='en_attente',
            )
            for membre in membres
            if membre.id not in existing_membre_ids
        ]
        CotisationMensuelle.objects.bulk_create(to_create)
        created = len(to_create)
        already_existing = len(membres) - created

        return Response({
            'mois': mois,
            'annee': annee,
            'total_membres': len(membres),
            'created': created,
            'already_existing': already_existing,
        })

    @action(detail=False, methods=['post'], permission_classes=[IsAdminUser])
    def generer_assignation_annuelle(self, request):
        """
        Crée une assignation annuelle pour une Section, répartie à parts égales entre
        les membres actifs des cellules pilotes de cette section (audit : "assignation
        annuelle par section qui sera départagée sur les membres"). Réservé au Super
        Admin — aucun rôle Section n'a l'écriture dans la matrice pilote.
        Idempotent par (membre, annee, type_cotisation='assignation') — mois=0
        représente une échéance annuelle (pas de mensualité associée).
        Body : {"section": <id>, "annee": 2026, "montant_total": 500000, "objet": "..."}
        """
        from datetime import date

        section_id = request.data.get('section')
        objet = (request.data.get('objet') or '').strip()
        try:
            annee = int(request.data.get('annee'))
            montant_total = Decimal(str(request.data.get('montant_total')))
        except (TypeError, ValueError, ArithmeticError):
            return Response({'detail': 'section, annee et montant_total (nombre) sont requis.'}, status=status.HTTP_400_BAD_REQUEST)
        if not section_id or montant_total <= 0:
            return Response({'detail': 'section requis et montant_total doit être positif.'}, status=status.HTTP_400_BAD_REQUEST)

        from django.contrib.auth import get_user_model
        User = get_user_model()

        membres = list(
            User.objects.filter(
                is_active=True, est_actif=True,
                section_id=section_id,
                dahira__est_pilote=True,
            ).order_by('id')
        )
        if not membres:
            return Response({'detail': "Aucun membre actif dans une cellule pilote de cette section."}, status=status.HTTP_400_BAD_REQUEST)

        nb = len(membres)
        montant_base = (montant_total / nb).quantize(Decimal('0.01'))
        # Reliquat d'arrondi affecté aux premiers membres pour que la somme distribuée
        # corresponde exactement au montant_total voté.
        reliquat = montant_total - (montant_base * nb)
        centime = Decimal('0.01')

        existing_membre_ids = set(
            CotisationMensuelle.objects.filter(annee=annee, mois=0, type_cotisation='assignation', membre__in=membres)
            .values_list('membre_id', flat=True)
        )
        date_echeance = date(annee, 12, 31)
        to_create = []
        for i, membre in enumerate(membres):
            if membre.id in existing_membre_ids:
                continue
            montant = montant_base + (centime if reliquat > 0 and i < int(reliquat / centime) else Decimal('0.00'))
            to_create.append(CotisationMensuelle(
                membre=membre,
                mois=0,
                annee=annee,
                type_cotisation='assignation',
                objet_assignation=objet,
                montant=montant,
                date_echeance=date_echeance,
                statut='en_attente',
            ))
        CotisationMensuelle.objects.bulk_create(to_create)

        return Response({
            'section': int(section_id),
            'annee': annee,
            'montant_total': float(montant_total),
            'montant_par_membre': float(montant_base),
            'total_membres': nb,
            'created': len(to_create),
            'already_existing': nb - len(to_create),
        })


class LeveeFondsViewSet(viewsets.ModelViewSet):
    queryset = LeveeFonds.objects.select_related('cree_par').filter(statut='active').order_by('-date_creation')
    serializer_class = LeveeFondsSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['statut']
    pagination_class = None  # Disable pagination for simplicity

    def get_queryset(self):
        qs = LeveeFonds.objects.select_related('cree_par').all().order_by('-date_creation')
        if not has_admin_access(self.request.user, 'finance'):
            qs = qs.filter(statut='active')
        return qs

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsFinanceWriteAccess()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(cree_par=self.request.user)

    @action(detail=True, methods=['post'])
    def participer(self, request, pk=None):
        """Permet à un membre (y compris admin) de participer à une levée de fonds.
        Crée une transaction en attente qui sera validée après confirmation du paiement Wave."""
        levee_fonds = self.get_object()
        # Utiliser le statut réel calculé en fonction de la date de fin
        if levee_fonds.statut_reel != 'active':
            return Response({'detail': 'Cette levée de fonds n\'est plus active.'}, status=status.HTTP_400_BAD_REQUEST)
        
        montant = request.data.get('montant')
        description = request.data.get('description', f'Participation à {levee_fonds.titre}')
        
        if not montant:
            return Response({'detail': 'Montant requis.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            montant_decimal = Decimal(str(montant))
            if montant_decimal <= 0:
                return Response({'detail': 'Le montant doit être positif.'}, status=status.HTTP_400_BAD_REQUEST)
        except (ValueError, TypeError):
            return Response({'detail': 'Montant invalide.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Générer une référence interne unique
        import uuid
        reference_interne = f"LF-{levee_fonds.id}-{uuid.uuid4().hex[:8].upper()}"
        
        # Créer la transaction en attente (sera validée après confirmation Wave)
        transaction = Transaction.objects.create(
            membre=request.user,
            type_transaction='levee_fonds',
            montant=montant_decimal,
            description=description,
            reference_interne=reference_interne,
            levee_fonds=levee_fonds,
            statut='en_attente',  # En attente de confirmation du paiement Wave
        )
        
        return Response({
            **TransactionSerializer(transaction).data,
            'lien_wave': levee_fonds.lien_paiement_wave,
            'reference_transaction': reference_interne,
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def confirmer_paiement(self, request, pk=None):
        """Confirme qu'un paiement Wave a été effectué pour une transaction.
        Met à jour la transaction avec la référence Wave et la valide."""
        levee_fonds = self.get_object()
        reference_interne = request.data.get('reference_interne', '').strip()
        reference_wave = request.data.get('reference_wave', '').strip()
        
        if not reference_wave:
            return Response({'detail': 'Référence Wave requise pour confirmer le paiement.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Trouver la transaction
        try:
            if reference_interne:
                # Chercher par référence interne si fournie
                transaction = Transaction.objects.get(
                    reference_interne=reference_interne,
                    levee_fonds=levee_fonds,
                    membre=request.user,
                    statut='en_attente'
                )
            else:
                # Sinon, chercher la transaction en attente la plus récente pour ce membre et cette levée de fonds
                transaction = Transaction.objects.filter(
                    levee_fonds=levee_fonds,
                    membre=request.user,
                    statut='en_attente'
                ).order_by('-date_transaction').first()
                
                if not transaction:
                    return Response({'detail': 'Aucune transaction en attente trouvée. Veuillez d\'abord créer une transaction via BARKELOU.'}, status=status.HTTP_404_NOT_FOUND)
        except Transaction.DoesNotExist:
            return Response({'detail': 'Transaction introuvable ou déjà validée.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Vérifier que cette référence Wave n'a pas déjà été utilisée
        existing = Transaction.objects.filter(
            reference_wave=reference_wave,
            levee_fonds=levee_fonds,
            statut='validee'
        ).exclude(id=transaction.id).first()
        
        if existing:
            return Response({'detail': 'Cette référence Wave a déjà été utilisée pour une autre transaction.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Mettre à jour avec la référence Wave et valider
        transaction.reference_wave = reference_wave
        transaction.statut = 'validee'
        transaction.save(update_fields=['reference_wave', 'statut'])
        # Le save() de Transaction mettra à jour automatiquement montant_collecte
        
        return Response(TransactionSerializer(transaction).data, status=status.HTTP_200_OK)


class DepenseHadiyaViewSet(viewsets.ModelViewSet):
    """
    Dépenses et Hadiya de cellule (audit : "enregistrement des cotisations, hadiya et
    dépenses de sa propre cellule uniquement"). Réutilise le modèle Transaction —
    `membre` porte ici le Secrétaire aux Finances qui enregistre l'opération (pas un
    payeur), ce qui permet de scoper par sa cellule (`membre__dahira`) comme pour les
    cotisations.
    """
    queryset = Transaction.objects.filter(type_transaction__in=['depense', 'hadiya']).order_by('-date_transaction')
    serializer_class = TransactionSerializer
    filterset_fields = ['type_transaction']

    def get_queryset(self):
        qs = Transaction.objects.filter(type_transaction__in=['depense', 'hadiya']).select_related('membre').order_by('-date_transaction')
        user = self.request.user
        role = getattr(user, 'role', None)
        if is_super_admin(user) or role in FINANCE_READ_ROLES:
            return scope_filter(qs, user, 'membre__dahira', 'membre__section')
        return qs.none()

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsFinanceWriteAccess()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        import uuid
        montant = serializer.validated_data.get('montant')
        type_transaction = serializer.validated_data.get('type_transaction')
        if type_transaction not in ('depense', 'hadiya'):
            type_transaction = 'depense'
        serializer.save(
            membre=self.request.user,
            type_transaction=type_transaction,
            statut='validee',
            reference_interne=f"{type_transaction.upper()}-{self.request.user.dahira_id or 0}-{uuid.uuid4().hex[:8].upper()}",
        )


class TransactionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Transaction.objects.all().order_by('-date_transaction')
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['type_transaction', 'statut', 'membre']

    def get_queryset(self):
        qs = Transaction.objects.all().select_related('membre').order_by('-date_transaction')
        if not has_admin_access(self.request.user, 'finance'):
            qs = qs.filter(membre=self.request.user)
        return qs


class DonViewSet(viewsets.ModelViewSet):
    queryset = Don.objects.all().order_by('-date_don')
    serializer_class = DonSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Don.objects.all().order_by('-date_don')
        if not has_admin_access(self.request.user, 'finance'):
            qs = qs.filter(donateur=self.request.user)
        return qs

    def perform_create(self, serializer):
        serializer.save(donateur=self.request.user)


class ParametresFinanciersViewSet(viewsets.ReadOnlyModelViewSet):
    # Lecture ouverte à tout membre authentifié (nécessaire pour que Barkelou affiche
    # le lien de paiement Wave) : ReadOnlyModelViewSet n'expose que du GET, données
    # non sensibles (lien de paiement, montant par défaut).
    queryset = ParametresFinanciers.objects.all().order_by('id')
    serializer_class = ParametresFinanciersSerializer
    permission_classes = [IsAuthenticated]
