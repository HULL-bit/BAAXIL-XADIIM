from rest_framework import serializers
from .models import Kamil, Chapitre, Jukki, ProgressionLecture, ActiviteReligieuse, Enseignement, VersementKamil


class JukkiSerializer(serializers.ModelSerializer):
    membre_nom = serializers.CharField(source='membre.get_full_name', read_only=True)
    kamil_titre = serializers.CharField(source='kamil.titre', read_only=True)
    kamil_date_debut = serializers.DateField(source='kamil.date_debut', read_only=True)
    kamil_date_fin = serializers.DateField(source='kamil.date_fin', read_only=True)

    class Meta:
        model = Jukki
        fields = '__all__'


class ChapitreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chapitre
        fields = '__all__'


class KamilSerializer(serializers.ModelSerializer):
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    semestre_display = serializers.CharField(source='get_semestre_display', read_only=True)
    chapitres = ChapitreSerializer(many=True, read_only=True)
    jukkis = JukkiSerializer(many=True, read_only=True)
    nb_jukkis_valides = serializers.SerializerMethodField()
    nb_jukkis_non_valides = serializers.SerializerMethodField()
    pourcentage_completion = serializers.SerializerMethodField()

    class Meta:
        model = Kamil
        fields = '__all__'
        read_only_fields = ['cree_par', 'date_creation']

    def get_nb_jukkis_valides(self, obj):
        jukkis = obj.jukkis.all() if hasattr(obj, 'jukkis') else []
        return sum(1 for j in jukkis if j.est_valide)

    def get_nb_jukkis_non_valides(self, obj):
        jukkis = obj.jukkis.all() if hasattr(obj, 'jukkis') else []
        return sum(1 for j in jukkis if not j.est_valide)

    def get_pourcentage_completion(self, obj):
        jukkis = list(obj.jukkis.all()) if hasattr(obj, 'jukkis') else []
        total = len(jukkis)
        if total == 0:
            return 0
        return round(100 * sum(1 for j in jukkis if j.est_valide) / total, 1)


class VersementKamilSerializer(serializers.ModelSerializer):
    methode_display = serializers.CharField(source='get_methode_paiement_display', read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    membre_nom = serializers.CharField(source='membre.get_full_name', read_only=True)
    chapitre_titre = serializers.CharField(source='progression.chapitre.titre', read_only=True)
    chapitre_numero = serializers.IntegerField(source='progression.chapitre.numero', read_only=True)
    kamil_titre = serializers.CharField(source='progression.kamil.titre', read_only=True)

    class Meta:
        model = VersementKamil
        fields = '__all__'
        read_only_fields = ['membre', 'date_versement', 'valide_par', 'date_validation']


class ProgressionLectureSerializer(serializers.ModelSerializer):
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    chapitre_titre = serializers.CharField(source='chapitre.titre', read_only=True)
    chapitre_numero = serializers.IntegerField(source='chapitre.numero', read_only=True)
    kamil_titre = serializers.CharField(source='kamil.titre', read_only=True)
    membre_nom = serializers.CharField(source='membre.get_full_name', read_only=True)
    pourcentage_versement = serializers.ReadOnlyField()
    reste_a_payer = serializers.ReadOnlyField()
    versements = VersementKamilSerializer(many=True, read_only=True)

    class Meta:
        model = ProgressionLecture
        fields = '__all__'
        read_only_fields = ['date_validation', 'valide_par', 'montant_verse']


class ActiviteReligieuseSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_activite_display', read_only=True)
    animateur_nom = serializers.CharField(source='animateur.get_full_name', read_only=True)

    class Meta:
        model = ActiviteReligieuse
        fields = '__all__'
        read_only_fields = ['animateur']


class EnseignementSerializer(serializers.ModelSerializer):
    categorie_display = serializers.CharField(source='get_categorie_display', read_only=True)
    auteur_nom = serializers.CharField(source='auteur.get_full_name', read_only=True)

    class Meta:
        model = Enseignement
        fields = '__all__'
        read_only_fields = ['auteur', 'date_publication', 'vues']
