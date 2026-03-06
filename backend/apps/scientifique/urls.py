from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'scientifique/domaines', views.DomaineScientifiqueViewSet)
router.register(r'scientifique/cours', views.CoursViewSet)
router.register(r'scientifique/modules', views.ModuleCoursViewSet)
router.register(r'scientifique/lecons', views.LeconCoursViewSet)
router.register(r'scientifique/inscriptions', views.InscriptionCoursViewSet)
router.register(r'scientifique/ouvrages', views.OuvrageScientifiqueViewSet)
router.register(r'scientifique/publications', views.PublicationScientifiqueViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
