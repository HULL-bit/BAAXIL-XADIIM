from rest_framework import serializers
from .models import DomaineScientifique, Cours, ModuleCours, LeconCours, InscriptionCours, OuvrageScientifique, PublicationScientifique


class DomaineScientifiqueSerializer(serializers.ModelSerializer):
    class Meta:
        model = DomaineScientifique
        fields = '__all__'


class ModuleCoursSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModuleCours
        fields = '__all__'


class LeconCoursSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeconCours
        fields = '__all__'


class CoursSerializer(serializers.ModelSerializer):
    niveau_display = serializers.CharField(source='get_niveau_display', read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    formateur_nom = serializers.CharField(source='formateur.get_full_name', read_only=True)
    modules = ModuleCoursSerializer(many=True, read_only=True)

    class Meta:
        model = Cours
        fields = '__all__'
        read_only_fields = ['date_creation', 'formateur', 'date_publication']


class InscriptionCoursSerializer(serializers.ModelSerializer):
    cours_titre = serializers.CharField(source='cours.titre', read_only=True)
    apprenant_nom = serializers.CharField(source='apprenant.get_full_name', read_only=True)

    class Meta:
        model = InscriptionCours
        fields = '__all__'
        read_only_fields = ['date_inscription', 'apprenant']


class OuvrageScientifiqueSerializer(serializers.ModelSerializer):
    domaine_nom = serializers.CharField(source='domaine.nom', read_only=True)

    class Meta:
        model = OuvrageScientifique
        fields = '__all__'
        read_only_fields = ['date_ajout', 'ajoute_par', 'telechargements']


class PublicationScientifiqueSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_publication_display', read_only=True)

    class Meta:
        model = PublicationScientifique
        fields = '__all__'
        read_only_fields = ['date_soumission', 'soumis_par', 'vues', 'citations']
