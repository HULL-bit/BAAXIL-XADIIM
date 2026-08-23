"""
Traçabilité/sécurité : IP client, parsing basique du User-Agent (sans dépendance
externe), et helpers pour journaliser connexions et actions sensibles.
"""


def get_client_ip(request):
    """
    Render (comme la plupart des PaaS) place le vrai visiteur derrière un proxy —
    REMOTE_ADDR serait l'IP du load-balancer. X-Forwarded-For contient la chaîne
    réelle (client, proxy1, proxy2…) : on prend la première entrée.
    """
    if not request:
        return None
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def parse_user_agent(ua):
    """
    Détection simple (pas de dépendance externe) du navigateur/OS/appareil à partir
    de la chaîne User-Agent — suffisant pour un journal de sécurité, pas besoin d'une
    précision parfaite.
    """
    ua = ua or ''
    ua_lower = ua.lower()

    if 'edg/' in ua_lower:
        navigateur = 'Edge'
    elif 'opr/' in ua_lower or 'opera' in ua_lower:
        navigateur = 'Opera'
    elif 'firefox/' in ua_lower:
        navigateur = 'Firefox'
    elif 'chrome/' in ua_lower and 'chromium' not in ua_lower:
        navigateur = 'Chrome'
    elif 'safari/' in ua_lower and 'chrome/' not in ua_lower:
        navigateur = 'Safari'
    elif ua_lower:
        navigateur = 'Autre'
    else:
        navigateur = ''

    if 'windows' in ua_lower:
        os_name = 'Windows'
    elif 'android' in ua_lower:
        os_name = 'Android'
    elif 'iphone' in ua_lower or 'ipad' in ua_lower or 'ios' in ua_lower:
        os_name = 'iOS'
    elif 'mac os' in ua_lower or 'macintosh' in ua_lower:
        os_name = 'macOS'
    elif 'linux' in ua_lower:
        os_name = 'Linux'
    else:
        os_name = ''

    if 'mobile' in ua_lower and 'ipad' not in ua_lower:
        appareil = 'Mobile'
    elif 'ipad' in ua_lower or 'tablet' in ua_lower:
        appareil = 'Tablette'
    elif ua_lower:
        appareil = 'Ordinateur'
    else:
        appareil = ''

    return navigateur, os_name, appareil


def log_connexion(request, user, succes=True):
    from .models import HistoriqueConnexion

    if not request or not user:
        return None
    ua = request.META.get('HTTP_USER_AGENT', '')
    navigateur, os_name, appareil = parse_user_agent(ua)
    try:
        return HistoriqueConnexion.objects.create(
            user=user,
            adresse_ip=get_client_ip(request),
            user_agent=ua[:1000],
            navigateur=navigateur,
            systeme_exploitation=os_name,
            appareil=appareil,
            succes=succes,
        )
    except Exception:
        # Le journal ne doit jamais faire échouer la requête réelle (login, etc.).
        return None


def log_action(request, acteur, action, description='', cible_type='', cible_id=None):
    from .models import JournalAction

    ua = request.META.get('HTTP_USER_AGENT', '') if request else ''
    try:
        return JournalAction.objects.create(
            acteur=acteur if (acteur and getattr(acteur, 'is_authenticated', True)) else None,
            action=action,
            description=description,
            cible_type=cible_type,
            cible_id=cible_id,
            adresse_ip=get_client_ip(request),
            user_agent=ua[:1000],
        )
    except Exception:
        return None
