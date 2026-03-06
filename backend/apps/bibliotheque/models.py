import os
import uuid
from django.db import models
from apps.accounts.models import CustomUser


def chemin_pdf_bibliotheque(instance, filename):
    """Chemin de sauvegarde unique pour chaque PDF (toujours disponible, pas d'écrasement)."""
    ext = (os.path.splitext(filename)[1] or '.pdf').lower()
    if ext != '.pdf':
        ext = '.pdf'
    categorie = getattr(instance, 'categorie', 'livres') or 'livres'
    raw_name = (instance.nom or 'livre')[:50]
    nom_safe = ''.join(c if c.isalnum() or c in '._-' else '_' for c in raw_name).strip('._') or 'livre'
    unique = uuid.uuid4().hex[:8]
    return f'bibliotheque/livres/{categorie}/{nom_safe}_{unique}{ext}'


class LivreNumerique(models.Model):
    """Livre numérique (PDF) classé par catégorie : ALQURAN ou QASSIDA. Les PDF sont sauvegardés de façon persistante."""

    CATEGORIE_CHOICES = [
        ('alquran', 'ALQURAN'),
        ('qassida', 'QASSIDA'),
    ]

    nom = models.CharField(max_length=200)
    pdf = models.FileField(upload_to=chemin_pdf_bibliotheque)
    categorie = models.CharField(max_length=20, choices=CATEGORIE_CHOICES)
    description = models.TextField(blank=True)
    ordre = models.IntegerField(default=0, help_text="Ordre d'affichage dans la catégorie")
    ajoute_par = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='livres_ajoutes')
    date_ajout = models.DateTimeField(auto_now_add=True)
    telechargements = models.IntegerField(default=0)
    vues = models.IntegerField(default=0)

    class Meta:
        verbose_name = 'Livre numérique'
        verbose_name_plural = 'Livres numériques'
        ordering = ['categorie', 'ordre', 'nom']

    def __str__(self):
        return f"{self.nom} ({self.get_categorie_display()})"
