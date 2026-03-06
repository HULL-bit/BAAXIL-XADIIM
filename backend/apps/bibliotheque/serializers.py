from rest_framework import serializers
from .models import LivreNumerique


class LivreNumeriqueSerializer(serializers.ModelSerializer):
    categorie_display = serializers.CharField(source='get_categorie_display', read_only=True)
    pdf_url = serializers.SerializerMethodField()
    pdf = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = LivreNumerique
        fields = [
            'id', 'nom', 'pdf', 'pdf_url', 'categorie', 'categorie_display',
            'description', 'ordre', 'date_ajout', 'telechargements', 'vues',
        ]
        read_only_fields = ['date_ajout', 'ajoute_par', 'telechargements', 'vues']

    def validate(self, data):
        # À la création, le PDF est obligatoire
        if not self.instance and not data.get('pdf'):
            raise serializers.ValidationError({'pdf': 'Veuillez sélectionner un fichier PDF.'})
        return data

    def get_pdf_url(self, obj):
        if not obj.pdf:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.pdf.url)
        return obj.pdf.url
