from rest_framework import serializers
from apps.accounts.serializers import UserMinimalSerializer
from .models import Message, CategorieForum, SujetForum, ReponseForum, Notification, Canal, MessageCanal


class MessageSerializer(serializers.ModelSerializer):
    expediteur_nom = serializers.CharField(source='expediteur.get_full_name', read_only=True)
    destinataire_nom = serializers.CharField(source='destinataire.get_full_name', read_only=True)
    expediteur_photo = serializers.ImageField(source='expediteur.photo', read_only=True)
    expediteur_photo_updated_at = serializers.DateTimeField(source='expediteur.photo_updated_at', read_only=True)
    destinataire_photo = serializers.ImageField(source='destinataire.photo', read_only=True)
    destinataire_photo_updated_at = serializers.DateTimeField(source='destinataire.photo_updated_at', read_only=True)

    class Meta:
        model = Message
        fields = '__all__'
        read_only_fields = ['date_envoi', 'expediteur', 'date_lecture']


class CategorieForumSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategorieForum
        fields = '__all__'


class ReponseForumSerializer(serializers.ModelSerializer):
    auteur_nom = serializers.CharField(source='auteur.get_full_name', read_only=True)

    class Meta:
        model = ReponseForum
        fields = '__all__'
        read_only_fields = ['date_creation', 'auteur']


class SujetForumSerializer(serializers.ModelSerializer):
    auteur_nom = serializers.CharField(source='auteur.get_full_name', read_only=True)
    categorie_nom = serializers.CharField(source='categorie.nom', read_only=True)

    class Meta:
        model = SujetForum
        fields = '__all__'
        read_only_fields = ['date_creation', 'auteur', 'vues']


class NotificationSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_notification_display', read_only=True)

    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ['date_creation', 'utilisateur', 'date_lecture']


class CanalSerializer(serializers.ModelSerializer):
    createur_nom = serializers.CharField(source='createur.get_full_name', read_only=True)
    membres_detail = UserMinimalSerializer(source='membres', many=True, read_only=True)
    nb_membres = serializers.IntegerField(source='membres.count', read_only=True)

    class Meta:
        model = Canal
        # jitsi_room n'est jamais exposé ici : révélé uniquement aux membres via
        # l'action rejoindre() du CanalViewSet.
        fields = ['id', 'nom', 'description', 'photo', 'createur', 'createur_nom', 'membres_detail', 'nb_membres', 'date_creation', 'actif']
        read_only_fields = ['createur', 'date_creation']


class MessageCanalSerializer(serializers.ModelSerializer):
    auteur_nom = serializers.CharField(source='auteur.get_full_name', read_only=True)
    auteur_photo = serializers.ImageField(source='auteur.photo', read_only=True)

    class Meta:
        model = MessageCanal
        fields = ['id', 'canal', 'auteur', 'auteur_nom', 'auteur_photo', 'contenu', 'fichier_joint', 'date_envoi']
        read_only_fields = ['auteur', 'date_envoi']
