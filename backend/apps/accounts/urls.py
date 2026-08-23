from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views
from .views import CustomTokenObtainPairView
from .export_views import export_membres_view

urlpatterns = [
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('register/', views.register),
    path('me/', views.me),
    path('me/change-password/', views.change_password),
    path('users/', views.UserList.as_view()),
    path('users/<int:pk>/', views.UserDetail.as_view()),
    path('users/import-excel/', views.import_membres_excel),
    path('admin/statistiques/', views.stats_admin),
    path('me/badges/', views.mes_badges),
    path('export-membres/', export_membres_view),
    path('journal/', views.JournalActionList.as_view()),
    path('connexions/', views.HistoriqueConnexionList.as_view()),
]
