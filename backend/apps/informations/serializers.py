from rest_framework import serializers
from .models import Groupe, Evenement, ParticipationEvenement, Publication, Annonce, GalerieMedia


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
