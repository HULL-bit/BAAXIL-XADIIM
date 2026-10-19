import re
import unicodedata

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


def _code_auto(modele, nom):
    """Code de repli unique à partir du nom : « Mékhé Touba » -> MEKHE_TOUBA (puis _2, _3…)."""
    ascii_nom = unicodedata.normalize('NFKD', nom).encode('ascii', 'ignore').decode().upper()
    base = re.sub(r'[^A-Z0-9]+', '_', ascii_nom).strip('_')[:40] or 'CODE'
    code, i = base, 1
    while modele.objects.filter(code=code).exists():
        i += 1
        code = f'{base}_{i}'
    return code


class _CodeUniqueMixin:
    """Code facultatif (généré si vide) et doublons expliqués en clair au lieu du message
    technique par défaut — les refus « 400 » du formulaire d'ajout venaient de là."""

    libelle = ''

    def validate_code(self, value):
        value = (value or '').strip().upper()
        if not value:
            return ''
        autres = self.Meta.model.objects.filter(code__iexact=value)
        if self.instance:
            autres = autres.exclude(pk=self.instance.pk)
        autre = autres.first()
        if autre:
            raise serializers.ValidationError(f'Ce code est déjà utilisé par {self.libelle} « {autre.nom} ».')
        return value

    def _finaliser_code(self, attrs, nom):
        if attrs.get('code'):
            return
        if self.instance:
            attrs.pop('code', None)  # code vidé à la modification : on garde l'ancien
        else:
            attrs['code'] = _code_auto(self.Meta.model, nom)


class RegroupementSerializer(_CodeUniqueMixin, serializers.ModelSerializer):
    libelle = 'le regroupement'

    class Meta:
        model = Regroupement
        fields = '__all__'
        extra_kwargs = {'code': {'required': False, 'allow_blank': True, 'validators': []}, 'nom': {'validators': []}}

    def validate_nom(self, value):
        value = value.strip()
        autres = Regroupement.objects.filter(nom__iexact=value)
        if self.instance:
            autres = autres.exclude(pk=self.instance.pk)
        if autres.exists():
            raise serializers.ValidationError(f'Un regroupement « {value} » existe déjà.')
        return value

    def validate(self, attrs):
        self._finaliser_code(attrs, attrs.get('nom') or (self.instance.nom if self.instance else ''))
        return attrs


class SectionSerializer(_CodeUniqueMixin, serializers.ModelSerializer):
    libelle = 'la section'
    regroupement_nom = serializers.CharField(source='regroupement.nom', read_only=True)

    class Meta:
        model = Section
        fields = '__all__'
        validators = []  # l'unicité (regroupement, nom) est vérifiée ci-dessous, avec un message clair
        extra_kwargs = {'code': {'required': False, 'allow_blank': True, 'validators': []}}

    def validate(self, attrs):
        regroupement = attrs.get('regroupement') or (self.instance.regroupement if self.instance else None)
        nom = (attrs.get('nom') or (self.instance.nom if self.instance else '')).strip()
        if 'nom' in attrs:
            attrs['nom'] = nom
        autres = Section.objects.filter(regroupement=regroupement, nom__iexact=nom)
        if self.instance:
            autres = autres.exclude(pk=self.instance.pk)
        if regroupement and autres.exists():
            raise serializers.ValidationError({'nom': f'Une section « {nom} » existe déjà dans ce regroupement.'})
        self._finaliser_code(attrs, nom)
        return attrs


class SousSectionSerializer(serializers.ModelSerializer):
    section_nom = serializers.CharField(source='section.nom', read_only=True)
    sexe_display = serializers.CharField(source='get_sexe_display', read_only=True)

    class Meta:
        model = SousSection
        fields = '__all__'


CODE_CELLULE_RE = re.compile(r'^S\d{2}[A-Z]{2}\d{2}$')
CODE_SECTION_RE = re.compile(r'^S\d{2}[A-Z]{2}$')


class DahiraSerializer(serializers.ModelSerializer):
    sous_section_label = serializers.CharField(source='sous_section.__str__', read_only=True)

    class Meta:
        model = Dahira
        fields = '__all__'

    def validate_code(self, value):
        value = (value or '').strip().upper()
        if not value:
            return ''
        if not CODE_CELLULE_RE.match(value):
            raise serializers.ValidationError('Format attendu : S01DK01 (code de la section + n° de cellule sur 2 chiffres).')
        autres = Dahira.objects.filter(code=value)
        if self.instance:
            autres = autres.exclude(pk=self.instance.pk)
        autre = autres.first()
        if autre:
            raise serializers.ValidationError(f'Ce code est déjà utilisé par la cellule « {autre.nom} ».')
        return value

    def validate(self, attrs):
        code = attrs.get('code')
        if code:
            sous_section = attrs.get('sous_section') or (self.instance.sous_section if self.instance else None)
            code_section = (sous_section.section.code or '').upper() if sous_section else ''
            if CODE_SECTION_RE.match(code_section) and not code.startswith(code_section):
                raise serializers.ValidationError({'code': f'Le code d\'une cellule de cette section doit commencer par {code_section}.'})
        return attrs


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
