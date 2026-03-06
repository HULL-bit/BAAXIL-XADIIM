from django.db import models
from apps.accounts.models import CustomUser


class Kamil(models.Model):
    STATUT_CHOICES = [
        ('actif', 'Actif'),
        ('termine', 'Terminé'),
        ('archive', 'Archivé'),
    ]
    SEMESTRE_CHOICES = [(1, 'Semestre 1'), (2, 'Semestre 2')]

    titre = models.CharField(max_length=200)
    description = models.TextField()
    objectifs = models.TextField(blank=True)
    nombre_chapitres = models.IntegerField(default=30, help_text='Nombre de juzz (30 pour le Coran)')
    semestre = models.IntegerField(choices=SEMESTRE_CHOICES, default=1)
    annee = models.IntegerField(default=2024, help_text='Année scolaire / civile')
    date_debut = models.DateField()
    date_fin = models.DateField()
    image = models.ImageField(upload_to='kamil/', null=True, blank=True)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='actif')
    nb_lectures = models.IntegerField(default=0, help_text='Nombre de cycles/kamil lus (incrémenté à chaque Recommencer)')
    cree_par = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Programme Kamil'
        verbose_name_plural = 'Programmes Kamil'
        ordering = ['-date_creation']

    def __str__(self):
        return self.titre


class Jukki(models.Model):
    """JUKKI 1 à 30 : un JUKKI = un membre assigné, un membre peut avoir plusieurs JUKKIs."""
    kamil = models.ForeignKey(Kamil, on_delete=models.CASCADE, related_name='jukkis')
    numero = models.IntegerField(help_text='1 à 30')
    membre = models.ForeignKey(
        CustomUser, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='jukkis_assignes'
    )
    est_valide = models.BooleanField(default=False)
    date_validation = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ['kamil', 'numero']
        verbose_name = 'JUKKI'
        verbose_name_plural = 'JUKKIs'
        ordering = ['kamil', 'numero']

    def __str__(self):
        return f"JUKKI {self.numero} — {self.kamil.titre}"


class Chapitre(models.Model):
    kamil = models.ForeignKey(Kamil, on_delete=models.CASCADE, related_name='chapitres')
    numero = models.IntegerField()
    titre = models.CharField(max_length=200)
    sous_titre = models.CharField(max_length=200, blank=True)
    contenu_texte = models.TextField(blank=True)
    contenu_audio = models.FileField(upload_to='chapitres/audio/', null=True, blank=True)
    contenu_video = models.FileField(upload_to='chapitres/video/', null=True, blank=True)
    duree_lecture_estimee = models.IntegerField(null=True, blank=True, help_text="Durée en minutes")
    references = models.TextField(blank=True)
    notes_pedagogiques = models.TextField(blank=True)
    est_publie = models.BooleanField(default=True)

    class Meta:
        unique_together = ['kamil', 'numero']
        ordering = ['kamil', 'numero']
        verbose_name = 'Chapitre'
        verbose_name_plural = 'Chapitres'

    def __str__(self):
        return f"{self.kamil.titre} - Chapitre {self.numero}: {self.titre}"


class ProgressionLecture(models.Model):
    STATUT_CHOICES = [
        ('non_lu', 'Non lu'),
        ('en_cours', 'En cours'),
        ('lu', 'Lu - En attente validation'),
        ('valide', 'Validé'),
        ('refuse', 'Refusé'),
    ]

    membre = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='progressions_kamil')
    kamil = models.ForeignKey(Kamil, on_delete=models.CASCADE)
    chapitre = models.ForeignKey(Chapitre, on_delete=models.CASCADE)
    statut = models.CharField(max_length=30, choices=STATUT_CHOICES, default='non_lu')
    date_lecture = models.DateField(null=True, blank=True)
    temps_lecture = models.IntegerField(null=True, blank=True, help_text="Temps en minutes")
    notes_membre = models.TextField(blank=True)
    est_valide = models.BooleanField(default=False)
    valide_par = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='validations_effectuees')
    date_validation = models.DateTimeField(null=True, blank=True)
    commentaire_validation = models.TextField(blank=True)
    note_comprehension = models.IntegerField(null=True, blank=True)
    # Champs pour le versement financier associé au juzz
    montant_assigne = models.DecimalField(max_digits=10, decimal_places=0, default=0, help_text="Montant à payer pour ce juzz (en FCFA)")
    montant_verse = models.DecimalField(max_digits=10, decimal_places=0, default=0, help_text="Montant total versé")

    class Meta:
        unique_together = ['membre', 'kamil', 'chapitre']
        verbose_name = 'Progression de Lecture'
        verbose_name_plural = 'Progressions de Lecture'
        ordering = ['membre', 'kamil', 'chapitre__numero']

    def __str__(self):
        return f"{self.membre.get_full_name()} - {self.chapitre.titre} ({self.statut})"

    @property
    def pourcentage_versement(self):
        if self.montant_assigne and self.montant_assigne > 0:
            return min(100, round((self.montant_verse / self.montant_assigne) * 100, 1))
        return 0

    @property
    def reste_a_payer(self):
        return max(0, self.montant_assigne - self.montant_verse)


