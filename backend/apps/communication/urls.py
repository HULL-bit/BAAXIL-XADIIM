from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'messages', views.MessageViewSet)
router.register(r'forums/categories', views.CategorieForumViewSet)
router.register(r'forums/sujets', views.SujetForumViewSet)
router.register(r'forums/reponses', views.ReponseForumViewSet)
router.register(r'notifications', views.NotificationViewSet)
router.register(r'canaux', views.CanalViewSet)
router.register(r'canal-messages', views.MessageCanalViewSet)

urlpatterns = [
    path('communication/', include(router.urls)),
]
