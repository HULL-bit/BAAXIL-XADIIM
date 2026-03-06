from django.contrib import admin
from .models import CotisationMensuelle, LeveeFonds, Transaction, Don, ParametresFinanciers

@admin.register(CotisationMensuelle)
class CotisationMensuelleAdmin(admin.ModelAdmin):
    list_display = ['membre', 'mois', 'annee', 'montant', 'statut', 'date_paiement']
    list_filter = ['statut', 'annee']

@admin.register(LeveeFonds)
class LeveeFondsAdmin(admin.ModelAdmin):
    list_display = ['titre', 'montant_objectif', 'montant_collecte', 'statut', 'date_debut']

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ['reference_interne', 'membre', 'type_transaction', 'montant', 'statut', 'date_transaction']

@admin.register(Don)
class DonAdmin(admin.ModelAdmin):
    list_display = ['donateur', 'montant', 'est_anonyme', 'date_don']

@admin.register(ParametresFinanciers)
class ParametresFinanciersAdmin(admin.ModelAdmin):
    list_display = ['montant_cotisation_defaut', 'jour_echeance_cotisation']
