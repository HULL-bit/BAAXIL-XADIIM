from django.db import models
from decimal import Decimal
from apps.accounts.models import CustomUser


class ProjetEntraide(models.Model):
    STATUT_CHOICES = [
        ('planifie', 'Planifié'),
        ('en_cours', 'En cours'),
        ('termine', 'Terminé'),
        ('annule', 'Annulé'),
    ]

    CATEGORIE_CHOICES = [
        ('education', 'Éducation'),
        ('sante', 'Santé'),
        ('alimentation', 'Alimentation'),
        ('logement', 'Logement'),
        ('emploi', 'Emploi'),
        ('urgence', 'Urgence'),
        ('autre', 'Autre'),
    ]

    titre = models.CharField(max_length=200)
    description = models.TextField()
    categorie = models.CharField(max_length=50, choices=CATEGORIE_CHOICES)
    objectifs = models.TextField()
    objectif_social = models.TextField(blank=True, help_text='Objectif social si pas de membre concerné (ex: Magal, Gamou)')
    membre_concerne = models.ForeignKey(
        CustomUser, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='projets_sociaux_concerne'
    )
    lieu = models.CharField(max_length=200, blank=True)
    budget_previsionnel = models.DecimalField(max_digits=12, decimal_places=2)
    budget_utilise = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    date_debut = models.DateField()
    date_fin = models.DateField(null=True, blank=True)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='planifie')
    responsable = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='projets_responsable')
    benevoles = models.ManyToManyField(CustomUser, through='ParticipationProjet', related_name='projets_benevole', blank=True)
    image = models.ImageField(upload_to='projets_sociaux/', null=True, blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Projet d'Entraide"
        verbose_name_plural = "Projets d'Entraide"
        ordering = ['-date_creation']

    def __str__(self):
        return f"{self.titre} ({self.get_statut_display()})"


class ParticipationProjet(models.Model):
    ROLE_CHOICES = [
        ('benevole', 'Bénévole'),
        ('coordinateur', 'Coordinateur'),
        ('expert', 'Expert'),
    ]

    projet = models.ForeignKey(ProjetEntraide, on_delete=models.CASCADE)
    membre = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='benevole')
    date_inscription = models.DateTimeField(auto_now_add=True)
    heures_contribution = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal('0.00'))
    commentaire = models.TextField(blank=True)

    class Meta:
        unique_together = ['projet', 'membre']
        verbose_name = 'Participation Projet'
        verbose_name_plural = 'Participations Projets'

    def __str__(self):
        return f"{self.membre.get_full_name()} - {self.projet.titre} ({self.role})"


class ActionSociale(models.Model):
    TYPE_CHOICES = [
        ('distribution', 'Distribution'),
        ('visite', 'Visite'),
        ('formation', 'Formation'),
        ('sensibilisation', 'Sensibilisation'),
        ('autre', 'Autre'),
    ]

    titre = models.CharField(max_length=200)
    type_action = models.CharField(max_length=50, choices=TYPE_CHOICES)
    description = models.TextField()
    projet = models.ForeignKey(ProjetEntraide, on_delete=models.SET_NULL, null=True, blank=True, related_name='actions')
    date_action = models.DateTimeField()
    lieu = models.CharField(max_length=200)
    organisateur = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='actions_organisees')
    participants = models.ManyToManyField(CustomUser, related_name='actions_participees', blank=True)
    nombre_beneficiaires = models.IntegerField(default=0)
    budget = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    rapport = models.TextField(blank=True)
    photos = models.ImageField(upload_to='actions_sociales/', null=True, blank=True)

    class Meta:
        verbose_name = 'Action Sociale'
        verbose_name_plural = 'Actions Sociales'
        ordering = ['-date_action']

    def __str__(self):
        return f"{self.titre} - {self.date_action.strftime('%d/%m/%Y')}"


class Beneficiaire(models.Model):
    CATEGORIE_CHOICES = [
        ('famille', 'Famille'),
        ('orphelin', 'Orphelin'),
        ('veuve', 'Veuve'),
        ('malade', 'Malade'),
        ('etudiant', 'Étudiant'),
        ('autre', 'Autre'),
    ]

    nom_complet = models.CharField(max_length=200)
    categorie = models.CharField(max_length=50, choices=CATEGORIE_CHOICES)
    date_naissance = models.DateField(null=True, blank=True)
    telephone = models.CharField(max_length=20)
    adresse = models.TextField()
    situation = models.TextField(help_text="Description de la situation")
    nombre_personnes_charge = models.IntegerField(default=0)
    revenu_mensuel = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    besoins = models.TextField()
    referent = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, related_name='beneficiaires_suivis')
    date_enregistrement = models.DateTimeField(auto_now_add=True)
    est_actif = models.BooleanField(default=True)
    photo = models.ImageField(upload_to='beneficiaires/', null=True, blank=True)
    documents = models.FileField(upload_to='beneficiaires/docs/', null=True, blank=True)

    class Meta:
        verbose_name = 'Bénéficiaire'
        verbose_name_plural = 'Bénéficiaires'
        ordering = ['nom_complet']

    def __str__(self):
        return f"{self.nom_complet} ({self.get_categorie_display()})"


class AideAccordee(models.Model):
    TYPE_AIDE_CHOICES = [
        ('financiere', 'Aide Financière'),
        ('materielle', 'Aide Matérielle'),
        ('alimentaire', 'Aide Alimentaire'),
        ('medicale', 'Aide Médicale'),
        ('scolaire', 'Aide Scolaire'),
        ('autre', 'Autre'),
    ]

    beneficiaire = models.ForeignKey(Beneficiaire, on_delete=models.CASCADE, related_name='aides_recues')
    type_aide = models.CharField(max_length=50, choices=TYPE_AIDE_CHOICES)
    description = models.TextField()
    montant = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    date_aide = models.DateField()
    projet = models.ForeignKey(ProjetEntraide, on_delete=models.SET_NULL, null=True, blank=True)
    accorde_par = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    justificatif = models.FileField(upload_to='aides/justificatifs/', null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        verbose_name = 'Aide Accordée'
        verbose_name_plural = 'Aides Accordées'
        ordering = ['-date_aide']

    def __str__(self):
        return f"{self.beneficiaire.nom_complet} - {self.get_type_aide_display()} - {self.date_aide}"


class ContributionSociale(models.Model):
    STATUT_CHOICES = [
        ('en_attente', 'En attente'),
        ('payee', 'Payée'),
        ('annulee', 'Annulée'),
    ]

    projet = models.ForeignKey(ProjetEntraide, on_delete=models.CASCADE, related_name='contributions')
    membre = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='contributions_sociales')
    montant = models.DecimalField(max_digits=10, decimal_places=2)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='en_attente')
    date_echeance = models.DateField(null=True, blank=True)
    date_paiement = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Contribution Sociale'
        verbose_name_plural = 'Contributions Sociales'
        ordering = ['-date_creation']
        unique_together = ['projet', 'membre']

    def __str__(self):
        return f"{self.membre.get_full_name()} - {self.projet.titre} - {self.montant} FCFA"
