from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'groupes', views.GroupeViewSet)
router.register(r'evenements', views.EvenementViewSet)
router.register(r'publications', views.PublicationViewSet)
router.register(r'annonces', views.AnnonceViewSet)
router.register(r'galerie', views.GalerieMediaViewSet)

urlpatterns = [
    path('informations/', include(router.urls)),
]
