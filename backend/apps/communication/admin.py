from django.contrib import admin
from .models import Message, CategorieForum, SujetForum, ReponseForum, Notification

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['sujet', 'expediteur', 'destinataire', 'est_lu', 'date_envoi']

@admin.register(CategorieForum)
class CategorieForumAdmin(admin.ModelAdmin):
    list_display = ['nom', 'ordre', 'est_active']

@admin.register(SujetForum)
class SujetForumAdmin(admin.ModelAdmin):
    list_display = ['titre', 'categorie', 'auteur', 'est_epingle', 'date_creation']

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['utilisateur', 'titre', 'type_notification', 'est_lue', 'date_creation']

admin.site.register(ReponseForum)
