from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.db.models import Sum, Q, Count
from decimal import Decimal
from apps.accounts.permissions import IsAdminOrJewrinFinance, has_admin_access

from .models import CotisationMensuelle, LeveeFonds, Transaction, Don, ParametresFinanciers
from .serializers import CotisationMensuelleSerializer, LeveeFondsSerializer, TransactionSerializer, DonSerializer, ParametresFinanciersSerializer


class CotisationMensuelleViewSet(viewsets.ModelViewSet):
    queryset = CotisationMensuelle.objects.all().order_by('-annee', '-mois')
    serializer_class = CotisationMensuelleSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['membre', 'mois', 'annee', 'statut']

    def get_queryset(self):
        qs = CotisationMensuelle.objects.select_related('membre').order_by('-annee', '-mois')
        if not has_admin_access(self.request.user, 'finance'):
            qs = qs.filter(membre=self.request.user)
        else:
            section_id = self.request.query_params.get('section')
            dahira_id = self.request.query_params.get('dahira')
            if section_id:
                qs = qs.filter(membre__section_id=section_id)
            if dahira_id:
                qs = qs.filter(membre__dahira_id=dahira_id)
        return qs

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinFinance()]
        return [IsAuthenticated()]

    def perform_update(self, serializer):
        instance = serializer.save()
        if instance.statut == 'payee' and not instance.date_paiement:
            from django.utils import timezone
            instance.date_paiement = timezone.now()
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
        Pour chaque niveau : montant_total, montant_paye, pourcentage, nb_cotisations.
        Filtres optionnels : ?annee=2026&mois=2
        """
        if not has_admin_access(request.user, 'finance'):
            return Response({'detail': 'Non autorisé'}, status=status.HTTP_403_FORBIDDEN)

        from apps.organisation.models import Regroupement, Section, SousSection, Dahira

        qs = CotisationMensuelle.objects.select_related('membre').all()
        annee = request.query_params.get('annee')
        mois = request.query_params.get('mois')
        if annee:
            qs = qs.filter(annee=int(annee))
        if mois:
            qs = qs.filter(mois=int(mois))

        # Agrégats par niveau (clé = id, valeur = {montant_total, montant_paye, nb})
        by_reg = {}
        by_sec = {}
        by_ss = {}
        by_dahira = {}

        for c in qs:
            m = c.membre
            mt = float(c.montant)
            mp = mt if c.statut == 'payee' else 0
            for key, d in [(m.regroupement_id, by_reg), (m.section_id, by_sec), (m.sous_section_id, by_ss), (m.dahira_id, by_dahira)]:
                if key is None:
                    continue
                if key not in d:
                    d[key] = {'montant_total': 0, 'montant_paye': 0, 'nb': 0}
                d[key]['montant_total'] += mt
                d[key]['montant_paye'] += mp
                d[key]['nb'] += 1

        def pct(mt, mp):
            return round((mp / mt * 100), 2) if mt else 0

        from django.contrib.auth import get_user_model
        User = get_user_model()

        def build_dahiras(sous_section_id):
            return [
                {
                    'id': d.id,
                    'nom': d.nom,
                    'montant_total': round(by_dahira.get(d.id, {}).get('montant_total', 0), 2),
                    'montant_paye': round(by_dahira.get(d.id, {}).get('montant_paye', 0), 2),
                    'pct_paye': pct(by_dahira.get(d.id, {}).get('montant_total', 0), by_dahira.get(d.id, {}).get('montant_paye', 0)),
                    'nb_cotisations': by_dahira.get(d.id, {}).get('nb', 0),
                    'nb_membres': User.objects.filter(dahira_id=d.id, is_active=True).count(),
                }
                for d in Dahira.objects.filter(sous_section_id=sous_section_id).order_by('nom')
            ]

        def build_sous_sections(section_id):
            return [
                {
                    'id': ss.id,
                    'label': str(ss),
                    'montant_total': round(by_ss.get(ss.id, {}).get('montant_total', 0), 2),
                    'montant_paye': round(by_ss.get(ss.id, {}).get('montant_paye', 0), 2),
                    'pct_paye': pct(by_ss.get(ss.id, {}).get('montant_total', 0), by_ss.get(ss.id, {}).get('montant_paye', 0)),
                    'nb_cotisations': by_ss.get(ss.id, {}).get('nb', 0),
                    'dahiras': build_dahiras(ss.id),
                }
                for ss in SousSection.objects.filter(section_id=section_id).order_by('sexe')
            ]

        def build_sections(reg_id):
            return [
                {
                    'id': s.id,
                    'nom': s.nom,
                    'montant_total': round(by_sec.get(s.id, {}).get('montant_total', 0), 2),
                    'montant_paye': round(by_sec.get(s.id, {}).get('montant_paye', 0), 2),
                    'pct_paye': pct(by_sec.get(s.id, {}).get('montant_total', 0), by_sec.get(s.id, {}).get('montant_paye', 0)),
                    'nb_cotisations': by_sec.get(s.id, {}).get('nb', 0),
                    'sous_sections': build_sous_sections(s.id),
                }
                for s in Section.objects.filter(regroupement_id=reg_id).order_by('nom')
            ]

        regroupements = [
            {
                'id': r.id,
                'nom': r.nom,
                'code': getattr(r, 'code', ''),
                'montant_total': round(by_reg.get(r.id, {}).get('montant_total', 0), 2),
                'montant_paye': round(by_reg.get(r.id, {}).get('montant_paye', 0), 2),
                'pct_paye': pct(by_reg.get(r.id, {}).get('montant_total', 0), by_reg.get(r.id, {}).get('montant_paye', 0)),
                'nb_cotisations': by_reg.get(r.id, {}).get('nb', 0),
                'sections': build_sections(r.id),
            }
            for r in Regroupement.objects.all().order_by('nom')
        ]

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


class LeveeFondsViewSet(viewsets.ModelViewSet):
    queryset = LeveeFonds.objects.select_related('cree_par').filter(statut='active').order_by('-date_creation')
    serializer_class = LeveeFondsSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['statut']

    def get_queryset(self):
        qs = LeveeFonds.objects.select_related('cree_par').all().order_by('-date_creation')
        if not has_admin_access(self.request.user, 'finance'):
            qs = qs.filter(statut='active')
        return qs

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinFinance()]
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
    queryset = ParametresFinanciers.objects.all()
    serializer_class = ParametresFinanciersSerializer
    permission_classes = [IsAdminOrJewrinFinance()]
