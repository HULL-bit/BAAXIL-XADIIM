from django.db import models
from django.contrib.auth.models import AbstractUser


class CustomUser(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Administrateur'),
        ('membre', 'Membre'),
        ('jewrin', 'Jewrin'),
        ('jewrine_conservatoire', 'Jewrin Conservatoire'),
        ('jewrine_culturelle', 'Jewrin Culturelle'),
        ('jewrine_finance', 'Jewrin Finance'),
        ('jewrine_sociale', 'Jewrin Sociale'),
        ('jewrine_communication', 'Jewrin Communication'),
        ('jewrine_organisation', 'Jewrin Organisation'),
        ('jewrine_scientifique', 'Jewrin Scientifique'),
    ]

    SEXE_CHOICES = [
        ('M', 'Masculin'),
        ('F', 'Féminin'),
    ]

    CATEGORIE_CHOICES = [
        ('eleve', 'Élève'),
        ('etudiant', 'Étudiant'),
        ('professionnel', 'Professionnel'),
    ]

    GROUPE_SANGUIN_CHOICES = [
        ('A+', 'A+'),
        ('A-', 'A-'),
        ('B+', 'B+'),
        ('B-', 'B-'),
        ('AB+', 'AB+'),
        ('AB-', 'AB-'),
        ('O+', 'O+'),
        ('O-', 'O-'),
    ]

    telephone = models.CharField(max_length=20, blank=True)
    adresse = models.TextField(blank=True)
    # Augmenter max_length pour accepter les rôles spécialisés (jusqu'à 21 caractères)
    role = models.CharField(max_length=32, choices=ROLE_CHOICES, default='membre')
    photo = models.ImageField(upload_to='photos_membres/', null=True, blank=True)
    photo_updated_at = models.DateTimeField(null=True, blank=True, help_text='Mis à jour à chaque changement de photo (cache bust)')
    date_inscription = models.DateTimeField(auto_now_add=True)
    est_actif = models.BooleanField(default=True)
    numero_wave = models.CharField(max_length=50, blank=True)
    numero_carte = models.CharField(max_length=50, blank=True)

    # Informations personnelles
    sexe = models.CharField(max_length=1, choices=SEXE_CHOICES, blank=True)
    profession = models.CharField(max_length=100, blank=True)
    categorie = models.CharField(max_length=20, choices=CATEGORIE_CHOICES, default='professionnel')
    groupe_sanguin = models.CharField(max_length=3, blank=True, choices=GROUPE_SANGUIN_CHOICES)

    # Champs spécifiques Jewrin
    specialite = models.CharField(max_length=100, blank=True)
    biographie = models.TextField(blank=True)

    # Statistiques membres
    cotisations_payees = models.IntegerField(default=0)
    chapitres_lus = models.IntegerField(default=0)
    evenements_participes = models.IntegerField(default=0)

    # Rattachement organisationnel Ahibahil Khadim
    regroupement = models.ForeignKey(
        'organisation.Regroupement',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='membres',
    )
    section = models.ForeignKey(
        'organisation.Section',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='membres',
    )
    sous_section = models.ForeignKey(
        'organisation.SousSection',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='membres',
    )
    dahira = models.ForeignKey(
        'organisation.Dahira',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='membres',
    )

    class Meta:
        verbose_name = 'Utilisateur'
        verbose_name_plural = 'Utilisateurs'

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.get_role_display()})"


class ProfilComplementaire(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='profil_complementaire')
    biographie = models.TextField(blank=True)
    profession = models.CharField(max_length=100, blank=True)
    employeur = models.CharField(max_length=100, blank=True)
    competences = models.TextField(blank=True)
    centres_interet = models.TextField(blank=True)
    facebook = models.URLField(blank=True)
    twitter = models.URLField(blank=True)
    linkedin = models.URLField(blank=True)
    site_web = models.URLField(blank=True)
    ville_residence = models.CharField(max_length=100, blank=True)
    pays = models.CharField(max_length=100, default='Sénégal')
    langue_preferee = models.CharField(max_length=20, default='fr')
    fuseau_horaire = models.CharField(max_length=50, default='Africa/Dakar')
    recevoir_newsletter = models.BooleanField(default=True)
    profil_public = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Profil Complémentaire'
        verbose_name_plural = 'Profils Complémentaires'

    def __str__(self):
        return f"Profil de {self.user.get_full_name()}"


class PreferencesNotification(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='preferences_notif')
    notif_email_message = models.BooleanField(default=True)
    notif_email_evenement = models.BooleanField(default=True)
    notif_email_finance = models.BooleanField(default=True)
    notif_email_kamil = models.BooleanField(default=True)
    notif_push_message = models.BooleanField(default=True)
    notif_push_evenement = models.BooleanField(default=True)
    notif_push_finance = models.BooleanField(default=False)
    notif_push_kamil = models.BooleanField(default=True)
    notif_sms_urgent = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Préférences de Notification'
        verbose_name_plural = 'Préférences de Notifications'

    def __str__(self):
        return f"Préférences de {self.user.get_full_name()}"


class HistoriqueConnexion(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='connexions')
    date_connexion = models.DateTimeField(auto_now_add=True)
    adresse_ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    navigateur = models.CharField(max_length=100, blank=True)
    systeme_exploitation = models.CharField(max_length=100, blank=True)
    appareil = models.CharField(max_length=100, blank=True)
    localisation = models.CharField(max_length=200, blank=True)
    succes = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Historique de Connexion'
        verbose_name_plural = 'Historiques de Connexions'
        ordering = ['-date_connexion']

    def __str__(self):
        return f"{self.user.username} - {self.date_connexion}"


class Badge(models.Model):
    CATEGORIE_CHOICES = [
        ('contribution', 'Contribution'),
        ('assiduite', 'Assiduité'),
        ('kamil', 'Kamil'),
        ('social', 'Social'),
        ('anciennete', 'Ancienneté'),
        ('special', 'Spécial'),
    ]

    nom = models.CharField(max_length=100)
    description = models.TextField()
    categorie = models.CharField(max_length=50, choices=CATEGORIE_CHOICES)
    icone = models.ImageField(upload_to='badges/', null=True, blank=True)
    critere = models.TextField(help_text="Critère d'obtention")
    points = models.IntegerField(default=0)
    est_actif = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Badge'
        verbose_name_plural = 'Badges'

    def __str__(self):
        return f"{self.nom} ({self.get_categorie_display()})"


class AttributionBadge(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='badges_obtenus')
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE)
    date_obtention = models.DateTimeField(auto_now_add=True)
    raison = models.TextField(blank=True)

    class Meta:
        unique_together = ['user', 'badge']
        verbose_name = 'Attribution de Badge'
        verbose_name_plural = 'Attributions de Badges'
        ordering = ['-date_obtention']

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.badge.nom}"
