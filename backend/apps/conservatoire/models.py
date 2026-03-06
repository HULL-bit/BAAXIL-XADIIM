from django.db import models
from apps.accounts.models import CustomUser


class CategorieDocument(models.Model):
    nom = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    icone = models.CharField(max_length=50, blank=True)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='sous_categories')
    ordre = models.IntegerField(default=0)

    class Meta:
        verbose_name = 'Catégorie de Document'
        verbose_name_plural = 'Catégories de Documents'
        ordering = ['ordre', 'nom']

    def __str__(self):
        return self.nom


class DocumentNumerique(models.Model):
    TYPE_CHOICES = [
        ('livre', 'Livre'),
        ('article', 'Article'),
        ('these', 'Thèse'),
        ('memoire', 'Mémoire'),
        ('rapport', 'Rapport'),
        ('guide', 'Guide'),
        ('autre', 'Autre'),
    ]

    titre = models.CharField(max_length=200)
    auteur = models.CharField(max_length=200)
    categorie = models.ForeignKey(CategorieDocument, on_delete=models.SET_NULL, null=True, blank=True)
    type_document = models.CharField(max_length=50, choices=TYPE_CHOICES, default='autre', blank=True)
    description = models.TextField(blank=True)
    fichier = models.FileField(upload_to='conservatoire/documents/')
    couverture = models.ImageField(upload_to='conservatoire/couvertures/', null=True, blank=True)
    nombre_pages = models.IntegerField(null=True, blank=True)
    annee_publication = models.IntegerField(null=True, blank=True)
    editeur = models.CharField(max_length=200, blank=True)
    isbn = models.CharField(max_length=50, blank=True)
    langue = models.CharField(max_length=50, default='Français')
    tags = models.CharField(max_length=200, blank=True)
    telecharge_par = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    date_ajout = models.DateTimeField(auto_now_add=True)
    telechargements = models.IntegerField(default=0)
    vues = models.IntegerField(default=0)

    class Meta:
        verbose_name = 'Document Numérique'
        verbose_name_plural = 'Documents Numériques'
        ordering = ['-date_ajout']

    def __str__(self):
        return f"{self.titre} - {self.auteur}"


class MediaAudio(models.Model):
    CATEGORIE_CHOICES = [
        ('wird', 'Wird'),
        ('khassida', 'Khassida'),
        ('conference', 'Conférence'),
        ('cours', 'Cours'),
        ('sermon', 'Sermon'),
        ('recitation', 'Récitation Coran'),
        ('autre', 'Autre'),
    ]

    titre = models.CharField(max_length=200)
    categorie = models.CharField(max_length=50, choices=CATEGORIE_CHOICES)
    description = models.TextField(blank=True)
    orateur = models.CharField(max_length=200, blank=True)
    fichier_audio = models.FileField(upload_to='conservatoire/audio/')
    duree = models.IntegerField(null=True, blank=True, help_text="Durée en secondes")
    date_enregistrement = models.DateField(null=True, blank=True)
    lieu_enregistrement = models.CharField(max_length=200, blank=True)
    qualite = models.CharField(max_length=50, blank=True)
    upload_par = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    date_ajout = models.DateTimeField(auto_now_add=True)
    ecoutes = models.IntegerField(default=0)
    tags = models.CharField(max_length=200, blank=True)

    class Meta:
        verbose_name = 'Média Audio'
        verbose_name_plural = 'Médias Audio'
        ordering = ['-date_ajout']

    def __str__(self):
        return f"{self.titre} ({self.get_categorie_display()})"


class MediaVideo(models.Model):
    CATEGORIE_CHOICES = [
        ('evenement', 'Événement'),
        ('cours', 'Cours'),
        ('conference', 'Conférence'),
        ('ceremonie', 'Cérémonie'),
        ('documentaire', 'Documentaire'),
        ('interview', 'Interview'),
        ('autre', 'Autre'),
    ]

    titre = models.CharField(max_length=200)
    categorie = models.CharField(max_length=50, choices=CATEGORIE_CHOICES)
    description = models.TextField()
    intervenant = models.CharField(max_length=200, blank=True)
    fichier_video = models.FileField(upload_to='conservatoire/videos/')
    miniature = models.ImageField(upload_to='conservatoire/miniatures/', null=True, blank=True)
    duree = models.IntegerField(null=True, blank=True, help_text="Durée en secondes")
    date_tournage = models.DateField(null=True, blank=True)
    lieu_tournage = models.CharField(max_length=200, blank=True)
    resolution = models.CharField(max_length=50, blank=True)
    upload_par = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    date_ajout = models.DateTimeField(auto_now_add=True)
    vues = models.IntegerField(default=0)
    tags = models.CharField(max_length=200, blank=True)

    class Meta:
        verbose_name = 'Média Vidéo'
        verbose_name_plural = 'Médias Vidéo'
        ordering = ['-date_ajout']

    def __str__(self):
        return f"{self.titre} ({self.get_categorie_display()})"


