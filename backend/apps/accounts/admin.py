from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import CustomUser, ProfilComplementaire, PreferencesNotification, HistoriqueConnexion, Badge, AttributionBadge


@admin.register(CustomUser)
class CustomUserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'first_name', 'last_name', 'role', 'est_actif', 'date_inscription']
    list_filter = ['role', 'est_actif']
    search_fields = ['username', 'email', 'first_name', 'last_name', 'telephone']
    ordering = ['-date_inscription']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Daara', {'fields': ('telephone', 'adresse', 'role', 'photo', 'numero_wave', 'specialite', 'biographie', 'est_actif', 'cotisations_payees', 'chapitres_lus', 'evenements_participes')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        (None, {'fields': ('email', 'telephone', 'adresse', 'role')}),
    )


@admin.register(ProfilComplementaire)
class ProfilComplementaireAdmin(admin.ModelAdmin):
    list_display = ['user', 'profession', 'pays', 'ville_residence']


@admin.register(PreferencesNotification)
class PreferencesNotificationAdmin(admin.ModelAdmin):
    list_display = ['user']


@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):
    list_display = ['nom', 'categorie', 'points', 'est_actif']


@admin.register(AttributionBadge)
class AttributionBadgeAdmin(admin.ModelAdmin):
    list_display = ['user', 'badge', 'date_obtention']


@admin.register(HistoriqueConnexion)
class HistoriqueConnexionAdmin(admin.ModelAdmin):
    list_display = ['user', 'date_connexion', 'adresse_ip', 'succes']
