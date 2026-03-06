from rest_framework import serializers
from .models import (
    TypeReunion,
    Reunion,
    ProcesVerbal,
    Decision,
    Vote,
    StructureOrganisation,
    RapportActivite,
    Materiel,
    Regroupement,
    Section,
    SousSection,
    Dahira,
    Famille,
    LienFamilial,
)


class TypeReunionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TypeReunion
        fields = '__all__'


class ReunionSerializer(serializers.ModelSerializer):
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    type_nom = serializers.CharField(source='type_reunion.nom', read_only=True)
    organisateur_nom = serializers.CharField(source='organisateur.get_full_name', read_only=True)

    class Meta:
        model = Reunion
        fields = '__all__'
        read_only_fields = ['date_creation', 'organisateur']


class ProcesVerbalSerializer(serializers.ModelSerializer):
    reunion_titre = serializers.CharField(source='reunion.titre', read_only=True)

    class Meta:
        model = ProcesVerbal
        fields = '__all__'
        read_only_fields = ['redige_par', 'valide_par', 'date_validation']


class DecisionSerializer(serializers.ModelSerializer):
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    propose_par_nom = serializers.CharField(source='propose_par.get_full_name', read_only=True)

    class Meta:
        model = Decision
        fields = '__all__'
        read_only_fields = ['propose_par']


class VoteSerializer(serializers.ModelSerializer):
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    type_display = serializers.CharField(source='get_type_vote_display', read_only=True)

    class Meta:
        model = Vote
        fields = '__all__'
        read_only_fields = ['lance_par', 'resultat_pour', 'resultat_contre', 'resultat_abstention']


class StructureOrganisationSerializer(serializers.ModelSerializer):
    responsable_nom = serializers.CharField(source='responsable.get_full_name', read_only=True)

    class Meta:
        model = StructureOrganisation
        fields = '__all__'


class RapportActiviteSerializer(serializers.ModelSerializer):
    periode_display = serializers.CharField(source='get_periode_display', read_only=True)
    redige_par_nom = serializers.CharField(source='redige_par.get_full_name', read_only=True)

    class Meta:
        model = RapportActivite
        fields = '__all__'
        read_only_fields = ['redige_par']


class MaterielSerializer(serializers.ModelSerializer):
    class Meta:
        model = Materiel
        fields = '__all__'


class RegroupementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Regroupement
        fields = '__all__'


class SectionSerializer(serializers.ModelSerializer):
    regroupement_nom = serializers.CharField(source='regroupement.nom', read_only=True)

    class Meta:
        model = Section
        fields = '__all__'


class SousSectionSerializer(serializers.ModelSerializer):
    section_nom = serializers.CharField(source='section.nom', read_only=True)
    sexe_display = serializers.CharField(source='get_sexe_display', read_only=True)

    class Meta:
        model = SousSection
        fields = '__all__'


class DahiraSerializer(serializers.ModelSerializer):
    sous_section_label = serializers.CharField(source='sous_section.__str__', read_only=True)

    class Meta:
        model = Dahira
        fields = '__all__'


class FamilleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Famille
        fields = '__all__'


class LienFamilialSerializer(serializers.ModelSerializer):
    membre_nom = serializers.CharField(source='membre.get_full_name', read_only=True)
    famille_nom = serializers.CharField(source='famille.nom', read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = LienFamilial
        fields = '__all__'
