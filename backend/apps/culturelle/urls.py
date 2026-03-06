from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'kamil', views.KamilViewSet)
router.register(r'chapitres', views.ChapitreViewSet)
router.register(r'jukkis', views.JukkiViewSet)
router.register(r'progressions', views.ProgressionLectureViewSet)
router.register(r'versements-kamil', views.VersementKamilViewSet)
router.register(r'activites-religieuses', views.ActiviteReligieuseViewSet)
router.register(r'enseignements', views.EnseignementViewSet)

urlpatterns = [
    path('culturelle/', include(router.urls)),
]
