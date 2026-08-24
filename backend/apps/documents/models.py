import os
from django.db import models
from apps.accounts.models import CustomUser

EXTENSIONS_PAR_TYPE = {
    'pdf': ['pdf'],
    'image': ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'],
    'excel': ['xls', 'xlsx', 'csv'],
    'word': ['doc', 'docx'],
}


def deduire_type_fichier(nom_fichier):
    ext = os.path.splitext(nom_fichier or '')[1].lstrip('.').lower()
    for type_fichier, extensions in EXTENSIONS_PAR_TYPE.items():
        if ext in extensions:
            return type_fichier
    return 'autre'


class Document(models.Model):
    TYPE_CHOICES = [
        ('pdf', 'PDF'),
        ('image', 'Image'),
        ('excel', 'Excel'),
        ('word', 'Word'),
        ('autre', 'Autre'),
    ]

    nom = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    categorie = models.CharField(max_length=100, blank=True)
    fichier = models.FileField(upload_to='documents/%Y/%m/')
    type_fichier = models.CharField(max_length=10, choices=TYPE_CHOICES, default='autre', editable=False)
    taille_octets = models.PositiveIntegerField(default=0, editable=False)
    ajoute_par = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, related_name='documents_ajoutes')
    date_ajout = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Document'
        verbose_name_plural = 'Documents'
        ordering = ['-date_ajout']

    def save(self, *args, **kwargs):
        if self.fichier:
            self.type_fichier = deduire_type_fichier(self.fichier.name)
            try:
                self.taille_octets = self.fichier.size
            except (OSError, ValueError):
                pass
        super().save(*args, **kwargs)

    def __str__(self):
        return self.nom
