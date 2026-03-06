from django.db import models
from decimal import Decimal
from apps.accounts.models import CustomUser


class DomaineScientifique(models.Model):
    nom = models.CharField(max_length=100)
    description = models.TextField()
    icone = models.CharField(max_length=50, blank=True)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='sous_domaines')

    class Meta:
        verbose_name = 'Domaine Scientifique'
        verbose_name_plural = 'Domaines Scientifiques'

    def __str__(self):
        return self.nom


class Cours(models.Model):
    NIVEAU_CHOICES = [
        ('debutant', 'Débutant'),
        ('intermediaire', 'Intermédiaire'),
        ('avance', 'Avancé'),
        ('expert', 'Expert'),
    ]

    STATUT_CHOICES = [
        ('brouillon', 'Brouillon'),
        ('publie', 'Publié'),
        ('archive', 'Archivé'),
    ]

    titre = models.CharField(max_length=200)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField()
    objectifs = models.TextField()
    domaine = models.ForeignKey(DomaineScientifique, on_delete=models.SET_NULL, null=True, blank=True)
    niveau = models.CharField(max_length=20, choices=NIVEAU_CHOICES)
    duree = models.IntegerField(help_text="Durée en heures")
    prerequis = models.TextField(blank=True)
    formateur = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='cours_enseignes')
    image = models.ImageField(upload_to='scientifique/cours/', null=True, blank=True)
    video_presentation = models.FileField(upload_to='scientifique/cours/videos/', null=True, blank=True)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='brouillon')
    date_creation = models.DateTimeField(auto_now_add=True)
    date_publication = models.DateTimeField(null=True, blank=True)
    inscrits = models.ManyToManyField(CustomUser, through='InscriptionCours', related_name='cours_suivis', blank=True)
    capacite_max = models.IntegerField(null=True, blank=True)
    prix = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    est_gratuit = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Cours'
        verbose_name_plural = 'Cours'
        ordering = ['-date_creation']

    def __str__(self):
        return f"{self.code} - {self.titre}"


class ModuleCours(models.Model):
    cours = models.ForeignKey(Cours, on_delete=models.CASCADE, related_name='modules')
    numero = models.IntegerField()
    titre = models.CharField(max_length=200)
    description = models.TextField()
    duree = models.IntegerField(help_text="Durée en heures")
    ordre = models.IntegerField(default=0)

    class Meta:
        unique_together = ['cours', 'numero']
        ordering = ['cours', 'ordre']
        verbose_name = 'Module de Cours'
        verbose_name_plural = 'Modules de Cours'

    def __str__(self):
        return f"{self.cours.code} - Module {self.numero}: {self.titre}"


class LeconCours(models.Model):
    module = models.ForeignKey(ModuleCours, on_delete=models.CASCADE, related_name='lecons')
    numero = models.IntegerField()
    titre = models.CharField(max_length=200)
    contenu_texte = models.TextField(blank=True)
    contenu_video = models.FileField(upload_to='scientifique/lecons/videos/', null=True, blank=True)
    contenu_pdf = models.FileField(upload_to='scientifique/lecons/pdf/', null=True, blank=True)
    duree = models.IntegerField(help_text="Durée en minutes")
    ordre = models.IntegerField(default=0)

    class Meta:
        unique_together = ['module', 'numero']
        ordering = ['module', 'ordre']
        verbose_name = 'Leçon'
        verbose_name_plural = 'Leçons'

    def __str__(self):
        return f"{self.module.cours.code} - {self.module.titre} - Leçon {self.numero}"


class InscriptionCours(models.Model):
    STATUT_CHOICES = [
        ('inscrit', 'Inscrit'),
        ('en_cours', 'En cours'),
        ('termine', 'Terminé'),
        ('abandonne', 'Abandonné'),
    ]

    cours = models.ForeignKey(Cours, on_delete=models.CASCADE)
    apprenant = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    date_inscription = models.DateTimeField(auto_now_add=True)
    date_debut = models.DateField(null=True, blank=True)
    date_fin = models.DateField(null=True, blank=True)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='inscrit')
    progression = models.IntegerField(default=0, help_text="Pourcentage de complétion")
    note_finale = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    certificat = models.FileField(upload_to='scientifique/certificats/', null=True, blank=True)

    class Meta:
        unique_together = ['cours', 'apprenant']
        verbose_name = 'Inscription Cours'
        verbose_name_plural = 'Inscriptions Cours'

    def __str__(self):
        return f"{self.apprenant.get_full_name()} - {self.cours.titre} ({self.statut})"


class OuvrageScientifique(models.Model):
    titre = models.CharField(max_length=200)
    auteur = models.CharField(max_length=200)
    domaine = models.ForeignKey(DomaineScientifique, on_delete=models.SET_NULL, null=True, blank=True)
    resume = models.TextField()
    fichier = models.FileField(upload_to='scientifique/ouvrages/')
    couverture = models.ImageField(upload_to='scientifique/couvertures/', null=True, blank=True)
    annee_publication = models.IntegerField()
    editeur = models.CharField(max_length=200, blank=True)
    isbn = models.CharField(max_length=50, blank=True)
    nombre_pages = models.IntegerField(null=True, blank=True)
    langue = models.CharField(max_length=50, default='Français')
    mots_cles = models.CharField(max_length=200, blank=True)
    ajoute_par = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    date_ajout = models.DateTimeField(auto_now_add=True)
    telechargements = models.IntegerField(default=0)

    class Meta:
        verbose_name = 'Ouvrage Scientifique'
        verbose_name_plural = 'Ouvrages Scientifiques'
        ordering = ['-date_ajout']

    def __str__(self):
        return f"{self.titre} - {self.auteur}"


class PublicationScientifique(models.Model):
    TYPE_CHOICES = [
        ('article', 'Article'),
        ('these', 'Thèse'),
        ('memoire', 'Mémoire'),
        ('communication', 'Communication'),
        ('poster', 'Poster'),
    ]

    titre = models.CharField(max_length=200)
    type_publication = models.CharField(max_length=50, choices=TYPE_CHOICES)
    auteurs = models.TextField(help_text="Liste des auteurs")
    resume = models.TextField()
    domaine = models.ForeignKey(DomaineScientifique, on_delete=models.SET_NULL, null=True, blank=True)
    revue = models.CharField(max_length=200, blank=True)
    conference = models.CharField(max_length=200, blank=True)
    annee = models.IntegerField()
    doi = models.CharField(max_length=100, blank=True)
    fichier = models.FileField(upload_to='scientifique/publications/')
    mots_cles = models.CharField(max_length=200)
    soumis_par = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    date_soumission = models.DateTimeField(auto_now_add=True)
    vues = models.IntegerField(default=0)
    citations = models.IntegerField(default=0)

    class Meta:
        verbose_name = 'Publication Scientifique'
        verbose_name_plural = 'Publications Scientifiques'
        ordering = ['-annee']

    def __str__(self):
        return f"{self.titre} ({self.annee})"
