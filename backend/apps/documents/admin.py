from django.contrib import admin
from .models import Document


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['nom', 'type_fichier', 'categorie', 'ajoute_par', 'date_ajout']
    list_filter = ['type_fichier', 'categorie']
