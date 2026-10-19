from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.organisation.models import Regroupement, Section, SousSection, Dahira
from .controle_qualite import rapport_controle_qualite

User = get_user_model()


class ControleQualiteTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        # get_or_create : des migrations de données peuvent déjà avoir créé ces lignes.
        reg, _ = Regroupement.objects.get_or_create(nom='SECTION YI', defaults={'code': 'SECTION_YI'})
        cls.section, _ = Section.objects.get_or_create(regroupement=reg, nom='SECTION DAKAR', defaults={'code': 'SECTION_DAKAR'})
        ss, _ = SousSection.objects.get_or_create(section=cls.section, sexe='H')
        cls.cellule_a, _ = Dahira.objects.get_or_create(sous_section=ss, nom='Crédit Foncier', defaults={'est_pilote': True})
        cls.cellule_b, _ = Dahira.objects.get_or_create(sous_section=ss, nom='Taïf', defaults={'est_pilote': True})

    def membre(self, username, dahira=None, **kw):
        kw.setdefault('montant_cotisation', Decimal('1000'))
        return User.objects.create_user(
            username=username, password='x', role='membre',
            section=self.section, dahira=dahira or self.cellule_a, **kw,
        )

    def types(self, rapport, controle):
        return sorted((a['username'], a['type']) for a in rapport['controles'][controle]['anomalies'])

    def test_matricules(self):
        self.membre('ok1', numero_carte='S01DK01001')
        self.membre('ok2', numero_carte='s01dk01002')  # casse ignorée
        self.membre('vide')
        self.membre('mauvais', numero_carte='DK-12')
        self.membre('doublon', numero_carte='S01DK01001')
        self.membre('autre_cellule', dahira=self.cellule_b, numero_carte='S01DK02001')
        self.membre('autre_cellule2', dahira=self.cellule_b, numero_carte='S01DK02002')
        self.membre('autre_cellule3', dahira=self.cellule_b, numero_carte='S01DK02003')
        self.membre('mauvais_prefixe', dahira=self.cellule_b, numero_carte='S01DK01009')
        r = rapport_controle_qualite(User.objects.all(), annee=2026)
        t = self.types(r, 'matricule')
        self.assertIn(('vide', 'matricule_manquant'), t)
        self.assertIn(('mauvais', 'matricule_format'), t)
        self.assertIn(('ok1', 'matricule_doublon'), t)
        self.assertIn(('doublon', 'matricule_doublon'), t)
        self.assertIn(('mauvais_prefixe', 'matricule_prefixe_cellule'), t)
        self.assertNotIn(('ok2', 'matricule_format'), t)
        self.assertFalse([x for x in t if x[0] in ('autre_cellule', 'autre_cellule2', 'autre_cellule3')])

    def test_adultes_classes_enfants(self):
        self.membre('enfant', montant_cotisation=Decimal('500'), annee_naissance=2019)
        self.membre('adulte', montant_cotisation=Decimal('500'), annee_naissance=2006)
        self.membre('limite', montant_cotisation=Decimal('500'), annee_naissance=2008)
        self.membre('sans_annee', montant_cotisation=Decimal('500'))
        self.membre('futur', montant_cotisation=Decimal('500'), annee_naissance=2030)
        self.membre('adulte_1000', montant_cotisation=Decimal('1000'), annee_naissance=1985)
        r = rapport_controle_qualite(User.objects.all(), annee=2026)
        self.assertEqual(self.types(r, 'enfants'), sorted([
            ('adulte', 'enfant_adulte'), ('limite', 'enfant_adulte_limite'),
            ('sans_annee', 'enfant_sans_annee'), ('futur', 'enfant_annee_invalide'),
        ]))

    def test_bureau_national(self):
        self.membre('bn_ok', est_bureau_national=True, montant_cotisation=Decimal('5000'))
        self.membre('bn_mauvais_tarif', est_bureau_national=True, montant_cotisation=Decimal('1000'))
        self.membre('tarif_sans_flag', montant_cotisation=Decimal('5000'))
        User.objects.create_user(username='sg', password='x', role='national_lecture', section=self.section, dahira=self.cellule_a)
        r = rapport_controle_qualite(User.objects.all(), annee=2026)
        self.assertEqual(self.types(r, 'bureau_national'), sorted([
            ('bn_mauvais_tarif', 'bn_tarif_incorrect'),
            ('tarif_sans_flag', 'bn_non_identifie'),
            ('sg', 'bn_probable'),
        ]))

    def test_comptes_admin_exclus(self):
        User.objects.create_user(username='boss', password='x', role='admin', is_staff=True)
        r = rapport_controle_qualite(User.objects.all(), annee=2026)
        self.assertEqual(r['total_membres'], 0)

    def test_endpoint_perimetre_et_droits(self):
        self.membre('m1', montant_cotisation=Decimal('500'), annee_naissance=2000)
        admin = User.objects.create_user(username='boss', password='x', role='admin', is_staff=True)
        simple = self.membre('simple', numero_carte='S01DK01005')
        client = APIClient()
        client.force_authenticate(admin)
        resp = client.get('/api/auth/controle-qualite/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['controles']['enfants']['total_anomalies'], 1)
        client.force_authenticate(simple)
        self.assertEqual(client.get('/api/auth/controle-qualite/').status_code, 403)


class CommandeControleQualiteTests(TestCase):
    def test_export_csv(self):
        import csv
        import os
        import tempfile
        from io import StringIO
        from django.core.management import call_command

        User.objects.create_user(username='sans_matricule', password='x', role='membre')
        with tempfile.TemporaryDirectory() as d:
            chemin = os.path.join(d, 'anomalies.csv')
            out = StringIO()
            call_command('controle_qualite_membres', csv=chemin, stdout=out)
            with open(chemin, encoding='utf-8-sig', newline='') as f:
                lignes = list(csv.DictReader(f, delimiter=';'))
        self.assertTrue(any(l['username'] == 'sans_matricule' and l['type'] == 'matricule_manquant' for l in lignes))
        self.assertIn('1 membres contrôlés', out.getvalue())


class FiltreAgeTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        from django.utils import timezone
        cls.annee = timezone.localdate().year
        for username, age in (('bebe', 3), ('ado', 17), ('limite', 18), ('adulte', 40), ('ancien', 80)):
            User.objects.create_user(username=username, password='x', role='membre', annee_naissance=cls.annee - age)
        User.objects.create_user(username='inconnu', password='x', role='membre')
        cls.admin = User.objects.create_user(username='boss', password='x', role='admin', is_staff=True)

    def usernames(self, **params):
        client = APIClient()
        client.force_authenticate(self.admin)
        data = client.get('/api/auth/users/', params).data
        lignes = data['results'] if isinstance(data, dict) else data
        return {u['username'] for u in lignes} - {'boss'}

    def test_age_min(self):
        self.assertEqual(self.usernames(age_min=18), {'limite', 'adulte', 'ancien'})

    def test_age_max(self):
        self.assertEqual(self.usernames(age_max=17), {'bebe', 'ado'})

    def test_tranche(self):
        self.assertEqual(self.usernames(age_min=17, age_max=40), {'ado', 'limite', 'adulte'})

    def test_sans_annee(self):
        self.assertEqual(self.usernames(sans_annee=1), {'inconnu', 'boss'} - {'boss'})

    def test_valeur_invalide_ignoree(self):
        self.assertEqual(len(self.usernames(age_min='abc')), 6)

    def test_export_utilise_le_meme_filtre(self):
        from .rapport_export import get_membres_queryset
        qs = get_membres_queryset({'age_max': '17'})
        self.assertEqual({u.username for u in qs}, {'bebe', 'ado'})


def _cellule_de_reference(cls):
    reg, _ = Regroupement.objects.get_or_create(nom='REG REFERENCES', defaults={'code': 'REG_REFERENCES'})
    cls.section = Section.objects.create(regroupement=reg, nom='SECTION REF DAKAR', code='S01DK')
    ss, _ = SousSection.objects.get_or_create(section=cls.section, sexe='H')
    cls.cf = Dahira.objects.create(sous_section=ss, nom='AHIBAHIL KHADIM CREDIT FONCIER', code='S01DK01', est_pilote=True)
    cls.sans_code = Dahira.objects.create(sous_section=ss, nom='YEUMBEUL', est_pilote=True)


def _membre(cls, username, dahira, prenom='', nom='', **kw):
    return User.objects.create_user(
        username=username, password='x', role='membre', first_name=prenom, last_name=nom,
        section=cls.section, dahira=dahira, **kw,
    )


class ReferencesOfficiellesTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        _cellule_de_reference(cls)

    def test_matricule_doit_commencer_par_le_code_officiel(self):
        _membre(self, 'ok', self.cf, numero_carte='S01DK01001')
        _membre(self, 'mauvaise_cellule', self.cf, numero_carte='S01DK02001')
        _membre(self, 'mauvaise_section', self.sans_code, numero_carte='S02TB01001')
        _membre(self, 'ok_section', self.sans_code, numero_carte='S01DK03001')
        r = rapport_controle_qualite(User.objects.all(), annee=2026)
        t = sorted((a['username'], a['type']) for a in r['controles']['matricule']['anomalies'])
        self.assertEqual(t, [('mauvaise_cellule', 'matricule_hors_reference'), ('mauvaise_section', 'matricule_hors_reference')])

    def test_etat_des_references(self):
        _membre(self, 'a', self.cf)
        _membre(self, 'b', self.sans_code)
        ref = rapport_controle_qualite(User.objects.all(), annee=2026)['references']
        self.assertEqual(ref['cellules_avec_code'], 1)
        self.assertEqual([c['dahira'] for c in ref['cellules_sans_code']], ['YEUMBEUL'])
        self.assertEqual(ref['sections_sans_code_officiel'], [])


class AttributionMatriculesTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        _cellule_de_reference(cls)

    def setUp(self):
        self.premier = _membre(self, 'a', self.cf, 'Abdou Aziz', 'DIOP')
        self.deuxieme = _membre(self, 'b', self.cf, 'Bounama', 'SOW')
        self.fondateur = _membre(self, 'c', self.cf, 'Serigne Lamine Bara', 'MBACKÉ')  # importé en dernier
        self.autre_cellule = _membre(self, 'd', self.sans_code, 'Mory', 'TALLA')

    def lancer(self, **kw):
        from io import StringIO
        from django.core.management import call_command
        out = StringIO()
        call_command('attribuer_matricules', stdout=out, **kw)
        return out.getvalue()

    def cartes(self):
        return {u.username: u.numero_carte for u in User.objects.all()}

    def test_simulation_n_ecrit_rien(self):
        sortie = self.lancer(premier=['S01DK01=Serigne Lamine Bara MBACKE'])
        self.assertIn('SIMULATION', sortie)
        self.assertTrue(all(v == '' for v in self.cartes().values()))

    def test_fondateur_en_001_puis_ordre_d_inscription(self):
        self.lancer(yes=True, premier=['S01DK01=Serigne Lamine Bara MBACKE'])
        c = self.cartes()
        self.assertEqual(c['c'], 'S01DK01001')
        self.assertEqual(c['a'], 'S01DK01002')
        self.assertEqual(c['b'], 'S01DK01003')
        self.assertEqual(c['d'], '')  # cellule sans code officiel : ignorée

    def test_n_ecrase_rien_et_saute_les_rangs_pris(self):
        User.objects.filter(pk=self.premier.pk).update(numero_carte='S01DK01002')
        User.objects.filter(pk=self.deuxieme.pk).update(numero_carte='ANCIENNE-CARTE')
        self.lancer(yes=True, premier=['S01DK01=Serigne Lamine Bara MBACKE'])
        c = self.cartes()
        self.assertEqual((c['a'], c['b']), ('S01DK01002', 'ANCIENNE-CARTE'))
        self.assertEqual(c['c'], 'S01DK01001')

    def test_idempotent(self):
        self.lancer(yes=True, premier=['S01DK01=Serigne Lamine Bara MBACKE'])
        avant = self.cartes()
        self.lancer(yes=True, premier=['S01DK01=Serigne Lamine Bara MBACKE'])
        self.assertEqual(self.cartes(), avant)

    def test_001_deja_pris_ou_nom_introuvable_ou_ambigu(self):
        from .matricules import plan_attribution
        User.objects.filter(pk=self.premier.pk).update(numero_carte='S01DK01001')
        membres = list(User.objects.filter(dahira=self.cf))
        with self.assertRaisesRegex(ValueError, 'déjà attribué'):
            plan_attribution('S01DK01', membres, premier='Serigne Lamine Bara MBACKE')
        with self.assertRaisesRegex(ValueError, 'introuvable'):
            plan_attribution('S01DK01', membres, premier='Personne Inconnue')
        _membre(self, 'doublon', self.cf, 'Bounama', 'SOW')
        membres = list(User.objects.filter(dahira=self.cf))
        with self.assertRaisesRegex(ValueError, 'correspond à 2 membres'):
            plan_attribution('S01DK01', membres, premier='Bounama SOW')

    def test_premier_sur_cellule_sans_code_refuse(self):
        from django.core.management.base import CommandError
        with self.assertRaises(CommandError):
            self.lancer(premier=['S99XX01=Quelqu un'])


class MigrationReferencesTests(TestCase):
    def test_corrections_conditionnelles(self):
        from importlib import import_module
        from django.apps import apps
        mig = import_module('apps.organisation.migrations.0007_dahira_code_references_officielles')
        # Sur base vierge la migration a déjà converti les sections de départ (ex. Gambie) : on repart de zéro.
        Section.objects.filter(code__in=['S21VG', 'S22BJ']).delete()
        reg, _ = Regroupement.objects.get_or_create(nom='REG MIG', defaults={'code': 'REG_MIG'})
        velingara = Section.objects.create(regroupement=reg, nom='21VELINGARA', code='S21VL')
        gambie = Section.objects.create(regroupement=reg, nom='SECTION GAMBIE X', code='SECTION_GAMBIE')
        dakar = Section.objects.create(regroupement=reg, nom='01SECTION DAKAR X', code='S01DK')
        ss_h, _ = SousSection.objects.get_or_create(section=dakar, sexe='H')
        ss_f, _ = SousSection.objects.get_or_create(section=dakar, sexe='F')
        cf = Dahira.objects.create(sous_section=ss_h, nom='AHIBAHIL KHADIM CREDIT FONCIER')
        autre = Dahira.objects.create(sous_section=ss_h, nom='TAIF')
        mig.appliquer_references(apps, None)
        for o in (velingara, gambie, cf, autre):
            o.refresh_from_db()
        self.assertEqual((velingara.code, gambie.code), ('S21VG', 'S22BJ'))
        self.assertEqual((cf.code, autre.code), ('S01DK01', ''))
        # Rejouer ne change rien, et un nom présent en Hommes ET Femmes n'est jamais deviné.
        mig.appliquer_references(apps, None)
        Dahira.objects.filter(pk=cf.pk).update(code='')
        Dahira.objects.create(sous_section=ss_f, nom='AHIBAHIL KHADIM CREDIT FONCIER')
        mig.appliquer_references(apps, None)
        cf.refresh_from_db()
        self.assertEqual(cf.code, '')
