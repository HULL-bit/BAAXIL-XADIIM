from django.contrib import admin
from .models import (
    CategorieDocument, DocumentNumerique, MediaAudio, MediaVideo,
    ArchiveHistorique, AlbumPhoto, Photo,
    Kourel, SeanceConservatoire, PresenceSeance, KhassidaRepetee
)

admin.site.register(CategorieDocument)
admin.site.register(DocumentNumerique)
admin.site.register(MediaAudio)
admin.site.register(MediaVideo)
admin.site.register(ArchiveHistorique)
admin.site.register(AlbumPhoto)
admin.site.register(Photo)
admin.site.register(Kourel)
admin.site.register(SeanceConservatoire)
admin.site.register(PresenceSeance)
admin.site.register(KhassidaRepetee)
