from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from .models import Dahira, Regroupement, Section, SousSection

User = get_user_model()


class AdminOrganisationApiTests(TestCase):
    """Les appels exacts que fait le formulaire « Administration de l'organisation »."""

    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_user(username='boss', password='x', role='admin', is_staff=True)
        cls.simple = User.objects.create_user(username='simple', password='x', role='membre')

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def creer_section(self, nom='SECTION TEST', code='S50TS'):
        reg = Regroupement.objects.create(nom=f'REG {nom}', code=f'REG_{code}')
        r = self.client.post('/api/organisation/sections/', {'nom': nom, 'code': code, 'ville': '', 'pays': 'Sénégal', 'regroupement': reg.id}, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        return Section.objects.get(pk=r.data['id'])

    def test_nouvelle_section_a_ses_sous_sections_hommes_et_femmes(self):
        section = self.creer_section()
        self.assertEqual(set(section.sous_sections.values_list('sexe', flat=True)), {'H', 'F'})

    def test_ajout_dahira_dans_une_section_neuve_hommes_et_femmes(self):
        section = self.creer_section()
        for sexe in ('H', 'F'):
            ss = section.sous_sections.get(sexe=sexe)
            r = self.client.post('/api/organisation/dahiras/', {'nom': f'Dahira {sexe}', 'adresse': '', 'ville': '', 'sous_section': ss.id, 'est_pilote': False}, format='json')
            self.assertEqual(r.status_code, 201, r.data)

    def test_plusieurs_dahiras_sans_code_ne_se_bloquent_pas(self):
        ss = self.creer_section().sous_sections.get(sexe='H')
        for nom in ('A', 'B', 'C'):
            r = self.client.post('/api/organisation/dahiras/', {'nom': nom, 'sous_section': ss.id}, format='json')
            self.assertEqual(r.status_code, 201, r.data)

    def test_code_cellule_valide_unique_et_coherent_avec_la_section(self):
        section = self.creer_section(code='S50TS')
        ss = section.sous_sections.get(sexe='H')
        ok = self.client.post('/api/organisation/dahiras/', {'nom': 'A', 'sous_section': ss.id, 'code': 's50ts01'}, format='json')
        self.assertEqual(ok.status_code, 201, ok.data)
        self.assertEqual(ok.data['code'], 'S50TS01')  # mis en majuscules
        doublon = self.client.post('/api/organisation/dahiras/', {'nom': 'B', 'sous_section': ss.id, 'code': 'S50TS01'}, format='json')
        self.assertEqual(doublon.status_code, 400)
        self.assertIn('code', doublon.data)
        minuscules = self.client.post('/api/organisation/dahiras/', {'nom': 'B2', 'sous_section': ss.id, 'code': 's50ts01'}, format='json')
        self.assertEqual(minuscules.status_code, 400)
        self.assertIn('déjà utilisé par la cellule « A »', str(minuscules.data['code']))
        format_ko = self.client.post('/api/organisation/dahiras/', {'nom': 'C', 'sous_section': ss.id, 'code': 'CELLULE1'}, format='json')
        self.assertEqual(format_ko.status_code, 400)
        autre_section = self.client.post('/api/organisation/dahiras/', {'nom': 'D', 'sous_section': ss.id, 'code': 'S01DK01'}, format='json')
        self.assertEqual(autre_section.status_code, 400)
        self.assertIn('S50TS', str(autre_section.data['code']))

    def test_modifier_un_dahira_garde_son_code(self):
        ss = self.creer_section().sous_sections.get(sexe='H')
        d = self.client.post('/api/organisation/dahiras/', {'nom': 'A', 'sous_section': ss.id, 'code': 'S50TS01'}, format='json').data
        r = self.client.patch(f"/api/organisation/dahiras/{d['id']}/", {'nom': 'A bis', 'code': 'S50TS01'}, format='json')
        self.assertEqual(r.status_code, 200, r.data)

    def test_section_code_en_double_renvoie_une_erreur_lisible(self):
        self.creer_section(nom='UNE', code='S50TS')
        reg = Regroupement.objects.first()
        r = self.client.post('/api/organisation/sections/', {'nom': 'DEUX', 'code': 'S50TS', 'regroupement': reg.id}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('code', r.data)

    def test_suppression_refusee_tant_que_des_membres_ou_dahiras_sont_rattaches(self):
        section = self.creer_section()
        ss = section.sous_sections.get(sexe='H')
        dahira = Dahira.objects.create(sous_section=ss, nom='A')
        r = self.client.delete(f'/api/organisation/sections/{section.id}/')
        self.assertEqual(r.status_code, 400)
        self.assertIn('dahiras', str(r.data))
        User.objects.create_user(username='m', password='x', role='membre', section=section, dahira=dahira)
        r = self.client.delete(f'/api/organisation/dahiras/{dahira.id}/')
        self.assertEqual(r.status_code, 400)
        self.assertIn('1 membre', str(r.data))
        self.assertTrue(Dahira.objects.filter(pk=dahira.pk).exists())
        self.assertTrue(User.objects.get(username='m').dahira_id)  # rien n'a été détaché

    def test_suppression_possible_quand_vide(self):
        section = self.creer_section()
        self.assertEqual(self.client.delete(f'/api/organisation/sections/{section.id}/').status_code, 204)
        self.assertFalse(SousSection.objects.filter(section_id=section.id).exists())

    def test_ecriture_reservee_au_super_admin(self):
        client = APIClient()
        client.force_authenticate(self.simple)
        r = client.post('/api/organisation/regroupements/', {'nom': 'X', 'code': 'X'}, format='json')
        self.assertEqual(r.status_code, 403)


class MigrationSousSectionsTests(TestCase):
    def test_cree_les_sous_sections_manquantes_sans_toucher_l_existant(self):
        from importlib import import_module
        from django.apps import apps
        mig = import_module('apps.organisation.migrations.0008_sous_sections_manquantes')
        reg = Regroupement.objects.create(nom='REG M', code='REG_M')
        section = Section.objects.create(regroupement=reg, nom='ANCIENNE', code='S60AN')
        SousSection.objects.filter(section=section).delete()           # état de production
        existante = SousSection.objects.create(section=section, sexe='H')
        mig.creer_sous_sections_manquantes(apps, None)
        mig.creer_sous_sections_manquantes(apps, None)                # idempotent
        self.assertEqual(section.sous_sections.count(), 2)
        self.assertTrue(section.sous_sections.filter(pk=existante.pk).exists())


class ListesCompletesEtDoublonsTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_user(username='boss', password='x', role='admin', is_staff=True)

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def test_les_listes_de_structure_ne_sont_pas_tronquees_a_20(self):
        reg = Regroupement.objects.create(nom='REG LISTE', code='REG_LISTE')
        for i in range(30):
            Section.objects.create(regroupement=reg, nom=f'SECTION {i:02d}', code=f'S{i:02d}ZZ')
        for url, minimum in (('sections', 30), ('sous-sections', 60), ('regroupements', 1)):
            data = self.client.get(f'/api/organisation/{url}/').data
            self.assertIsInstance(data, list, url)  # tableau complet, plus {count, results}
            self.assertGreaterEqual(len(data), minimum, url)

    def test_section_sans_code_recoit_un_code_unique(self):
        reg = Regroupement.objects.create(nom='REG AUTO', code='REG_AUTO')
        codes = set()
        for nom in ('Mékhé Touba', 'MEKHE-TOUBA'):  # même code de base -> suffixe
            r = self.client.post('/api/organisation/sections/', {'nom': nom, 'code': '', 'regroupement': reg.id}, format='json')
            self.assertEqual(r.status_code, 201, r.data)
            codes.add(r.data['code'])
        self.assertEqual(codes, {'MEKHE_TOUBA', 'MEKHE_TOUBA_2'})

    def test_section_homonyme_refusee_avec_message_clair(self):
        reg = Regroupement.objects.create(nom='REG DBL', code='REG_DBL')
        ok = self.client.post('/api/organisation/sections/', {'nom': 'SECTION BANJUL', 'code': 'S88BJ', 'regroupement': reg.id}, format='json')
        self.assertEqual(ok.status_code, 201, ok.data)
        meme_nom = self.client.post('/api/organisation/sections/', {'nom': 'section banjul', 'code': 'S99XX', 'regroupement': reg.id}, format='json')
        self.assertEqual(meme_nom.status_code, 400)
        self.assertIn('existe déjà dans ce regroupement', str(meme_nom.data['nom']))
        meme_code = self.client.post('/api/organisation/sections/', {'nom': 'AUTRE', 'code': 's88bj', 'regroupement': reg.id}, format='json')
        self.assertEqual(meme_code.status_code, 400)
        self.assertIn('déjà utilisé par la section « SECTION BANJUL »', str(meme_code.data['code']))

    def test_modifier_une_section_sans_changer_son_code_ni_son_nom(self):
        reg = Regroupement.objects.create(nom='REG MOD', code='REG_MOD')
        s = self.client.post('/api/organisation/sections/', {'nom': 'A', 'code': 'S30AA', 'regroupement': reg.id}, format='json').data
        r = self.client.patch(f"/api/organisation/sections/{s['id']}/", {'nom': 'A', 'code': 'S30AA', 'ville': 'Thiès'}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        r = self.client.patch(f"/api/organisation/sections/{s['id']}/", {'code': ''}, format='json')  # code vidé : on garde l'ancien
        self.assertEqual((r.status_code, r.data['code']), (200, 'S30AA'))

    def test_regroupement_homonyme_refuse(self):
        self.client.post('/api/organisation/regroupements/', {'nom': 'NOUVEAU', 'code': 'NV'}, format='json')
        r = self.client.post('/api/organisation/regroupements/', {'nom': 'nouveau', 'code': ''}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('existe déjà', str(r.data['nom']))