class ArchiveHistorique(models.Model):
    TYPE_CHOICES = [
        ('evenement', 'Événement Historique'),
        ('personnalite', 'Personnalité'),
        ('document', 'Document Ancien'),
        ('photo', 'Photo Ancienne'),
        ('temoignage', 'Témoignage'),
        ('autre', 'Autre'),
    ]

    titre = models.CharField(max_length=200)
    type_archive = models.CharField(max_length=50, choices=TYPE_CHOICES, null=True, blank=True)
    evenement = models.CharField(max_length=200, blank=True, help_text="Nom de l'événement (texte libre)")
    date_evenement = models.DateField(help_text="Date de l'événement/document", null=True, blank=True)
    annee = models.IntegerField(null=True, blank=True)
    texte = models.TextField(blank=True)
    lien_telegramme_du_son = models.CharField(max_length=500, blank=True, help_text='Lien Telegram du son')
    description = models.TextField(blank=True)
    contexte_historique = models.TextField(blank=True)
    fichier = models.FileField(upload_to='conservatoire/archives/', null=True, blank=True)
    image = models.ImageField(upload_to='conservatoire/archives/images/', null=True, blank=True)
    source = models.CharField(max_length=200, blank=True)
    archiviste = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    date_archivage = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Archive Historique'
        verbose_name_plural = 'Archives Historiques'
        ordering = ['annee', 'date_evenement']

    def __str__(self):
        return f"{self.titre} ({self.annee})"


class AlbumPhoto(models.Model):
    titre = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    date_evenement = models.DateField()
    couverture = models.ImageField(upload_to='conservatoire/albums/couvertures/', null=True, blank=True)
    cree_par = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    date_creation = models.DateTimeField(auto_now_add=True)
    est_public = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Album Photo'
        verbose_name_plural = 'Albums Photos'
        ordering = ['-date_evenement']

    def __str__(self):
        return f"{self.titre} - {self.date_evenement.strftime('%d/%m/%Y')}"


class Photo(models.Model):
    album = models.ForeignKey(AlbumPhoto, on_delete=models.CASCADE, related_name='photos')
    titre = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    fichier = models.ImageField(upload_to='conservatoire/photos/')
    date_prise = models.DateField(null=True, blank=True)
    lieu = models.CharField(max_length=200, blank=True)
    photographe = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='photos_prises')
    date_upload = models.DateTimeField(auto_now_add=True)
    ordre = models.IntegerField(default=0)

    class Meta:
        verbose_name = 'Photo'
        verbose_name_plural = 'Photos'
        ordering = ['album', 'ordre']

    def __str__(self):
        return f"{self.album.titre} - Photo {self.ordre}"


class Kourel(models.Model):
    """Kourel : groupe de membres du conservatoire (indépendant des programmes)"""
    nom = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    membres = models.ManyToManyField(CustomUser, related_name='kourels', blank=True)
    maitre_de_coeur = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='kourels_diriges')
    ordre = models.IntegerField(default=0)

    class Meta:
        verbose_name = 'Kourel'
        verbose_name_plural = 'Kourels'
        ordering = ['ordre', 'nom']

    def __str__(self):
        return self.nom


class SeanceConservatoire(models.Model):
    """Séance de répétition ou prestation pour un Kourel spécifique"""
    TYPE_CHOICES = [
        ('repetition', 'Répétition'),
        ('prestation', 'Prestation'),
    ]
    kourel = models.ForeignKey(Kourel, on_delete=models.CASCADE, related_name='seances')
    type_seance = models.CharField(max_length=20, choices=TYPE_CHOICES, default='repetition')
    titre = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    date_heure = models.DateTimeField(help_text="Date et heure de début")
    heure_fin = models.TimeField(null=True, blank=True, help_text="Heure de fin de la répétition")
    lieu = models.CharField(max_length=200, blank=True)
    cree_par = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Séance Conservatoire'
        verbose_name_plural = 'Séances Conservatoire'
        ordering = ['-date_heure']

    def __str__(self):
        return f"{self.kourel.nom} — {self.titre} ({self.get_type_seance_display()})"


class KhassidaRepetee(models.Model):
    """
    Khassida répétée lors d'une séance. Une séance peut avoir plusieurs khassidas.
    Chaque khassida a son dathie (ex : Serigne Massamba, Serigne Mahib).
    """
    seance = models.ForeignKey(SeanceConservatoire, on_delete=models.CASCADE, related_name='khassidas')
    nom_khassida = models.CharField(max_length=200, help_text="Nom de la khassida")
    khassida_portion = models.CharField(max_length=200, blank=True, help_text="Portion ou partie travaillée")
    dathie = models.CharField(max_length=200, help_text="Dathie - ex : Serigne Massamba, Serigne Mahib")
    ordre = models.IntegerField(default=0)

    class Meta:
        verbose_name = 'Khassida répétée'
        verbose_name_plural = 'Khassidas répétées'
        ordering = ['seance', 'ordre', 'id']

    def __str__(self):
        return f"{self.nom_khassida} ({self.dathie})"


class PresenceSeance(models.Model):
    """
    Présence d'un membre à une séance de répétition.
    Chaque membre du kourel doit être marqué : présent, absent non justifié, absent justifié.
    """
    STATUT_CHOICES = [
        ('present', 'Présent'),
        ('absent_non_justifie', 'Absent non justifié'),
        ('absent_justifie', 'Absent justifié'),
    ]
    seance = models.ForeignKey(SeanceConservatoire, on_delete=models.CASCADE, related_name='presences')
    membre = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='presences_seances')
    statut = models.CharField(max_length=30, choices=STATUT_CHOICES, default='present')
    remarque = models.TextField(blank=True, help_text="Justification ou remarque si absent justifié")

    class Meta:
        verbose_name = 'Présence à une séance'
        verbose_name_plural = 'Présences aux séances'
        unique_together = ['seance', 'membre']
        ordering = ['seance', 'membre']

    def __str__(self):
        return f"{self.membre.get_full_name()} — {self.seance} — {self.get_statut_display()}"
