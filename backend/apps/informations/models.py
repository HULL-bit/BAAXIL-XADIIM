from django.db import models
from apps.accounts.models import CustomUser


class Groupe(models.Model):
    nom = models.CharField(max_length=100)
    description = models.TextField()
    image = models.ImageField(upload_to='groupes/', null=True, blank=True)
    responsable = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, related_name='groupes_responsable')
    membres = models.ManyToManyField(CustomUser, related_name='groupes_membre', blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    est_actif = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Groupe'
        verbose_name_plural = 'Groupes'

    def __str__(self):
        return self.nom


class Evenement(models.Model):
    TYPE_CHOICES = [
        ('rencontre', 'Rencontre'),
        ('ceremonie', 'Cérémonie'),
        ('conference', 'Conférence'),
        ('ziara', 'Ziara'),
        ('formation', 'Formation'),
        ('assemblee', 'Assemblée Générale'),
        ('autre', 'Autre'),
    ]

    titre = models.CharField(max_length=200)
    description = models.TextField()
    type_evenement = models.CharField(max_length=50, choices=TYPE_CHOICES)
    date_debut = models.DateTimeField()
    date_fin = models.DateTimeField()
    lieu = models.CharField(max_length=200)
    adresse_complete = models.TextField(blank=True)
    lien_visio = models.URLField(blank=True)
    image = models.ImageField(upload_to='evenements/', null=True, blank=True)
    capacite_max = models.IntegerField(null=True, blank=True)
    cree_par = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='evenements_crees')
    date_creation = models.DateTimeField(auto_now_add=True)
    groupes_cibles = models.ManyToManyField(Groupe, blank=True)
    participants = models.ManyToManyField(CustomUser, through='ParticipationEvenement', related_name='inscriptions_evenements', blank=True)
    est_publie = models.BooleanField(default=False)
    documents = models.FileField(upload_to='evenements/docs/', null=True, blank=True)

    class Meta:
        verbose_name = 'Événement'
        verbose_name_plural = 'Événements'
        ordering = ['-date_debut']

    def __str__(self):
        return f"{self.titre} - {self.date_debut.strftime('%d/%m/%Y')}"


class ParticipationEvenement(models.Model):
    evenement = models.ForeignKey(Evenement, on_delete=models.CASCADE)
    membre = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    date_inscription = models.DateTimeField(auto_now_add=True)
    est_present = models.BooleanField(default=False)
    commentaire = models.TextField(blank=True)

    class Meta:
        unique_together = ['evenement', 'membre']
        verbose_name = 'Participation Événement'
        verbose_name_plural = 'Participations Événements'

    def __str__(self):
        return f"{self.membre.get_full_name()} - {self.evenement.titre}"


class Publication(models.Model):
    CATEGORIE_CHOICES = [
        ('article', 'Article'),
        ('enseignement', 'Enseignement'),
        ('newsletter', 'Newsletter'),
        ('communique', 'Communiqué'),
        ('blog', 'Blog'),
    ]

    titre = models.CharField(max_length=200)
    contenu = models.TextField()
    categorie = models.CharField(max_length=50, choices=CATEGORIE_CHOICES)
    image_principale = models.ImageField(upload_to='publications/', null=True, blank=True)
    auteur = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    date_publication = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    est_publiee = models.BooleanField(default=False)
    vues = models.IntegerField(default=0)
    tags = models.CharField(max_length=200, blank=True)

    class Meta:
        verbose_name = 'Publication'
        verbose_name_plural = 'Publications'
        ordering = ['-date_publication']

    def __str__(self):
        return self.titre


class Annonce(models.Model):
    PRIORITE_CHOICES = [
        ('normale', 'Normale'),
        ('importante', 'Importante'),
        ('urgente', 'Urgente'),
    ]

    titre = models.CharField(max_length=200)
    contenu = models.TextField()
    priorite = models.CharField(max_length=20, choices=PRIORITE_CHOICES, default='normale')
    auteur = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    groupes_cibles = models.ManyToManyField(Groupe, blank=True)
    date_publication = models.DateTimeField(auto_now_add=True)
    date_expiration = models.DateTimeField(null=True, blank=True)
    est_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Annonce'
        verbose_name_plural = 'Annonces'
        ordering = ['-date_publication']

    def __str__(self):
        return self.titre


class GalerieMedia(models.Model):
    TYPE_CHOICES = [
        ('image', 'Image'),
        ('video', 'Vidéo'),
        ('audio', 'Audio'),
    ]

    titre = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    type_media = models.CharField(max_length=20, choices=TYPE_CHOICES)
    fichier = models.FileField(upload_to='galerie/')
    evenement = models.ForeignKey(Evenement, on_delete=models.SET_NULL, null=True, blank=True, related_name='medias')
    upload_par = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    date_upload = models.DateTimeField(auto_now_add=True)
    vues = models.IntegerField(default=0)

    class Meta:
        verbose_name = 'Média'
        verbose_name_plural = 'Galerie Médias'
        ordering = ['-date_upload']

    def __str__(self):
        return self.titre
