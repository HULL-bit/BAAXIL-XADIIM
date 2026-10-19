"""
Attribution des matricules (format S01DK01001 = code de la cellule + n° d'ordre à 3
chiffres). Le code de la cellule (Dahira.code, ex. S01DK01) est la référence officielle ;
le n° d'ordre suit l'ordre d'inscription dans la cellule.
"""
import re
import unicodedata

MAX_RANG = 999


def normaliser(texte):
    """Minuscules, sans accents ni espaces multiples : « Serigne  MBACKÉ » == « serigne mbacke »."""
    s = unicodedata.normalize('NFKD', str(texte or ''))
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return ' '.join(s.lower().split())


def nom_complet(membre):
    return normaliser(f'{membre.first_name} {membre.last_name}')


def _rang_existant(code_cellule, numero):
    m = re.match(rf'^{re.escape(code_cellule)}(\d{{3}})$', (numero or '').strip().upper())
    return int(m.group(1)) if m else None


def plan_attribution(code_cellule, membres, premier=None):
    """
    Renvoie la liste [(membre, matricule)] à attribuer pour UNE cellule.

    - ne touche jamais un membre qui a déjà un numéro de carte ;
    - ordre : date d'inscription puis id (ordre d'import) ;
    - `premier` (nom complet) : ce membre reçoit le rang 001 (il doit être libre).
    Lève ValueError si la demande est impossible ou ambiguë (rien n'est deviné).
    """
    code_cellule = code_cellule.upper()
    membres = sorted(membres, key=lambda m: (m.date_inscription, m.id))
    rangs_pris = {r for r in (_rang_existant(code_cellule, m.numero_carte) for m in membres) if r}
    a_attribuer = [m for m in membres if not (m.numero_carte or '').strip()]

    if premier:
        cible = normaliser(premier)
        trouves = [m for m in membres if nom_complet(m) == cible]
        if not trouves:
            mots = [w for w in cible.split() if len(w) >= 4]
            proches = [m for m in membres if any(w in nom_complet(m) for w in mots)][:5]
            indice = ' ; '.join(f'{m.first_name} {m.last_name}' for m in proches) or 'aucun nom proche'
            raise ValueError(f"« {premier} » introuvable dans la cellule {code_cellule}. Noms proches : {indice}")
        if len(trouves) > 1:
            raise ValueError(f"« {premier} » correspond à {len(trouves)} membres de la cellule {code_cellule} : précision impossible")
        membre = trouves[0]
        attendu = f'{code_cellule}001'
        if (membre.numero_carte or '').strip():
            if membre.numero_carte.strip().upper() != attendu:
                raise ValueError(f'{premier} a déjà le numéro « {membre.numero_carte} » (attendu {attendu}) : rien n\'est écrasé')
        else:
            if 1 in rangs_pris:
                raise ValueError(f'{attendu} est déjà attribué à un autre membre : impossible de donner le 001 à {premier}')
            a_attribuer.remove(membre)
            a_attribuer.insert(0, membre)

    plan = []
    rang = 0
    for membre in a_attribuer:
        rang += 1
        while rang in rangs_pris:
            rang += 1
        if rang > MAX_RANG:
            raise ValueError(f'Cellule {code_cellule} : plus de {MAX_RANG} membres, le n° d\'ordre à 3 chiffres ne suffit pas')
        plan.append((membre, f'{code_cellule}{rang:03d}'))
    return plan
