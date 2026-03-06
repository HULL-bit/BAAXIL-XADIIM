from rest_framework import serializers
from .models import ProjetEntraide, ActionSociale, Beneficiaire, AideAccordee, ContributionSociale


class ProjetEntraideSerializer(serializers.ModelSerializer):
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    categorie_display = serializers.CharField(source='get_categorie_display', read_only=True)
    responsable_nom = serializers.CharField(source='responsable.get_full_name', read_only=True)
    membre_concerne_nom = serializers.SerializerMethodField()

    def get_membre_concerne_nom(self, obj):
        return obj.membre_concerne.get_full_name() if obj.membre_concerne else None

    class Meta:
        model = ProjetEntraide
        fields = '__all__'
        read_only_fields = ['date_creation', 'responsable', 'budget_utilise']


class ActionSocialeSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_action_display', read_only=True)
    organisateur_nom = serializers.CharField(source='organisateur.get_full_name', read_only=True)

    class Meta:
        model = ActionSociale
        fields = '__all__'
        read_only_fields = ['organisateur']


class BeneficiaireSerializer(serializers.ModelSerializer):
    categorie_display = serializers.CharField(source='get_categorie_display', read_only=True)

    class Meta:
        model = Beneficiaire
        fields = '__all__'
        read_only_fields = ['date_enregistrement', 'referent']


class AideAccordeeSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_aide_display', read_only=True)
    beneficiaire_nom = serializers.CharField(source='beneficiaire.nom_complet', read_only=True)

    class Meta:
        model = AideAccordee
        fields = '__all__'
        read_only_fields = ['accorde_par']


class ContributionSocialeSerializer(serializers.ModelSerializer):
    membre_nom = serializers.CharField(source='membre.get_full_name', read_only=True)
    projet_titre = serializers.CharField(source='projet.titre', read_only=True)

    class Meta:
        model = ContributionSociale
        fields = '__all__'
