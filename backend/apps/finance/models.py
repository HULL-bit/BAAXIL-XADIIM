from django.db import models
from decimal import Decimal
from apps.accounts.models import CustomUser


class CotisationMensuelle(models.Model):
    TYPE_CHOICES = [
        ('mensualite', 'Mensualité'),
        ('assignation', 'Assignation'),
    ]
    STATUT_CHOICES = [
        ('en_attente', 'En attente'),
        ('payee', 'Payée'),
        ('retard', 'En retard'),
        ('annulee', 'Annulée'),
    ]

    membre = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='cotisations')
    type_cotisation = models.CharField(max_length=20, choices=TYPE_CHOICES, default='mensualite')
    objet_assignation = models.CharField(max_length=200, blank=True)
    montant = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('1000.00'))
    mois = models.IntegerField()
    annee = models.IntegerField()
    date_echeance = models.DateField()
    date_paiement = models.DateTimeField(null=True, blank=True)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='en_attente')
    reference_wave = models.CharField(max_length=100, blank=True)
    mode_paiement = models.CharField(max_length=50, default='wave')
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = ['membre', 'mois', 'annee', 'type_cotisation']
        verbose_name = 'Cotisation Mensuelle'
        verbose_name_plural = 'Cotisations Mensuelles'
        ordering = ['-annee', '-mois']

    def __str__(self):
        return f"{self.membre.get_full_name()} - {self.mois}/{self.annee} - {self.statut}"


class LeveeFonds(models.Model):
    STATUT_CHOICES = [
        ('active', 'Active'),
        ('terminee', 'Terminée'),
        ('annulee', 'Annulée'),
    ]

    titre = models.CharField(max_length=200)
    description = models.TextField()
    objectif = models.TextField()
    montant_objectif = models.DecimalField(max_digits=12, decimal_places=2)
    montant_collecte = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    montant_par_membre = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    date_debut = models.DateField()
    date_fin = models.DateField()
    image = models.ImageField(upload_to='levees_fonds/', null=True, blank=True)
    lien_paiement_wave = models.URLField(blank=True)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='active')
    cree_par = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Levée de Fonds'
        verbose_name_plural = 'Levées de Fonds'
        ordering = ['-date_creation']

    def __str__(self):
        return f"{self.titre} - {self.montant_collecte}/{self.montant_objectif} FCFA"

    @property
    def pourcentage_atteint(self):
        if self.montant_objectif > 0:
            return float((self.montant_collecte / self.montant_objectif) * 100)
        return 0
    
    @property
    def statut_reel(self):
        """Calcule le statut réel en fonction de la date de fin et du statut manuel."""
        from django.utils import timezone
        from datetime import date
        
        # Si annulée manuellement, garder annulée
        if self.statut == 'annulee':
            return 'annulee'
        
        # Si pas de date de fin, utiliser le statut manuel
        if not self.date_fin:
            return self.statut if self.statut in ['active', 'terminee', 'annulee'] else 'active'
        
        # Si la date de fin est passée, la campagne est terminée
        today = date.today()
        if self.date_fin < today:
            return 'terminee'
        
        # Sinon, la campagne est active (même si le statut manuel est "terminee")
        return 'active'


