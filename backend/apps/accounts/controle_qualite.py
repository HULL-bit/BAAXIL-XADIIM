"""
Contrôle qualité des fiches membres (retour du pilote) :

1. Matricule conforme — format S01DK01001 = S + n° de section (2 chiffres) + code ville
   (2 lettres) + n° de cellule (2 chiffres) + n° d'ordre d'inscription dans la cellule
   (3 chiffres). S01DK = section de Dakar, S01DK01 = une cellule de cette section.
2. Aucun adulte (18 ans et +) dans la catégorie enfant (500 F).
3. Membres du Bureau National correctement identifiés pour que le tarif de 5 000 F/mois
   s'applique.

Lecture seule : ce module ne modifie jamais les fiches, il liste les anomalies à corriger.
"""
import re
from collections import Counter, defaultdict
from decimal import Decimal

from django.utils import timezone

# Le matricule est stocké dans le champ « numéro de carte membre » (numero_carte).
MATRICULE_RE = re.compile(r'^S(\d{2})([A-Z]{2})(\d{2})(\d{3})$')
EXEMPLE_MATRICULE = 'S01DK01001'
# Code officiel d'une section (Section.code) : S + 2 chiffres + 2 lettres, ex. S01DK.
CODE_SECTION_RE = re.compile(r'^S\d{2}[A-Z]{2}$')

AGE_ADULTE = 18
TARIF_ENFANT = Decimal('500')
TARIF_BUREAU_NATIONAL = Decimal('5000')
# Rôles qui correspondent à des fonctions du Bureau National (SG, secrétariat, finances).
ROLES_BUREAU_NATIONAL = ('national_lecture', 'secretariat_national', 'finance_national')

LIBELLES = {
    'matricule_manquant': 'Matricule manquant',
    'matricule_format': f'Matricule au mauvais format (attendu : {EXEMPLE_MATRICULE})',
    'matricule_doublon': 'Matricule utilisé par plusieurs membres',
    'matricule_hors_reference': 'Matricule ne commençant pas par le code officiel de la section/cellule',
    'matricule_prefixe_section': 'Préfixe de section différent des autres membres de la section',
    'matricule_prefixe_cellule': 'Préfixe de cellule différent des autres membres de la cellule',
    'matricule_prefixe_partage': 'Même préfixe utilisé par plusieurs sections/cellules',
    'matricule_sans_cellule': 'Membre sans cellule : matricule impossible à vérifier',
    'enfant_adulte': 'Adulte (18 ans et +) classé enfant à 500 F',
    'enfant_adulte_limite': 'A 18 ans cette année, classé enfant à 500 F (à vérifier)',
    'enfant_sans_annee': 'Enfant à 500 F sans année de naissance : âge non vérifiable',
    'enfant_annee_invalide': 'Enfant à 500 F avec une année de naissance impossible',
    'bn_tarif_incorrect': 'Membre du Bureau National dont le tarif n’est pas 5 000 F',
    'bn_non_identifie': 'Tarif 5 000 F mais membre non identifié Bureau National',
    'bn_probable': 'Fonction nationale (SG / secrétariat / finances) non marquée Bureau National',
}


def membres_a_controler(base_qs):
    """Comptes membres actifs : exclut les comptes techniques (Super Admin / staff)."""
    return (
        base_qs.filter(is_active=True, is_staff=False, is_superuser=False)
        .exclude(role='admin')
        .select_related('section', 'dahira', 'dahira__sous_section')
        .order_by('section__nom', 'dahira__nom', 'last_name', 'first_name')
    )


def _anomalie(membre, type_, severite, detail=''):
    return {
        'membre_id': membre.id,
        'nom': membre.get_full_name() or membre.username,
        'username': membre.username,
        'section': membre.section.nom if membre.section_id else '',
        'dahira': membre.dahira.nom if membre.dahira_id else '',
        'matricule': membre.numero_carte or '',
        'annee_naissance': membre.annee_naissance,
        'montant_cotisation': str(membre.montant_cotisation),
        'est_bureau_national': membre.est_bureau_national,
        'type': type_,
        'libelle': LIBELLES[type_],
        'severite': severite,  # 'erreur' = à corriger, 'verifier' = à confirmer
        'detail': detail,
    }


