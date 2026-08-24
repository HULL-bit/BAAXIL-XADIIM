import uuid
from django.db import models
from apps.accounts.models import CustomUser


class Message(models.Model):
    expediteur = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='messages_envoyes')
    destinataire = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='messages_recus')
    sujet = models.CharField(max_length=200)
    contenu = models.TextField()
    date_envoi = models.DateTimeField(auto_now_add=True)
    est_lu = models.BooleanField(default=False)
    date_lecture = models.DateTimeField(null=True, blank=True)
    est_archive_expediteur = models.BooleanField(default=False)
    est_archive_destinataire = models.BooleanField(default=False)
    fichier_joint = models.FileField(upload_to='messages/pieces_jointes/', null=True, blank=True)
    message_parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='reponses')

    class Meta:
        verbose_name = 'Message'
        verbose_name_plural = 'Messages'
        ordering = ['-date_envoi']

    def __str__(self):
        return f"{self.expediteur.get_full_name()} → {self.destinataire.get_full_name()}: {self.sujet}"


class CategorieForum(models.Model):
    nom = models.CharField(max_length=100)
    description = models.TextField()
    icone = models.CharField(max_length=50, blank=True)
    ordre = models.IntegerField(default=0)
    est_active = models.BooleanField(default=True)
    moderateurs = models.ManyToManyField(CustomUser, related_name='categories_moderees', blank=True)

    class Meta:
        verbose_name = 'Catégorie de Forum'
        verbose_name_plural = 'Catégories de Forum'
        ordering = ['ordre', 'nom']

    def __str__(self):
        return self.nom


class SujetForum(models.Model):
    categorie = models.ForeignKey(CategorieForum, on_delete=models.CASCADE, related_name='sujets')
    titre = models.CharField(max_length=200)
    contenu = models.TextField()
    auteur = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='sujets_forum')
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    est_epingle = models.BooleanField(default=False)
    est_verrouille = models.BooleanField(default=False)
    vues = models.IntegerField(default=0)
    tags = models.CharField(max_length=200, blank=True)

    class Meta:
        verbose_name = 'Sujet de Forum'
        verbose_name_plural = 'Sujets de Forum'
        ordering = ['-est_epingle', '-date_modification']

    def __str__(self):
        return self.titre


class ReponseForum(models.Model):
    sujet = models.ForeignKey(SujetForum, on_delete=models.CASCADE, related_name='reponses')
    auteur = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='reponses_forum')
    contenu = models.TextField()
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    reponse_parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='sous_reponses')
    est_modere = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Réponse de Forum'
        verbose_name_plural = 'Réponses de Forum'
        ordering = ['date_creation']

    def __str__(self):
        return f"Réponse de {self.auteur.get_full_name()} sur {self.sujet.titre}"


class Notification(models.Model):
    TYPE_CHOICES = [
        ('info', 'Information'),
        ('succes', 'Succès'),
        ('avertissement', 'Avertissement'),
        ('erreur', 'Erreur'),
        ('message', 'Message'),
        ('evenement', 'Événement'),
        ('finance', 'Finance'),
        ('kamil', 'Kamil'),
        ('systeme', 'Système'),
    ]

    utilisateur = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='notifications')
    type_notification = models.CharField(max_length=20, choices=TYPE_CHOICES)
    titre = models.CharField(max_length=200)
    message = models.TextField()
    lien = models.CharField(max_length=200, blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    est_lue = models.BooleanField(default=False)
    date_lecture = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        ordering = ['-date_creation']

    def __str__(self):
        return f"{self.utilisateur.get_full_name()} - {self.titre}"


class Canal(models.Model):
    """
    Canal de communication façon groupe (texte + appel vocal/vidéo Jitsi),
    visible uniquement par les membres qui y ont été ajoutés par un admin.
    """

    nom = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    createur = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='canaux_crees')
    membres = models.ManyToManyField(CustomUser, related_name='canaux', blank=True)
    # Nom de salon Jitsi, unique et non devinable : seul le backend le révèle,
    # et uniquement aux membres du canal (cf. CanalViewSet.rejoindre).
    jitsi_room = models.CharField(max_length=64, unique=True, editable=False, blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    actif = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Canal'
        verbose_name_plural = 'Canaux'
        ordering = ['-date_creation']

    def save(self, *args, **kwargs):
        if not self.jitsi_room:
            self.jitsi_room = f"ahk-{uuid.uuid4().hex[:24]}"
        super().save(*args, **kwargs)

    def __str__(self):
        return self.nom


class MessageCanal(models.Model):
    canal = models.ForeignKey(Canal, on_delete=models.CASCADE, related_name='messages')
    auteur = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='messages_canaux')
    contenu = models.TextField(blank=True)
    fichier_joint = models.FileField(upload_to='canaux/pieces_jointes/', null=True, blank=True)
    date_envoi = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Message de canal'
        verbose_name_plural = 'Messages de canal'
        ordering = ['date_envoi']

    def __str__(self):
        return f"{self.auteur.get_full_name()} @ {self.canal.nom}"
