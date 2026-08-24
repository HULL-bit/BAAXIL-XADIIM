from rest_framework import serializers
from .models import Document


class DocumentSerializer(serializers.ModelSerializer):
    ajoute_par_nom = serializers.CharField(source='ajoute_par.get_full_name', read_only=True, default='')
    type_fichier_display = serializers.CharField(source='get_type_fichier_display', read_only=True)

    class Meta:
        model = Document
        fields = [
            'id', 'nom', 'description', 'categorie', 'fichier',
            'type_fichier', 'type_fichier_display', 'taille_octets',
            'ajoute_par', 'ajoute_par_nom', 'date_ajout',
        ]
        read_only_fields = ['type_fichier', 'taille_octets', 'ajoute_par', 'date_ajout']
