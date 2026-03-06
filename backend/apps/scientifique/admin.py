from django.contrib import admin
from .models import DomaineScientifique, Cours, ModuleCours, LeconCours, InscriptionCours, OuvrageScientifique, PublicationScientifique

admin.site.register(DomaineScientifique)
admin.site.register(Cours)
admin.site.register(ModuleCours)
admin.site.register(LeconCours)
admin.site.register(InscriptionCours)
admin.site.register(OuvrageScientifique)
admin.site.register(PublicationScientifique)
