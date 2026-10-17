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
