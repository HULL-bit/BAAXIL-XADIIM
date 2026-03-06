from rest_framework.permissions import IsAdminUser, BasePermission


class IsAdminRoleOrStaff(IsAdminUser):
    """
    Autorise l'accès si l'utilisateur est staff Django
    OU s'il a role='admin' dans notre modèle CustomUser.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        # is_staff (admin Django) ou role logique 'admin'
        return bool(user.is_staff or getattr(user, "role", None) == "admin")


def has_admin_access(user, rubrique):
    """
    Vérifie si un utilisateur a les droits admin sur une rubrique spécifique.
    
    Args:
        user: L'utilisateur à vérifier
        rubrique: La rubrique ('conservatoire', 'culturelle', 'finance', 'sociale', 'communication', 'organisation', 'scientifique')
    
    Returns:
        True si l'utilisateur est admin global OU jewrin de cette rubrique spécifique
    """
    if not user or not user.is_authenticated:
        return False
    
    # Admin global a accès à tout
    if user.is_staff or getattr(user, "role", None) == "admin":
        return True
    
    # Jewrin général a accès à tout
    if getattr(user, "role", None) == "jewrin":
        return True
    
    # Vérifier si c'est un jewrin spécialisé pour cette rubrique
    user_role = getattr(user, "role", None)
    if user_role and isinstance(user_role, str):
        # Format: jewrine_conservatoire, jewrine_finance, etc.
        if user_role.lower() == f"jewrine_{rubrique.lower()}":
            return True
    
    return False


class IsAdminOrJewrinRubrique(BasePermission):
    """
    Permission personnalisée qui autorise :
    - Les admins globaux
    - Les jewrins généraux
    - Les jewrins spécialisés pour la rubrique spécifiée
    """
    
    def __init__(self, rubrique):
        self.rubrique = rubrique
    
    def has_permission(self, request, view):
        return has_admin_access(request.user, self.rubrique)


# Permissions spécifiques par rubrique
class IsAdminOrJewrinConservatoire(BasePermission):
    """Permission pour la rubrique Conservatoire"""
    def has_permission(self, request, view):
        return has_admin_access(request.user, 'conservatoire')


class IsAdminOrJewrinCulturelle(BasePermission):
    """Permission pour la rubrique Culturelle"""
    def has_permission(self, request, view):
        return has_admin_access(request.user, 'culturelle')


class IsAdminOrJewrinFinance(BasePermission):
    """Permission pour la rubrique Finance"""
    def has_permission(self, request, view):
        return has_admin_access(request.user, 'finance')


class IsAdminOrJewrinSociale(BasePermission):
    """Permission pour la rubrique Sociale"""
    def has_permission(self, request, view):
        return has_admin_access(request.user, 'sociale')


class IsAdminOrJewrinCommunication(BasePermission):
    """Permission pour la rubrique Communication"""
    def has_permission(self, request, view):
        return has_admin_access(request.user, 'communication')


class IsAdminOrJewrinOrganisation(BasePermission):
    """Permission pour la rubrique Organisation"""
    def has_permission(self, request, view):
        return has_admin_access(request.user, 'organisation')


class IsAdminOrJewrinScientifique(BasePermission):
    """Permission pour la rubrique Scientifique"""
    def has_permission(self, request, view):
        return has_admin_access(request.user, 'scientifique')
