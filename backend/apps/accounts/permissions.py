from rest_framework.permissions import IsAdminUser, BasePermission

# Préréglages "par rôle" (audit dahira) : choisir un rôle dans l'UI pré-remplit ces
# champs sur le compte — mais ce sont bien les champs individuels du modèle
# (CustomUser.membres_lecture, .finance_ajout, etc.) qui font foi ensuite. Un Super
# Admin peut donc soit changer le rôle (tout le monde ayant ce rôle repart du même
# préréglage), soit ajuster les droits d'UNE personne précise sans toucher aux autres.
ROLE_PRESETS = {
    'national_lecture': {
        'niveau_acces': 'national',
        'membres_lecture': True, 'membres_ajout': False, 'membres_modification': False, 'membres_suppression': False,
        'finance_lecture': True, 'finance_ajout': False, 'finance_modification': False, 'finance_suppression': False, 'finance_validation': False,
        'synthese_nationale': True, 'logs_lecture': False,
    },
    'secretariat_national': {
        'niveau_acces': 'national',
        'membres_lecture': True, 'membres_ajout': False, 'membres_modification': False, 'membres_suppression': False,
        'finance_lecture': False, 'finance_ajout': False, 'finance_modification': False, 'finance_suppression': False, 'finance_validation': False,
        'synthese_nationale': False, 'logs_lecture': False,
    },
    'finance_national': {
        'niveau_acces': 'national',
        'membres_lecture': False, 'membres_ajout': False, 'membres_modification': False, 'membres_suppression': False,
        'finance_lecture': True, 'finance_ajout': False, 'finance_modification': False, 'finance_suppression': False, 'finance_validation': False,
        'synthese_nationale': True, 'logs_lecture': False,
    },
    'section_lecture': {
        'niveau_acces': 'section',
        'membres_lecture': True, 'membres_ajout': False, 'membres_modification': False, 'membres_suppression': False,
        'finance_lecture': True, 'finance_ajout': False, 'finance_modification': False, 'finance_suppression': False, 'finance_validation': False,
        'synthese_nationale': True, 'logs_lecture': False,
    },
    'cellule_admin': {
        'niveau_acces': 'cellule',
        'membres_lecture': True, 'membres_ajout': True, 'membres_modification': True, 'membres_suppression': True,
        'finance_lecture': False, 'finance_ajout': False, 'finance_modification': False, 'finance_suppression': False, 'finance_validation': False,
        'synthese_nationale': False, 'logs_lecture': False,
    },
    'cellule_finance': {
        'niveau_acces': 'cellule',
        'membres_lecture': True, 'membres_ajout': False, 'membres_modification': False, 'membres_suppression': False,
        'finance_lecture': True, 'finance_ajout': True, 'finance_modification': True, 'finance_suppression': True, 'finance_validation': True,
        'synthese_nationale': False, 'logs_lecture': False,
    },
    'cellule_president': {
        'niveau_acces': 'cellule',
        'membres_lecture': True, 'membres_ajout': False, 'membres_modification': False, 'membres_suppression': False,
        'finance_lecture': True, 'finance_ajout': False, 'finance_modification': False, 'finance_suppression': False, 'finance_validation': False,
        'synthese_nationale': False, 'logs_lecture': False,
    },
    'membre': {
        'niveau_acces': '',
        'membres_lecture': False, 'membres_ajout': False, 'membres_modification': False, 'membres_suppression': False,
        'finance_lecture': False, 'finance_ajout': False, 'finance_modification': False, 'finance_suppression': False, 'finance_validation': False,
        'synthese_nationale': False, 'logs_lecture': False,
    },
}

PERMISSION_FIELDS = [
    'niveau_acces',
    'membres_lecture', 'membres_ajout', 'membres_modification', 'membres_suppression',
    'finance_lecture', 'finance_ajout', 'finance_modification', 'finance_suppression', 'finance_validation',
    'synthese_nationale', 'logs_lecture',
]


