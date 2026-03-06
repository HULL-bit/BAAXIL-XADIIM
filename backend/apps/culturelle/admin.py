from django.contrib import admin
from .models import Kamil, Chapitre, ProgressionLecture, ActiviteReligieuse, ParticipationActivite, Enseignement

@admin.register(Kamil)
class KamilAdmin(admin.ModelAdmin):
    list_display = ['titre', 'statut', 'nombre_chapitres', 'date_debut', 'cree_par']

@admin.register(Chapitre)
class ChapitreAdmin(admin.ModelAdmin):
    list_display = ['kamil', 'numero', 'titre', 'est_publie']
    list_filter = ['kamil']

@admin.register(ProgressionLecture)
class ProgressionLectureAdmin(admin.ModelAdmin):
    list_display = ['membre', 'chapitre', 'statut', 'est_valide', 'date_validation']

@admin.register(ActiviteReligieuse)
class ActiviteReligieuseAdmin(admin.ModelAdmin):
    list_display = ['titre', 'type_activite', 'date_activite', 'animateur']

@admin.register(Enseignement)
class EnseignementAdmin(admin.ModelAdmin):
    list_display = ['titre', 'categorie', 'auteur', 'date_publication']

admin.site.register(ParticipationActivite)
