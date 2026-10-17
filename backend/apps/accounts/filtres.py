from django.utils import timezone


def _entier(valeur):
    try:
        return int(str(valeur).strip())
    except (TypeError, ValueError):
        return None


def filtrer_par_age(qs, params, annee=None):
    """
    Filtre un queryset de membres par âge (partagé par la liste et l'export) :
    - age_min / age_max : bornes incluses, âge = année courante - année de naissance
      (seule l'année est connue, l'âge réel peut donc différer d'un an) ;
    - sans_annee=1 : membres dont l'année de naissance n'est pas renseignée (ils ne
      peuvent apparaître dans aucun filtre d'âge).
    Les valeurs non numériques sont ignorées.
    """
    annee = annee or timezone.localdate().year
    if params.get('sans_annee') in ('1', 'true', 'True', True):
        return qs.filter(annee_naissance__isnull=True)
    age_min = _entier(params.get('age_min'))
    age_max = _entier(params.get('age_max'))
    if age_min is not None:
        qs = qs.filter(annee_naissance__lte=annee - age_min)
    if age_max is not None:
        qs = qs.filter(annee_naissance__gte=annee - age_max)
    return qs
