from django.contrib import admin
from .models import LivreNumerique


@admin.register(LivreNumerique)
class LivreNumeriqueAdmin(admin.ModelAdmin):
    list_display = ('nom', 'categorie', 'ordre', 'date_ajout', 'telechargements', 'vues')
    list_filter = ('categorie',)
    search_fields = ('nom', 'description')
    ordering = ('categorie', 'ordre', 'nom')