class Transaction(models.Model):
    TYPE_CHOICES = [
        ('cotisation', 'Cotisation Mensuelle'),
        ('levee_fonds', 'Levée de Fonds'),
        ('don', 'Don'),
        ('depense', 'Dépense'),
        ('autre', 'Autre'),
    ]

    STATUT_CHOICES = [
        ('en_attente', 'En attente'),
        ('validee', 'Validée'),
        ('echouee', 'Échouée'),
        ('remboursee', 'Remboursée'),
    ]

    membre = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='transactions')
    type_transaction = models.CharField(max_length=50, choices=TYPE_CHOICES)
    montant = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(blank=True)
    date_transaction = models.DateTimeField(auto_now_add=True)
    reference_wave = models.CharField(max_length=100, blank=True)
    reference_interne = models.CharField(max_length=100, unique=True)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='en_attente')
    cotisation = models.ForeignKey(CotisationMensuelle, null=True, blank=True, on_delete=models.SET_NULL)
    levee_fonds = models.ForeignKey(LeveeFonds, null=True, blank=True, on_delete=models.SET_NULL)
    recu_genere = models.BooleanField(default=False)
    fichier_recu = models.FileField(upload_to='recus/', null=True, blank=True)

    class Meta:
        verbose_name = 'Transaction'
        verbose_name_plural = 'Transactions'
        ordering = ['-date_transaction']

    def __str__(self):
        return f"{self.reference_interne} - {self.membre.get_full_name()} - {self.montant} FCFA"

    def save(self, *args, **kwargs):
        # Si la transaction est validée et liée à une levée de fonds, mettre à jour le montant collecté
        is_new = self.pk is None
        old_statut = None
        old_montant = None
        
        if not is_new:  # Si c'est une mise à jour
            try:
                old_transaction = Transaction.objects.get(pk=self.pk)
                old_statut = old_transaction.statut
                old_montant = old_transaction.montant
            except Transaction.DoesNotExist:
                pass
        
        # Sauvegarder d'abord pour avoir le pk si c'est une nouvelle transaction
        super().save(*args, **kwargs)
        
        # Mettre à jour le montant collecté si nécessaire
        if self.levee_fonds:
            if is_new and self.statut == 'validee':
                # Nouvelle transaction créée directement avec statut validé
                self.levee_fonds.montant_collecte += self.montant
                self.levee_fonds.save(update_fields=['montant_collecte'])
            elif not is_new and old_statut:
                if old_statut != 'validee' and self.statut == 'validee':
                    # Transaction vient d'être validée
                    self.levee_fonds.montant_collecte += self.montant
                    self.levee_fonds.save(update_fields=['montant_collecte'])
                elif old_statut == 'validee' and self.statut != 'validee':
                    # Transaction vient d'être invalidée
                    self.levee_fonds.montant_collecte -= old_montant
                    self.levee_fonds.save(update_fields=['montant_collecte'])
                elif old_statut == 'validee' and self.statut == 'validee' and old_montant != self.montant:
                    # Montant modifié sur une transaction déjà validée
                    diff = self.montant - old_montant
                    self.levee_fonds.montant_collecte += diff
                    self.levee_fonds.save(update_fields=['montant_collecte'])


class Don(models.Model):
    donateur = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='dons')
    montant = models.DecimalField(max_digits=10, decimal_places=2)
    message = models.TextField(blank=True)
    est_anonyme = models.BooleanField(default=False)
    date_don = models.DateTimeField(auto_now_add=True)
    reference_wave = models.CharField(max_length=100, blank=True)
    transaction = models.OneToOneField(Transaction, on_delete=models.CASCADE, null=True, blank=True)

    class Meta:
        verbose_name = 'Don'
        verbose_name_plural = 'Dons'
        ordering = ['-date_don']

    def __str__(self):
        if self.est_anonyme:
            return f"Don anonyme - {self.montant} FCFA"
        return f"{self.donateur.get_full_name()} - {self.montant} FCFA"


class ParametresFinanciers(models.Model):
    montant_cotisation_defaut = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('1000.00'))
    jour_echeance_cotisation = models.IntegerField(default=5)
    delai_relance_jours = models.IntegerField(default=7)
    email_notification_paiement = models.BooleanField(default=True)
    sms_notification_paiement = models.BooleanField(default=False)
    wave_api_key = models.CharField(max_length=200, blank=True)
    wave_secret_key = models.CharField(max_length=200, blank=True)

    class Meta:
        verbose_name = 'Paramètres Financiers'
        verbose_name_plural = 'Paramètres Financiers'
