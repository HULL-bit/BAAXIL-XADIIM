from django.contrib import admin
from .models import ProjetEntraide, ActionSociale, Beneficiaire, AideAccordee

@admin.register(ProjetEntraide)
class ProjetEntraideAdmin(admin.ModelAdmin):
    list_display = ['titre', 'categorie', 'statut', 'date_debut', 'responsable']

@admin.register(Beneficiaire)
class BeneficiaireAdmin(admin.ModelAdmin):
    list_display = ['nom_complet', 'categorie', 'est_actif', 'referent']

@admin.register(AideAccordee)
class AideAccordeeAdmin(admin.ModelAdmin):
    list_display = ['beneficiaire', 'type_aide', 'montant', 'date_aide', 'accorde_par']

admin.site.register(ActionSociale)
