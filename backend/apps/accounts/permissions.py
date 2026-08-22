from rest_framework.permissions import IsAdminUser, BasePermission

# Rôles scopés lecture seule au niveau national (limités aux cellules pilotes).
NATIONAL_READONLY_ROLES = {'national_lecture', 'secretariat_national', 'finance_national'}
# Rôles scopés à une cellule (dahira) du user.
CELLULE_ROLES = {'cellule_admin', 'cellule_finance', 'cellule_president'}

# Séparation des tâches (principe de l'audit) : chaque rôle ne voit/écrit que la
# rubrique qui lui est confiée, même à niveau hiérarchique égal.
MEMBERS_READ_ROLES = {
    'national_lecture', 'secretariat_national', 'section_lecture',
    'cellule_admin', 'cellule_finance', 'cellule_president',
}
MEMBERS_WRITE_ROLES = {'cellule_admin'}
FINANCE_READ_ROLES = {
    'national_lecture', 'finance_national', 'section_lecture',
    'cellule_finance', 'cellule_president',
}
FINANCE_WRITE_ROLES = {'cellule_finance'}


class IsAdminRoleOrStaff(IsAdminUser):
    """
    Autorise l'accès si l'utilisateur est staff Django
    OU s'il a role='admin' (Super Admin) dans notre modèle CustomUser.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return bool(user.is_staff or getattr(user, "role", None) == "admin")


def is_super_admin(user):
    if not user or not user.is_authenticated:
        return False
    return bool(user.is_staff or getattr(user, "role", None) == "admin")


def user_scope(user):
    """
    Renvoie le périmètre d'accès d'un utilisateur selon la matrice de la phase pilote :
    - 'national' : voit toutes les cellules pilotes (lecture seule)
    - 'section'  : voit les cellules pilotes de sa propre section (lecture seule)
    - 'cellule'  : voit uniquement sa propre cellule (dahira) — écriture ou lecture
                   selon le rôle précis
    - None       : pas de périmètre admin (simple membre) ou super admin (illimité)
    """
    if not user or not user.is_authenticated:
        return {'level': None}
    role = getattr(user, 'role', None)
    if role == 'admin':
        return {'level': 'all'}
    if role in NATIONAL_READONLY_ROLES:
        return {'level': 'national'}
    if role == 'section_lecture':
        return {'level': 'section', 'section_id': user.section_id}
    if role in CELLULE_ROLES:
        return {'level': 'cellule', 'dahira_id': user.dahira_id}
    return {'level': None}


def _can_access(user, read_roles, write_roles, dahira_id, section_id, write=False):
    if is_super_admin(user):
        return True
    role = getattr(user, 'role', None)
    if not role:
        return False
    allowed_roles = write_roles if write else read_roles
    if role not in allowed_roles:
        return False
    scope = user_scope(user)
    level = scope['level']
    if level == 'national':
        return True  # filtré aux cellules pilotes par le queryset appelant
    if level == 'section':
        return scope.get('section_id') is not None and scope['section_id'] == section_id
    if level == 'cellule':
        return scope.get('dahira_id') is not None and scope['dahira_id'] == dahira_id
    return False


def can_view_members(user, dahira_id=None, section_id=None):
    """Lecture des membres : matrice « qui voit quoi » côté effectifs (séparation
    des tâches — un rôle finance ne voit pas la liste des membres, par ex.)."""
    return _can_access(user, MEMBERS_READ_ROLES, MEMBERS_WRITE_ROLES, dahira_id, section_id)


def can_write_members(user, dahira_id=None):
    """Écriture (ajout/modif/suppression) des membres : réservé au Secrétaire
    Administratif de Cellule (sur sa propre cellule) et au Super Admin."""
    return _can_access(user, MEMBERS_READ_ROLES, MEMBERS_WRITE_ROLES, dahira_id, None, write=True)


def can_view_finance(user, dahira_id=None, section_id=None):
    """Lecture des flux financiers : séparation des tâches — un rôle membres (ex.
    Secrétaire Administratif de Cellule) ne voit pas les cotisations/dépenses."""
    return _can_access(user, FINANCE_READ_ROLES, FINANCE_WRITE_ROLES, dahira_id, section_id)


def can_write_finance(user, dahira_id=None):
    """Écriture (validation paiements, dépenses, hadiya) : réservé au Secrétaire aux
    Finances de Cellule (sur sa propre cellule) et au Super Admin."""
    return _can_access(user, FINANCE_READ_ROLES, FINANCE_WRITE_ROLES, dahira_id, None, write=True)


def scope_filter(qs, user, dahira_field, section_field):
    """Filtre un queryset selon le périmètre hiérarchique du user (à appliquer après
    avoir vérifié can_view_members/can_view_finance). `dahira_field`/`section_field`
    sont des chemins ORM vers les FK Dahira/Section (ex. 'dahira' sur CustomUser,
    'membre__dahira' sur CotisationMensuelle) — sans suffixe '_id'.
    - Super Admin : queryset inchangé.
    - national     : limité aux cellules pilotes (est_pilote=True).
    - section      : limité à sa section, cellules pilotes uniquement.
    - cellule      : limité à sa propre cellule (dahira).
    """
    if is_super_admin(user):
        return qs
    scope = user_scope(user)
    level = scope['level']
    if level == 'national':
        return qs.filter(**{f'{dahira_field}__est_pilote': True})
    if level == 'section':
        if not scope.get('section_id'):
            return qs.none()
        return qs.filter(**{f'{section_field}_id': scope['section_id'], f'{dahira_field}__est_pilote': True})
    if level == 'cellule':
        if not scope.get('dahira_id'):
            return qs.none()
        return qs.filter(**{f'{dahira_field}_id': scope['dahira_id']})
    return qs.none()


def has_members_visibility(user):
    """Capacité générale (indépendante d'une cible précise) : ce rôle a-t-il *une*
    visibilité sur des membres, quelque part dans son périmètre ? À utiliser pour les
    vues récapitulatives (tableau de bord) — pas pour un objet précis, où
    can_view_members(user, dahira_id, section_id) reste la bonne fonction."""
    return is_super_admin(user) or getattr(user, 'role', None) in MEMBERS_READ_ROLES


def has_finance_visibility(user):
    """Équivalent finance de has_members_visibility()."""
    return is_super_admin(user) or getattr(user, 'role', None) in FINANCE_READ_ROLES


def permissions_summary(user):
    """Résumé des droits pour le frontend (exposé via /auth/me/), pour éviter de
    dupliquer la logique de scope/séparation des tâches côté client."""
    scope = user_scope(user)
    super_admin = is_super_admin(user)
    role = getattr(user, 'role', None)
    return {
        'is_super_admin': super_admin,
        'scope_level': scope['level'],
        'scope_section_id': scope.get('section_id'),
        'scope_dahira_id': scope.get('dahira_id'),
        'can_view_members': has_members_visibility(user),
        'can_manage_members': super_admin or role in MEMBERS_WRITE_ROLES,
        'can_view_finance': has_finance_visibility(user),
        'can_manage_finance': super_admin or role in FINANCE_WRITE_ROLES,
        'can_manage_cellules': super_admin,
        'can_view_national_synthese': super_admin or scope['level'] in ('national', 'section'),
    }


def has_admin_access(user, rubrique):
    """
    Vérifie si un utilisateur a les droits admin sur une rubrique hors périmètre
    prioritaire de la phase pilote (culturelle, conservatoire, scientifique, sociale,
    communication, organisation). Ces modules sont masqués du menu pendant le pilote ;
    seul le Super Admin peut y écrire (plus de rôles spécialisés par rubrique).

    'membres' et 'finance' utilisent désormais can_view_members/can_write_members et
    can_view_finance/can_write_finance ci-dessus, scopés à la cellule/section/national.
    """
    return is_super_admin(user)


class CanViewMembers(BasePermission):
    """Autorise la lecture de la liste des membres : Super Admin ou tout rôle
    scopé ayant la visibilité effectifs (le périmètre précis est appliqué dans
    get_queryset via scope_filter)."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return is_super_admin(user) or getattr(user, 'role', None) in MEMBERS_READ_ROLES


class IsSuperAdminRubrique(BasePermission):
    """Autorise uniquement le Super Admin sur une rubrique hors périmètre prioritaire
    (culturelle, conservatoire, etc.)."""

    def __init__(self, rubrique):
        self.rubrique = rubrique

    def has_permission(self, request, view):
        return has_admin_access(request.user, self.rubrique)


class IsSuperAdminConservatoire(BasePermission):
    def has_permission(self, request, view):
        return has_admin_access(request.user, 'conservatoire')


class IsSuperAdminCulturelle(BasePermission):
    def has_permission(self, request, view):
        return has_admin_access(request.user, 'culturelle')


class IsFinanceWriteAccess(BasePermission):
    """Permission pour les actions d'écriture finance : Super Admin ou Secrétaire aux
    Finances de Cellule (le scope précis sur la cellule est vérifié dans la vue)."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return is_super_admin(user) or getattr(user, 'role', None) == 'cellule_finance'


class IsSuperAdminSociale(BasePermission):
    def has_permission(self, request, view):
        return has_admin_access(request.user, 'sociale')


class IsSuperAdminCommunication(BasePermission):
    def has_permission(self, request, view):
        return has_admin_access(request.user, 'communication')


class IsSuperAdminOrganisation(BasePermission):
    def has_permission(self, request, view):
        return has_admin_access(request.user, 'organisation')


class IsSuperAdminScientifique(BasePermission):
    def has_permission(self, request, view):
        return has_admin_access(request.user, 'scientifique')