def _majoritaire(prefixes):
    return Counter(prefixes).most_common(1)[0][0] if prefixes else None


def _ref_section(membre):
    """Code officiel de la section du membre (S01DK), '' s'il n'est pas encore au format officiel."""
    code = (membre.section.code or '').upper() if membre.section_id else ''
    return code if CODE_SECTION_RE.match(code) else ''


def controle_matricules(membres):
    anomalies = []
    valides = []  # (membre, matricule normalisé)
    for m in membres:
        brut = (m.numero_carte or '').strip()
        if not brut:
            anomalies.append(_anomalie(m, 'matricule_manquant', 'erreur'))
            continue
        matricule = brut.upper().replace(' ', '')
        if not MATRICULE_RE.match(matricule):
            anomalies.append(_anomalie(m, 'matricule_format', 'erreur', f'Valeur saisie : « {brut} »'))
            continue
        if not m.dahira_id:
            anomalies.append(_anomalie(m, 'matricule_sans_cellule', 'verifier'))
            continue
        valides.append((m, matricule))

    # Mêmes matricules utilisés par plusieurs membres.
    par_matricule = defaultdict(list)
    for m, mat in valides:
        par_matricule[mat].append(m)
    for mat, groupe in par_matricule.items():
        if len(groupe) > 1:
            noms = ', '.join(g.get_full_name() or g.username for g in groupe)
            for m in groupe:
                anomalies.append(_anomalie(m, 'matricule_doublon', 'erreur', f'{mat} partagé par : {noms}'))

    # Cohérence des préfixes. Le référentiel officiel (S01DK = Dakar…) n'est pas en
    # base : on vérifie donc la cohérence interne, le préfixe majoritaire de la
    # section / de la cellule faisant foi.
    prefixes_section = defaultdict(list)   # section_id -> [S01DK, ...]
    prefixes_cellule = defaultdict(list)   # dahira_id  -> [S01DK01, ...]
    sections_par_prefixe = defaultdict(set)
    cellules_par_prefixe = defaultdict(set)
    for m, mat in valides:
        p_section, p_cellule = mat[:5], mat[:7]
        prefixes_section[m.section_id].append(p_section)
        # Un matricule qui contredit le code officiel de la section ne doit pas fausser
        # le préfixe « majoritaire » de sa cellule.
        ref = _ref_section(m)
        if not ref or mat.startswith(ref):
            prefixes_cellule[m.dahira_id].append(p_cellule)
        sections_par_prefixe[p_section].add(m.section_id)
        cellules_par_prefixe[p_cellule].add(m.dahira_id)

    for m, mat in valides:
        p_section, p_cellule = mat[:5], mat[:7]
        ref_section = _ref_section(m)
        ref_cellule = (m.dahira.code or '').upper()
        attendu_section = _majoritaire(prefixes_section[m.section_id])
        attendu_cellule = _majoritaire(prefixes_cellule[m.dahira_id])
        # Codes officiels (Section.code / Dahira.code) : font foi quand ils existent ;
        # sinon on retombe sur la cohérence interne (préfixe majoritaire).
        if ref_cellule:
            if not mat.startswith(ref_cellule):
                anomalies.append(_anomalie(
                    m, 'matricule_hors_reference', 'erreur',
                    f'{mat} : doit commencer par {ref_cellule} (code officiel de la cellule)',
                ))
        elif ref_section:
            if not mat.startswith(ref_section):
                anomalies.append(_anomalie(
                    m, 'matricule_hors_reference', 'erreur',
                    f'{mat} : doit commencer par {ref_section} (code officiel de la section)',
                ))
            elif p_cellule != attendu_cellule:
                anomalies.append(_anomalie(
                    m, 'matricule_prefixe_cellule', 'erreur',
                    f'{mat} : préfixe {p_cellule}, la plupart des membres de la cellule ont {attendu_cellule}',
                ))
        elif p_section != attendu_section:
            anomalies.append(_anomalie(
                m, 'matricule_prefixe_section', 'erreur',
                f'{mat} : préfixe {p_section}, la plupart des membres de la section ont {attendu_section}',
            ))
        elif p_cellule != attendu_cellule:
            anomalies.append(_anomalie(
                m, 'matricule_prefixe_cellule', 'erreur',
                f'{mat} : préfixe {p_cellule}, la plupart des membres de la cellule ont {attendu_cellule}',
            ))
        if len(sections_par_prefixe[p_section]) > 1 or len(cellules_par_prefixe[p_cellule]) > 1:
            anomalies.append(_anomalie(
                m, 'matricule_prefixe_partage', 'erreur',
                f'{mat} : le préfixe {p_cellule} est utilisé dans plusieurs sections/cellules',
            ))
    return anomalies