def apply_role_preset(user, role):
    """Applique le préréglage du rôle choisi sur l'instance (ne sauvegarde pas —
    à l'appelant de faire user.save() avec les bons update_fields)."""
    preset = ROLE_PRESETS.get(role)
    if preset is None:
        return
    for field, value in preset.items():
        setattr(user, field, value)


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
    Renvoie le périmètre d'accès d'un utilisateur d'après son niveau_acces
    individuel :
    - 'all'          : Super Admin, illimité
    - 'national'     : cellules pilotes (toutes)
    - 'regroupement' : cellules pilotes de son propre regroupement (user.regroupement)
    - 'section'      : cellules pilotes de sa propre section (user.section)
    - 'cellule'      : sa propre cellule (user.dahira)
    - None           : aucun périmètre (pas de droit admin sur rien)
    """
    if not user or not user.is_authenticated:
        return {'level': None}
    if is_super_admin(user):
        return {'level': 'all'}
    niveau = getattr(user, 'niveau_acces', '') or ''
    if niveau == 'national':
        return {'level': 'national'}
    if niveau == 'regroupement':
        return {'level': 'regroupement', 'regroupement_id': user.regroupement_id}
    if niveau == 'section':
        return {'level': 'section', 'section_id': user.section_id}
    if niveau == 'cellule':
        return {'level': 'cellule', 'dahira_id': user.dahira_id}
    return {'level': None}


def _check_scope(user, dahira_id=None, section_id=None, regroupement_id=None):
    """Le champ individuel (ex. membres_lecture) est déjà vérifié par l'appelant —
    ici on vérifie seulement que la cible demandée est dans le périmètre du user."""
    scope = user_scope(user)
    level = scope['level']
    if level == 'all':
        return True
    if level == 'national':
        return True  # filtré aux cellules pilotes par le queryset appelant
    if level == 'regroupement':
        return scope.get('regroupement_id') is not None and scope['regroupement_id'] == regroupement_id
    if level == 'section':
        return scope.get('section_id') is not None and scope['section_id'] == section_id
    if level == 'cellule':
        return scope.get('dahira_id') is not None and scope['dahira_id'] == dahira_id
    return False


def has_perm(user, field, dahira_id=None, section_id=None, regroupement_id=None):
    """Vérifie un droit individuel précis (ex. 'finance_validation'), scopé à une
    cellule/section/regroupement cible. Super Admin : toujours vrai."""
    if is_super_admin(user):
        return True
    if not getattr(user, field, False):
        return False
    return _check_scope(user, dahira_id, section_id, regroupement_id)


def has_perm_anywhere(user, field):
    """Capacité générale (sans cible précise) : ce champ est-il activé, quelque
    part dans le périmètre du user ? À utiliser pour les vues récapitulatives
    (tableau de bord, menu) — pas pour un objet précis (préférer has_perm())."""
    return is_super_admin(user) or bool(getattr(user, field, False))


# --- Alias historiques (compat des vues existantes) --------------------------

def can_view_members(user, dahira_id=None, section_id=None, regroupement_id=None):
    return has_perm(user, 'membres_lecture', dahira_id, section_id, regroupement_id)


def can_write_members(user, dahira_id=None, section_id=None, regroupement_id=None):
    """Vrai si le user peut ajouter, modifier OU supprimer des membres dans ce
    périmètre (utilisé pour l'accès en écriture générique à la fiche membre)."""
    if is_super_admin(user):
        return True
    if not (user.membres_ajout or user.membres_modification or user.membres_suppression):
        return False
    return _check_scope(user, dahira_id, section_id, regroupement_id)


def can_view_finance(user, dahira_id=None, section_id=None, regroupement_id=None):
    return has_perm(user, 'finance_lecture', dahira_id, section_id, regroupement_id)


def can_write_finance(user, dahira_id=None, section_id=None, regroupement_id=None):
    """Vrai si le user peut ajouter, modifier, supprimer OU valider des opérations
    financières dans ce périmètre."""
    if is_super_admin(user):
        return True
    if not (user.finance_ajout or user.finance_modification or user.finance_suppression or user.finance_validation):
        return False
    return _check_scope(user, dahira_id, section_id, regroupement_id)


def scope_filter(qs, user, dahira_field, section_field):
    """Filtre un queryset selon le périmètre hiérarchique du user (à appliquer après
    avoir vérifié le droit individuel concerné). `dahira_field`/`section_field` sont
    des chemins ORM vers les FK Dahira/Section (ex. 'dahira' sur CustomUser,
    'membre__dahira' sur CotisationMensuelle) — sans suffixe '_id'. Le chemin vers
    Regroupement est dérivé automatiquement du même préfixe que `dahira_field`
    (ex. 'membre__dahira' -> 'membre__regroupement').
    """
    if is_super_admin(user):
        return qs
    scope = user_scope(user)
    level = scope['level']
    if level == 'national':
        return qs.filter(**{f'{dahira_field}__est_pilote': True})
    if level == 'regroupement':
        if not scope.get('regroupement_id'):
            return qs.none()
        prefix = dahira_field.rsplit('__', 1)[0] + '__' if '__' in dahira_field else ''
        regroupement_field = f'{prefix}regroupement'
        return qs.filter(**{f'{regroupement_field}_id': scope['regroupement_id'], f'{dahira_field}__est_pilote': True})
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
    return has_perm_anywhere(user, 'membres_lecture')


def has_finance_visibility(user):
    return has_perm_anywhere(user, 'finance_lecture')


def permissions_summary(user):
    """Résumé des droits pour le frontend (exposé via /auth/me/), pour éviter de
    dupliquer la logique de scope/séparation des tâches côté client."""
    scope = user_scope(user)
    super_admin = is_super_admin(user)

    def flag(field):
        return super_admin or bool(getattr(user, field, False))

    return {
        'is_super_admin': super_admin,
        'scope_level': scope['level'],
        'scope_regroupement_id': scope.get('regroupement_id'),
        'scope_section_id': scope.get('section_id'),
        'scope_dahira_id': scope.get('dahira_id'),
        'niveau_acces': 'national' if scope['level'] == 'all' else (getattr(user, 'niveau_acces', '') or ''),
        # Détail par action (pour une UI fine si besoin)
        'membres_lecture': flag('membres_lecture'),
        'membres_ajout': flag('membres_ajout'),
        'membres_modification': flag('membres_modification'),
        'membres_suppression': flag('membres_suppression'),
        'finance_lecture': flag('finance_lecture'),
        'finance_ajout': flag('finance_ajout'),
        'finance_modification': flag('finance_modification'),
        'finance_suppression': flag('finance_suppression'),
        'finance_validation': flag('finance_validation'),
        'synthese_nationale': flag('synthese_nationale'),
        'logs_lecture': flag('logs_lecture'),
        # Agrégats (compat composants existants : un menu/bouton générique n'a pas
        # besoin de savoir laquelle des 4 actions précises est en jeu)
        'can_view_members': flag('membres_lecture'),
        'can_manage_members': super_admin or user.membres_ajout or user.membres_modification or user.membres_suppression,
        'can_view_finance': flag('finance_lecture'),
        'can_manage_finance': super_admin or user.finance_ajout or user.finance_modification or user.finance_suppression or user.finance_validation,
        'can_manage_cellules': super_admin,
        'can_view_national_synthese': flag('synthese_nationale'),
        'can_view_logs': flag('logs_lecture'),
    }


def has_admin_access(user, rubrique):
    """
    Vérifie si un utilisateur a les droits admin sur une rubrique hors périmètre
    prioritaire de la phase pilote (culturelle, conservatoire, scientifique, sociale,
    communication, organisation). Ces modules sont masqués du menu pendant le pilote ;
    seul le Super Admin peut y écrire (plus de rôles spécialisés par rubrique).
    """
    return is_super_admin(user)


class CanViewLogs(BasePermission):
    """Autorise la lecture des logs système (connexions + journal des actions) :
    Super Admin, ou tout compte à qui ce droit a été délégué individuellement
    (Rôles & Permissions → Personnaliser → Logs système)."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return is_super_admin(user) or bool(getattr(user, 'logs_lecture', False))


class CanViewMembers(BasePermission):
    """Autorise la lecture de la liste des membres : Super Admin ou tout compte
    ayant membres_lecture (le périmètre précis est appliqué dans get_queryset via
    scope_filter)."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return is_super_admin(user) or bool(getattr(user, 'membres_lecture', False))


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
    """Permission générique pour les actions d'écriture finance (le détail
    ajout/modification/suppression/validation est vérifié dans la vue via
    has_perm()) : Super Admin ou tout compte ayant au moins un droit d'écriture
    finance."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return is_super_admin(user) or any([
            user.finance_ajout, user.finance_modification, user.finance_suppression, user.finance_validation,
        ])


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
