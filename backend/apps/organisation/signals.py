from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Section, SousSection


@receiver(post_save, sender=Section)
def creer_sous_sections(sender, instance, created, raw=False, **kwargs):
    """Toute nouvelle section reçoit ses sous-sections Hommes et Femmes : sans elles,
    aucun dahira ne peut y être rattaché (le formulaire d'ajout de dahira échouait)."""
    if created and not raw:
        for sexe in ('H', 'F'):
            SousSection.objects.get_or_create(section=instance, sexe=sexe)