class VersementKamil(models.Model):
    """Versement partiel ou total pour une assignation Kamil"""
    METHODE_CHOICES = [
        ('wave', 'Wave'),
        ('om', 'Orange Money'),
        ('espece', 'Espèces'),
        ('virement', 'Virement bancaire'),
        ('autre', 'Autre'),
    ]
    STATUT_CHOICES = [
        ('en_attente', 'En attente de validation'),
        ('valide', 'Validé'),
        ('refuse', 'Refusé'),
    ]

    progression = models.ForeignKey(ProgressionLecture, on_delete=models.CASCADE, related_name='versements')
    membre = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='versements_kamil')
    montant = models.DecimalField(max_digits=10, decimal_places=0, help_text="Montant versé (en FCFA)")
    methode_paiement = models.CharField(max_length=20, choices=METHODE_CHOICES, default='wave')
    numero_transaction = models.CharField(max_length=100, blank=True, help_text="Numéro de transaction Wave/OM")
    date_versement = models.DateTimeField(auto_now_add=True)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='en_attente')
    valide_par = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='versements_valides')
    date_validation = models.DateTimeField(null=True, blank=True)
    commentaire = models.TextField(blank=True)

    class Meta:
        verbose_name = 'Versement Kamil'
        verbose_name_plural = 'Versements Kamil'
        ordering = ['-date_versement']

    def __str__(self):
        return f"{self.membre.get_full_name()} - {self.montant} FCFA ({self.get_statut_display()})"


class ActiviteReligieuse(models.Model):
    TYPE_CHOICES = [
        ('wird', 'Wird'),
        ('khassida', 'Khassida'),
        ('tafsir', 'Tafsir'),
        ('cours', 'Cours religieux'),
        ('sermon', 'Sermon'),
        ('conference', 'Conférence'),
        ('autre', 'Autre'),
    ]

    titre = models.CharField(max_length=200)
    type_activite = models.CharField(max_length=50, choices=TYPE_CHOICES)
    description = models.TextField()
    date_activite = models.DateTimeField()
    duree = models.IntegerField(help_text="Durée en minutes")
    lieu = models.CharField(max_length=200)
    lien_visio = models.URLField(blank=True)
    animateur = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='activites_animees')
    capacite_max = models.IntegerField(null=True, blank=True)
    supports = models.FileField(upload_to='activites/supports/', null=True, blank=True)
    enregistrement = models.FileField(upload_to='activites/enregistrements/', null=True, blank=True)

    class Meta:
        verbose_name = 'Activité Religieuse'
        verbose_name_plural = 'Activités Religieuses'
        ordering = ['-date_activite']

    def __str__(self):
        return f"{self.get_type_activite_display()} - {self.titre}"


class ParticipationActivite(models.Model):
    membre = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    activite = models.ForeignKey(ActiviteReligieuse, on_delete=models.CASCADE)
    date_inscription = models.DateTimeField(auto_now_add=True)
    a_participe = models.BooleanField(default=False)
    evaluation = models.IntegerField(null=True, blank=True)
    commentaire = models.TextField(blank=True)
    certificat_genere = models.BooleanField(default=False)

    class Meta:
        unique_together = ['membre', 'activite']
        verbose_name = 'Participation Activité'
        verbose_name_plural = 'Participations Activités'

    def __str__(self):
        return f"{self.membre.get_full_name()} - {self.activite.titre}"


class Enseignement(models.Model):
    CATEGORIE_CHOICES = [
        ('coran', 'Coran et Tafsir'),
        ('hadith', 'Hadith'),
        ('fiqh', 'Fiqh (Jurisprudence)'),
        ('aqida', 'Aqida (Croyance)'),
        ('sira', 'Sira (Vie du Prophète)'),
        ('akhlaq', 'Akhlaq (Morale)'),
        ('khassaida', 'Khassaïd'),
        ('autre', 'Autre'),
    ]

    titre = models.CharField(max_length=200)
    categorie = models.CharField(max_length=50, choices=CATEGORIE_CHOICES)
    contenu = models.TextField()
    auteur = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='enseignements')
    fichier_audio = models.FileField(upload_to='enseignements/audio/', null=True, blank=True)
    fichier_video = models.FileField(upload_to='enseignements/video/', null=True, blank=True)
    fichier_pdf = models.FileField(upload_to='enseignements/pdf/', null=True, blank=True)
    date_publication = models.DateTimeField(auto_now_add=True)
    vues = models.IntegerField(default=0)
    tags = models.CharField(max_length=200, blank=True)

    class Meta:
        verbose_name = 'Enseignement'
        verbose_name_plural = 'Enseignements'
        ordering = ['-date_publication']

    def __str__(self):
        return f"{self.titre} ({self.get_categorie_display()})"
