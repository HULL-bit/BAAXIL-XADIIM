from rest_framework import serializers
from .models import (
    Groupe,
    Evenement,
    ParticipationEvenement,
    Publication,
    Annonce,
    GalerieMedia,
    News,
    NewsComment,
)


class GroupeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Groupe
        fields = '__all__'
        read_only_fields = ['date_creation']


class EvenementSerializer(serializers.ModelSerializer):
    type_evenement_display = serializers.CharField(source='get_type_evenement_display', read_only=True)
    cree_par_nom = serializers.CharField(source='cree_par.get_full_name', read_only=True)

    class Meta:
        model = Evenement
        fields = '__all__'
        read_only_fields = ['date_creation', 'cree_par']


class ParticipationEvenementSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParticipationEvenement
        fields = '__all__'
        read_only_fields = ['date_inscription']


class PublicationSerializer(serializers.ModelSerializer):
    auteur_nom = serializers.CharField(source='auteur.get_full_name', read_only=True)

    class Meta:
        model = Publication
        fields = '__all__'
        read_only_fields = ['date_publication', 'date_modification', 'auteur', 'vues']


class AnnonceSerializer(serializers.ModelSerializer):
    auteur_nom = serializers.CharField(source='auteur.get_full_name', read_only=True)

    class Meta:
        model = Annonce
        fields = '__all__'
        read_only_fields = ['date_publication', 'auteur']


class GalerieMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = GalerieMedia
        fields = '__all__'
        read_only_fields = ['date_upload', 'upload_par', 'vues']


class NewsCommentSerializer(serializers.ModelSerializer):
    user_nom = serializers.CharField(source='user.get_full_name', read_only=True)

    class Meta:
        model = NewsComment
        fields = ['id', 'news', 'user', 'user_nom', 'commentaire', 'date_creation']
        read_only_fields = ['id', 'news', 'user', 'user_nom', 'date_creation']


class NewsSerializer(serializers.ModelSerializer):
    auteur_nom = serializers.CharField(source='auteur.get_full_name', read_only=True)
    likes_count = serializers.IntegerField(read_only=True)
    comments_count = serializers.IntegerField(read_only=True)
    saves_count = serializers.IntegerField(read_only=True)
    liked = serializers.BooleanField(read_only=True)
    saved = serializers.BooleanField(read_only=True)

    class Meta:
        model = News
        fields = [
            'id',
            'titre',
            'contenu',
            'image',
            'auteur',
            'auteur_nom',
            'date_creation',
            'date_modification',
            'est_publiee',
            'likes_count',
            'comments_count',
            'saves_count',
            'liked',
            'saved',
        ]
        read_only_fields = ['auteur', 'date_creation', 'date_modification', 'likes_count', 'comments_count', 'saves_count', 'liked', 'saved', 'auteur_nom']

    def validate(self, attrs):
        # Autoriser titre / contenu vides, mais au moins un des trois (titre, contenu, image) doit être fourni
        titre = (attrs.get('titre') or '').strip()
        contenu = (attrs.get('contenu') or '').strip()
        image = attrs.get('image')
        if not titre and not contenu and not image:
            raise serializers.ValidationError('Fournir au moins un titre, un contenu ou une image.')
        return attrs
