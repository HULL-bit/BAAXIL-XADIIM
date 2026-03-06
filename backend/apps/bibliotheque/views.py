from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.http import FileResponse, Http404, HttpResponse
from django.utils.encoding import smart_str

from apps.accounts.permissions import IsAdminRoleOrStaff

from .models import LivreNumerique
from .serializers import LivreNumeriqueSerializer


class BibliothequePagination(PageNumberPagination):
    """Jusqu'à 200 livres par page pour supporter 150+ PDF sans multiplier les requêtes."""
    page_size = 200
    page_size_query_param = 'page_size'
    max_page_size = 200


class LivreNumeriqueViewSet(viewsets.ModelViewSet):
    queryset = LivreNumerique.objects.select_related('ajoute_par').order_by('categorie', 'ordre', 'nom')
    serializer_class = LivreNumeriqueSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['categorie']
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    pagination_class = BibliothequePagination

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminRoleOrStaff()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(ajoute_par=self.request.user)

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except ValidationError:
            raise
        except Exception as e:
            return Response(
                {'detail': str(e) or 'Erreur lors de l\'enregistrement du livre.'},
                status=400,
            )

    def _serve_pdf(self, livre, as_attachment=False):
        """Sert le PDF via le storage (compatible FileSystem, S3, etc.)."""
        if not livre.pdf or not livre.pdf.name:
            raise Http404("Fichier non disponible.")
        try:
            with livre.pdf.storage.open(livre.pdf.name, 'rb') as f:
                content = f.read()
        except (FileNotFoundError, OSError) as e:
            if getattr(e, 'errno', None) == 2 or 'No such file' in str(e):
                raise Http404(
                    "Fichier introuvable sur le serveur. En hébergement cloud, les fichiers peuvent être perdus après un redéploiement. Veuillez supprimer ce livre et le réajouter avec le PDF."
                )
            raise Http404(f"Fichier non accessible: {e!s}")
        except Exception as e:
            raise Http404(f"Fichier non accessible: {e!s}")
        if not content:
            raise Http404("Fichier vide.")
        filename = smart_str(livre.nom or 'livre') + '.pdf'
        resp = HttpResponse(content, content_type='application/pdf')
        resp['Content-Disposition'] = ('attachment; filename="%s"' % filename) if as_attachment else ('inline; filename="%s"' % filename)
        resp['Content-Length'] = len(content)
        return resp

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def lire(self, request, pk=None):
        """Sert le PDF pour lecture (iframe ou nouvel onglet) et incrémente les vues."""
        livre = self.get_object()
        livre.vues += 1
        livre.save(update_fields=['vues'])
        return self._serve_pdf(livre, as_attachment=False)

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def telecharger(self, request, pk=None):
        """Télécharge le PDF et incrémente le compteur."""
        livre = self.get_object()
        livre.telechargements += 1
        livre.save(update_fields=['telechargements'])
        return self._serve_pdf(livre, as_attachment=True)