def controle_enfants(membres, annee=None):
    annee = annee or timezone.localdate().year
    anomalies = []
    for m in membres:
        if m.montant_cotisation != TARIF_ENFANT:
            continue
        if m.annee_naissance is None:
            anomalies.append(_anomalie(m, 'enfant_sans_annee', 'verifier'))
        elif m.annee_naissance > annee or m.annee_naissance < 1900:
            anomalies.append(_anomalie(m, 'enfant_annee_invalide', 'erreur', f'Année saisie : {m.annee_naissance}'))
        else:
            age = annee - m.annee_naissance
            if age > AGE_ADULTE:
                anomalies.append(_anomalie(m, 'enfant_adulte', 'erreur', f'Né(e) en {m.annee_naissance} : {age} ans en {annee}'))
            elif age == AGE_ADULTE:
                # Seule l'année est connue : 17 ou 18 ans selon le mois de naissance.
                anomalies.append(_anomalie(m, 'enfant_adulte_limite', 'verifier', f'Né(e) en {m.annee_naissance} : 18 ans en {annee} (si le mois est dépassé)'))
    return anomalies


def controle_bureau_national(membres):
    anomalies = []
    for m in membres:
        if m.est_bureau_national and m.montant_cotisation != TARIF_BUREAU_NATIONAL:
            anomalies.append(_anomalie(
                m, 'bn_tarif_incorrect', 'erreur',
                f'Tarif actuel {m.montant_cotisation} F au lieu de {TARIF_BUREAU_NATIONAL} F',
            ))
        elif not m.est_bureau_national and m.montant_cotisation == TARIF_BUREAU_NATIONAL:
            anomalies.append(_anomalie(m, 'bn_non_identifie', 'erreur'))
        elif not m.est_bureau_national and m.role in ROLES_BUREAU_NATIONAL:
            anomalies.append(_anomalie(m, 'bn_probable', 'verifier', f'Rôle : {m.get_role_display()}'))
    return anomalies


def etat_references(membres):
    """Sections et cellules (avec des membres) qui n'ont pas encore de code officiel :
    leurs matricules ne peuvent être vérifiés que par cohérence interne."""
    sections = {}
    cellules = {}
    for m in membres:
        if m.section_id and not CODE_SECTION_RE.match((m.section.code or '').upper()):
            sections[m.section.nom] = sections.get(m.section.nom, 0) + 1
        if m.dahira_id:
            c = cellules.setdefault(m.dahira_id, {'dahira': m.dahira.nom, 'section': m.section.nom if m.section_id else '', 'membres': 0, 'code': m.dahira.code})
            c['membres'] += 1
    sans_code = sorted((c for c in cellules.values() if not c['code']), key=lambda c: (c['section'], c['dahira']))
    return {
        'sections_sans_code_officiel': sorted(sections),
        'cellules_avec_code': sum(1 for c in cellules.values() if c['code']),
        'cellules_sans_code': sans_code,
    }


def _bloc(libelle, anomalies):
    return {
        'libelle': libelle,
        'total_anomalies': len(anomalies),
        'par_type': dict(Counter(a['type'] for a in anomalies)),
        'anomalies': anomalies,
    }


def rapport_controle_qualite(base_qs, annee=None):
    """`base_qs` doit déjà être restreint au périmètre de l'utilisateur."""
    annee = annee or timezone.localdate().year
    membres = list(membres_a_controler(base_qs))
    return {
        'annee_reference': annee,
        'total_membres': len(membres),
        'libelles': LIBELLES,
        'references': etat_references(membres),
        'controles': {
            'matricule': _bloc('Matricules conformes (format S01DK01001)', controle_matricules(membres)),
            'enfants': _bloc('Adultes classés « enfant » (500 F)', controle_enfants(membres, annee)),
            'bureau_national': _bloc('Bureau National — tarif 5 000 F', controle_bureau_national(membres)),
        },
    }
