from rest_framework import serializers
from .models import CotisationMensuelle, LeveeFonds, Transaction, Don, ParametresFinanciers


class CotisationMensuelleSerializer(serializers.ModelSerializer):
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    membre_nom = serializers.CharField(source='membre.get_full_name', read_only=True)

    class Meta:
        model = CotisationMensuelle
        fields = '__all__'
    
    def validate_type_cotisation(self, value):
        """Ensure type_cotisation has a valid value, defaulting to 'mensualite'"""
        if not value or value.strip() == '':
            return 'mensualite'
        return value
    
    def validate_montant(self, value):
        """Ensure montant is positive"""
        if value is None or value <= 0:
            raise serializers.ValidationError("Le montant doit être positif.")
        return value


class LeveeFondsSerializer(serializers.ModelSerializer):
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    statut_reel = serializers.ReadOnlyField()
    statut_reel_display = serializers.SerializerMethodField()
    pourcentage_atteint = serializers.ReadOnlyField()

    class Meta:
        model = LeveeFonds
        fields = '__all__'
        read_only_fields = ['montant_collecte', 'cree_par', 'date_creation']
    
    def get_statut_reel_display(self, obj):
        """Retourne le libellé du statut réel."""
        statut_reel = obj.statut_reel
        return dict(LeveeFonds.STATUT_CHOICES).get(statut_reel, statut_reel)


class TransactionSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_transaction_display', read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    membre_nom = serializers.CharField(source='membre.get_full_name', read_only=True)

    class Meta:
        model = Transaction
        fields = '__all__'
        read_only_fields = ['date_transaction', 'reference_interne', 'membre']


class DonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Don
        fields = '__all__'
        read_only_fields = ['date_don', 'donateur']


class ParametresFinanciersSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParametresFinanciers
        fields = '__all__'
