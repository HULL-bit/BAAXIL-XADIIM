from django.contrib import admin
from .models import Groupe, Evenement, ParticipationEvenement, Publication, Annonce, GalerieMedia, News, NewsLike, NewsSave, NewsComment

@admin.register(Groupe)
class GroupeAdmin(admin.ModelAdmin):
    list_display = ['nom', 'responsable', 'est_actif', 'date_creation']

@admin.register(Evenement)
class EvenementAdmin(admin.ModelAdmin):
    list_display = ['titre', 'type_evenement', 'date_debut', 'lieu', 'est_publie', 'cree_par']
    list_filter = ['type_evenement', 'est_publie']

@admin.register(Publication)
class PublicationAdmin(admin.ModelAdmin):
    list_display = ['titre', 'categorie', 'auteur', 'est_publiee', 'date_publication']

@admin.register(Annonce)
class AnnonceAdmin(admin.ModelAdmin):
    list_display = ['titre', 'priorite', 'auteur', 'est_active', 'date_publication']

admin.site.register(ParticipationEvenement)
admin.site.register(GalerieMedia)

admin.site.register(News)
admin.site.register(NewsLike)
admin.site.register(NewsSave)
admin.site.register(NewsComment)
