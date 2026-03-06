from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'projets-entraide', views.ProjetEntraideViewSet)
router.register(r'actions-sociales', views.ActionSocialeViewSet)
router.register(r'beneficiaires', views.BeneficiaireViewSet)
router.register(r'aides-accordees', views.AideAccordeeViewSet)
router.register(r'contributions', views.ContributionSocialeViewSet)

urlpatterns = [
    path('sociale/', include(router.urls)),
]
