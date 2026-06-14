#!/usr/bin/env python
"""
Script pour créer des comptes de test et des données de test sur PostgreSQL (Render).
Usage: python create_test_data.py
"""
import os
import sys
import random
from datetime import datetime, timedelta
from decimal import Decimal

# Setup Django
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
os.environ['DATABASE_URL'] = os.environ.get(
    'DATABASE_URL',
    'postgresql://bx_s8g4_user:hMdNZ1Gaku16oSX4XqtQ3E1rbSxKpY9h'
    '@dpg-d8n7m03bc2fs73emqheg-a.oregon-postgres.render.com/bx_s8g4'
)
os.environ['DEBUG'] = 'False'

import django
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.organisation.models import Regroupement, Section, SousSection, Dahira, TypeReunion, Reunion
from apps.finance.models import CotisationMensuelle, Transaction, Don, LeveeFonds
from apps.informations.models import Evenement, Publication, Annonce, News, NewsComment, NewsLike
from apps.accounts.models import ProfilComplementaire, PreferencesNotification, Badge, AttributionBadge
from apps.sociale.models import Beneficiaire, ActionSociale
from apps.conservatoire.models import Kourel, SeanceConservatoire
from apps.bibliotheque.models import LivreNumerique
from apps.communication.models import CategorieForum, SujetForum, ReponseForum

User = get_user_model()

def create_users():
    """Create test users with various roles."""
    print("Creating test users...")
    
    users_data = [
        {
            'username': 'admin',
            'email': 'admin@ahibahil.com',
            'password': 'admin123',
            'first_name': 'Admin',
            'last_name': 'Système',
            'role': 'admin',
            'telephone': '+221770000001',
            'categorie': 'professionnel',
        },
        {
            'username': 'modou.diop',
            'email': 'modou.diop@email.com',
            'password': 'test123',
            'first_name': 'Modou',
            'last_name': 'Diop',
            'role': 'jewrin',
            'telephone': '+221771234567',
            'categorie': 'professionnel',
            'sexe': 'M',
            'profession': 'Enseignant',
            'specialite': 'Coordination générale',
            'biographie': 'Jewrin responsable de la coordination.',
        },
        {
            'username': 'fatou.ndiaye',
            'email': 'fatou.ndiaye@email.com',
            'password': 'test123',
            'first_name': 'Fatou',
            'last_name': 'Ndiaye',
            'role': 'jewrine_finance',
            'telephone': '+221772345678',
            'categorie': 'professionnel',
            'sexe': 'F',
            'profession': 'Comptable',
            'groupe_sanguin': 'O+',
        },
        {
            'username': 'cheikh.toure',
            'email': 'cheikh.toure@email.com',
            'password': 'test123',
            'first_name': 'Cheikh',
            'last_name': 'Toure',
            'role': 'jewrine_culturelle',
            'telephone': '+221773456789',
            'categorie': 'professionnel',
            'sexe': 'M',
            'profession': 'Imam',
            'groupe_sanguin': 'A+',
        },
        {
            'username': 'amina.sow',
            'email': 'amina.sow@email.com',
            'password': 'test123',
            'first_name': 'Amina',
            'last_name': 'Sow',
            'role': 'jewrine_sociale',
            'telephone': '+221774567890',
            'categorie': 'professionnel',
            'sexe': 'F',
            'profession': 'Assistante sociale',
            'groupe_sanguin': 'B+',
        },
        {
            'username': 'ibrahim.mbaye',
            'email': 'ibrahim.mbaye@email.com',
            'password': 'test123',
            'first_name': 'Ibrahim',
            'last_name': 'Mbaye',
            'role': 'jewrine_conservatoire',
            'telephone': '+221775678901',
            'categorie': 'professionnel',
            'sexe': 'M',
            'profession': 'Mémorisateur Coran',
        },
        {
            'username': 'khadija.bakhoum',
            'email': 'khadija.bakhoum@email.com',
            'password': 'test123',
            'first_name': 'Khadija',
            'last_name': 'Bakhoum',
            'role': 'jewrine_communication',
            'telephone': '+221776789012',
            'categorie': 'professionnel',
            'sexe': 'F',
            'profession': 'Community Manager',
        },
    ]
    
    # Create members
    member_names = [
        ('Moussa', 'Fall', 'M', '+221781111111', 'O+'),
        ('Aissatou', 'Ba', 'F', '+221782222222', 'A+'),
        ('Abdoulaye', 'Sarr', 'M', '+221783333333', 'B+'),
        ('Mariama', 'Diouf', 'F', '+221784444444', 'AB+'),
        ('Mamadou', 'Gueye', 'M', '+221785555555', 'O-'),
        ('Ndeye', 'Mbaye', 'F', '+221786666666', 'A-'),
        ('Ousmane', 'Niang', 'M', '+221787777777', 'B-'),
        ('Coumba', 'Thiam', 'F', '+221788888888', 'O+'),
        ('Papa', 'Sylla', 'M', '+221789999999', 'A+'),
        ('Ramatoulaye', 'Diallo', 'F', '+221780000000', 'AB-'),
        ('Ibrahima', 'Faye', 'M', '+221771001001', 'O+'),
        ('Astou', 'Moussa', 'F', '+221772002002', 'A+'),
        ('Aliou', 'Seck', 'M', '+221773003003', 'B+'),
        ('Awa', 'Faye', 'F', '+221774004004', 'O+'),
        ('Demba', 'Cisse', 'M', '+221775005005', 'A+'),
    ]
    
    for i, (first, last, sexe, tel, gs) in enumerate(member_names, start=1):
        username = f'{first.lower()}.{last.lower()}'
        email = f'{username}@email.com'
        section = Section.objects.order_by('?').first()
        sous_section = SousSection.objects.filter(section=section).first() if section else None
        dahira = Dahira.objects.filter(sous_section=sous_section).first() if sous_section else None
        
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': email,
                'first_name': first,
                'last_name': last,
                'role': 'membre',
                'telephone': tel,
                'categorie': random.choice(['eleve', 'etudiant', 'professionnel']),
                'sexe': sexe,
                'groupe_sanguin': gs,
                'section': section,
                'sous_section': sous_section,
                'dahira': dahira,
                'regroupement': section.regroupement if section else None,
            }
        )
        if created:
            user.set_password('test123')
            user.save()
            print(f"  ✓ Created member: {first} {last}")
    
    # Create admin and jewrin users
    for udata in users_data:
        username = udata['username']
        section = Section.objects.order_by('?').first()
        sous_section = SousSection.objects.filter(section=section).first() if section else None
        dahira = Dahira.objects.filter(sous_section=sous_section).first() if sous_section else None
        
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': udata['email'],
                'first_name': udata['first_name'],
                'last_name': udata['last_name'],
                'role': udata['role'],
                'telephone': udata.get('telephone', ''),
                'categorie': udata.get('categorie', 'professionnel'),
                'sexe': udata.get('sexe', 'M'),
                'profession': udata.get('profession', ''),
                'groupe_sanguin': udata.get('groupe_sanguin', ''),
                'specialite': udata.get('specialite', ''),
                'biographie': udata.get('biographie', ''),
                'section': section,
                'sous_section': sous_section,
                'dahira': dahira,
                'regroupement': section.regroupement if section else None,
            }
        )
        if created:
            user.set_password(udata['password'])
            user.save()
            print(f"  ✓ Created {udata['role']}: {udata['first_name']} {udata['last_name']}")
        else:
            # Update password if user already exists
            user.set_password(udata['password'])
            user.save()
    
    print(f"  Total users: {User.objects.count()}")


def create_badges():
    """Create test badges."""
    print("\nCreating badges...")
    
    badges_data = [
        ('Première Cotisation', 'A payé sa première cotisation', 'contribution', 10),
        ('Cotisation Régulière', '6 mois de cotisation consécutive', 'contribution', 30),
        ('Cotisation Annuelle', '12 mois de cotisation consécutifs', 'contribution', 50),
        ('Assiduité Parfaite', 'A assisté à 10 réunions consécutives', 'assiduite', 40),
        ('Kamil Complet', 'A terminé la lecture du Kamil complet', 'kamil', 100),
        ('Engagement Social', 'A participé à 5 actions sociales', 'social', 50),
        ('Membre Fidèle', 'Membre actif pendant 1 an', 'anciennete', 75),
        ('Super Membre', 'Membre actif pendant 3 ans', 'anciennete', 150),
        ('Donateur Généreux', 'A fait un don de plus de 10 000 FCFA', 'special', 60),
        ('Bénévole Actif', 'A participé à 10 événements', 'special', 80),
    ]
    
    for nom, desc, cat, points in badges_data:
        Badge.objects.get_or_create(
            nom=nom,
            defaults={
                'description': desc,
                'categorie': cat,
                'critere': desc,
                'points': points,
            }
        )
        print(f"  ✓ Badge: {nom}")


def create_finances():
    """Create test financial data."""
    print("\nCreating financial data...")
    
    admin_user = User.objects.filter(role='admin').first()
    members = list(User.objects.filter(role='membre'))
    if not members:
        print("  No members found, skipping finances")
        return
    
    # Current month cotisations
    now = timezone.now()
    current_month = now.month
    current_year = now.year
    
    for member in members[:10]:
        montant = random.choice([1000, 2000, 5000])
        CotisationMensuelle.objects.get_or_create(
            membre=member,
            mois=current_month,
            annee=current_year,
            type_cotisation='mensualite',
            defaults={
                'montant': montant,
                'date_echeance': now.date() + timedelta(days=5),
                'statut': random.choice(['payee', 'payee', 'en_attente', 'en_attente']),
                'mode_paiement': 'wave',
                'reference_wave': f'WAVE-{random.randint(10000, 99999)}',
            }
        )
    
    print(f"  ✓ Cotisations created: {CotisationMensuelle.objects.count()}")
    
    # Transactions
    for member in members[:8]:
        montant = random.choice([1000, 2000, 5000, 10000])
        cotisation = CotisationMensuelle.objects.filter(membre=member).first()
        Transaction.objects.get_or_create(
            reference_interne=f'TXN-{random.randint(100000, 999999)}',
            defaults={
                'membre': member,
                'type_transaction': 'cotisation',
                'montant': montant,
                'description': 'Paiement cotisation mensuelle',
                'statut': 'validee',
                'reference_wave': f'WAVE-{random.randint(10000, 99999)}',
                'cotisation': cotisation,
            }
        )
    
    print(f"  ✓ Transactions created: {Transaction.objects.count()}")
    
    # Donations
    for member in members[:5]:
        montant = random.choice([5000, 10000, 20000, 50000])
        don = Don.objects.create(
            donateur=member,
            montant=montant,
            message='Don pour soutenir les activités',
            est_anonyme=random.choice([True, False, False, False]),
            reference_wave=f'WAVE-DON-{random.randint(10000, 99999)}',
        )
        print(f"  ✓ Don: {member.get_full_name()} - {montant} FCFA")
    
    # Levée de fonds
    if admin_user:
        LeveeFonds.objects.get_or_create(
            titre='Construction Daara Touba',
            defaults={
                'description': 'Levée de fonds pour la construction du daara de Touba',
                'objectif': 'Collecter des fonds pour les travaux de construction',
                'montant_objectif': 5000000,
                'montant_collecte': 1250000,
                'date_debut': now.date() - timedelta(days=30),
                'date_fin': now.date() + timedelta(days=60),
                'lien_paiement_wave': 'https://paywave.com/ahibahil/daara',
                'statut': 'active',
                'cree_par': admin_user,
            }
        )
        print(f"  ✓ Levée de fonds créée")


def create_evenements():
    """Create test events."""
    print("\nCreating events...")
    
    admin_user = User.objects.filter(role='admin').first() or User.objects.first()
    if not admin_user:
        return
    
    now = timezone.now()
    
    events_data = [
        ('Gamou Annuel 2026', 'Célébration du Gamou annuel', 'ziara', now + timedelta(days=30), now + timedelta(days=32), 'Touba', 500),
        ('Conférence Islamique', 'Conférence sur la foi et la spiritualité', 'conference', now + timedelta(days=15), now + timedelta(days=15), 'Dakar - Salle Iblina', 200),
        ('Formation Coran', 'Formation sur la mémorisation du Coran', 'formation', now + timedelta(days=7), now + timedelta(days=7), 'Daara Ahibahil', 50),
        ('Assemblée Générale', 'Assemblée générale annuelle', 'assemblee', now + timedelta(days=45), now + timedelta(days=45), 'Dakar - Siège', 300),
        ('Rencontre Spirituelle', 'Rencontre spirituelle hebdomadaire', 'rencontre', now + timedelta(days=3), now + timedelta(days=3), 'Daara Ahibahil', 100),
    ]
    
    for titre, desc, type_ev, date_deb, date_fin, lieu, capacite in events_data:
        Evenement.objects.get_or_create(
            titre=titre,
            defaults={
                'description': desc,
                'type_evenement': type_ev,
                'date_debut': date_deb,
                'date_fin': date_fin,
                'lieu': lieu,
                'capacite_max': capacite,
                'cree_par': admin_user,
                'est_publie': True,
            }
        )
        print(f"  ✓ Event: {titre}")
    
    print(f"  Total events: {Evenement.objects.count()}")


def create_news():
    """Create test news and comments."""
    print("\nCreating news...")
    
    admin_user = User.objects.filter(role='admin').first() or User.objects.first()
    members = list(User.objects.filter(role='membre')[:5])
    
    if not admin_user:
        return
    
    news_data = [
        ('Bienvenue sur la plateforme Ahibahil Khadim', 'Nous sommes ravis de vous accueillir sur notre nouvelle plateforme digitale. Cet espace est dédié à la gestion et au partage de nos activités.'),
        ('Prochain Gamou: Inscriptions ouvertes', 'Les inscriptions pour le Gamou annuel sont désormais ouvertes. Contactez vos responsables de dahira pour plus d\'informations.'),
        ('Résultats des cotisations du mois', 'Nous remercions tous les membres qui ont payé leurs cotisations ce mois-ci. Il reste encore des retardataires, merci de régulariser votre situation.'),
        ('Nouveau programme de formation coranique', 'Un nouveau programme de formation coranique est lancé pour les enfants et adultes. Inscriptions au bureau du conservatoire.'),
        ('Action sociale: Distribution de vivres', 'Une action sociale de distribution de vivres sera organisée le mois prochain dans les quartiers défavorisés. Les bénévoles sont bienvenus.'),
    ]
    
    for titre, contenu in news_data:
        news = News.objects.get_or_create(
            titre=titre,
            defaults={
                'contenu': contenu,
                'auteur': admin_user,
                'est_publiee': True,
            }
        )[0]
        print(f"  ✓ News: {titre[:50]}...")
        
        # Add some likes
        for member in random.sample(members, min(3, len(members))):
            NewsLike.objects.get_or_create(news=news, user=member)
        
        # Add some comments
        for member in random.sample(members, min(2, len(members))):
            NewsComment.objects.get_or_create(
                news=news,
                user=member,
                defaults={'commentaire': 'Barakallahu fikoum pour cette belle initiative!'}
            )
    
    print(f"  Total news: {News.objects.count()}")


def create_sociale():
    """Create test social data."""
    print("\nCreating social data...")
    
    jewrine_sociale = User.objects.filter(role='jewrine_sociale').first() or User.objects.first()
    members = list(User.objects.filter(role='membre')[:5])
    
    if not jewrine_sociale:
        return
    
    # Beneficiaires
    beneficiaires_data = [
        ('Famille Diallo', 'Famille dans le besoin - 5 enfants', 'famille', 'Dakar'),
        ('Frère Moussa', 'Personne âgée isolée', 'autre', 'Thiès'),
        ('Soeur Fatou', 'Mère célibataire - 3 enfants', 'veuve', 'Mbour'),
    ]
    
    for nom_complet, situation, cat, lieu in beneficiaires_data:
        Beneficiaire.objects.get_or_create(
            nom_complet=nom_complet,
            defaults={
                'categorie': cat,
                'telephone': f'+22177{random.randint(1000000, 9999999)}',
                'adresse': lieu,
                'situation': situation,
                'nombre_personnes_charge': random.randint(2, 8),
                'besoins': 'Aide alimentaire et financière',
                'est_actif': True,
            }
        )
        print(f"  ✓ Bénéficiaire: {nom_complet}")
    
    # Actions sociales
    now = timezone.now()
    ActionSociale.objects.get_or_create(
        titre='Distribution de vivres Ramadan',
        defaults={
            'description': 'Distribution de colis alimentaires aux familles nécessiteuses',
            'type_action': 'distribution',
            'date_action': now + timedelta(days=10),
            'lieu': 'Dakar',
            'organisateur': jewrine_sociale,
            'nombre_beneficiaires': 50,
            'budget': 500000,
        }
    )
    print(f"  ✓ Action sociale créée")
    
    # Add beneficiaries
    action = ActionSociale.objects.first()
    if action:
        for member in members[:3]:
            action.participants.add(member)


def create_conservatoire():
    """Create test conservatoire data."""
    print("\nCreating conservatoire data...")
    
    jewrine_conservatoire = User.objects.filter(role='jewrine_conservatoire').first() or User.objects.first()
    members = list(User.objects.filter(role='membre')[:10])
    
    if not jewrine_conservatoire:
        return
    
    now = timezone.now()
    
    # Kourels
    kourels_data = [
       
    ]
    
    for nom, desc in kourels_data:
        kourel = Kourel.objects.get_or_create(
            nom=nom,
            defaults={
                'description': desc,
                'maitre_de_coeur': jewrine_conservatoire,
            }
        )[0]
        # Add members
        for member in random.sample(members, min(5, len(members))):
            kourel.membres.add(member)
        print(f"  ✓ Kourel: {nom}")
    
    # Seances
    now = timezone.now()
    for kourel in Kourel.objects.all()[:2]:
        for i in range(2):
            SeanceConservatoire.objects.get_or_create(
                titre=f'Séance {i+1} - {kourel.nom}',
                defaults={
                    'kourel': kourel,
                    'type_seance': 'repetition',
                    'description': f'Répétition {i+1} pour {kourel.nom}',
                    'date_heure': now + timedelta(days=i*7),
                    'heure_fin': '17:00:00',
                    'lieu': 'Daara Ahibahil',
                    'cree_par': jewrine_conservatoire,
                }
            )
    print(f"  ✓ Séances créées")


def create_communication():
    """Create test forum data."""
    print("\nCreating communication data...")
    
    admin_user = User.objects.filter(role='admin').first() or User.objects.first()
    members = list(User.objects.filter(role='membre')[:5])
    
    if not admin_user:
        return
    
    # Categories
    categories_data = [
        ('Discussions Générales', 'Espace de discussion général'),
        ('Questions Religieuses', 'Questions sur la religion'),
        ('Entraide', 'Demandes d\'aide et propositions'),
    ]
    
    categories = []
    for nom, desc in categories_data:
        cat = CategorieForum.objects.get_or_create(
            nom=nom,
            defaults={'description': desc}
        )[0]
        categories.append(cat)
        if admin_user:
            cat.moderateurs.add(admin_user)
        print(f"  ✓ Category: {nom}")
    
    # Sujets
    sujets_data = [
        ('Bienvenue à tous!', 'N\'hésitez pas à vous présenter dans ce fil.', 0),
        ('Comment organiser un Kourel efficace?', 'Partagez vos expériences et conseils.', 1),
        ('Proposition: Journées portes ouvertes', 'Que pensez-vous d\'organiser une journée portes ouvertes?', 2),
    ]
    
    for i, (titre, contenu, cat_idx) in enumerate(sujets_data, start=1):
        sujet = SujetForum.objects.get_or_create(
            titre=titre,
            defaults={
                'contenu': contenu,
                'categorie': categories[cat_idx],
                'auteur': admin_user,
                'est_epingle': i == 1,
                'est_verrouille': False,
            }
        )[0]
        print(f"  ✓ Sujet: {titre}")
        
        # Add responses
        for j, member in enumerate(members[:3], start=1):
            ReponseForum.objects.create(
                sujet=sujet,
                auteur=member,
                contenu=f'Réponse {j} de {member.get_full_name()} sur ce sujet.'
            )


def main():
    print("=" * 60)
    print("  Création des données de test - Ahibahil Khadim")
    print("=" * 60)
    
    create_users()
    create_badges()
    create_finances()
    create_evenements()
    create_news()
    create_sociale()
    create_conservatoire()
    create_communication()
    
    print("\n" + "=" * 60)
    print("  DONNÉES DE TEST CRÉÉES AVEC SUCCÈS")
    print("=" * 60)
    
    # Summary
    print(f"\n  Users: {User.objects.count()}")
    print(f"  Badges: {Badge.objects.count()}")
    print(f"  Cotisations: {CotisationMensuelle.objects.count()}")
    print(f"  Transactions: {Transaction.objects.count()}")
    print(f"  Dons: {Don.objects.count()}")
    print(f"  Levées de fonds: {LeveeFonds.objects.count()}")
    print(f"  Événements: {Evenement.objects.count()}")
    print(f"  News: {News.objects.count()}")
    print(f"  Bénéficiaires: {Beneficiaire.objects.count()}")
    print(f"  Kourels: {Kourel.objects.count()}")
    print(f"  Séances: {SeanceConservatoire.objects.count()}")
    print(f"  Catégories forum: {CategorieForum.objects.count()}")
    print(f"  Sujets forum: {SujetForum.objects.count()}")
    
    print(f"\n  Comptes de test:")
    print(f"    - Admin: admin / admin123")
    print(f"    - Jewrin: modou.diop / test123")
    print(f"    - Finance: fatou.ndiaye / test123")
    print(f"    - Culturelle: cheikh.toure / test123")
    print(f"    - Sociale: amina.sow / test123")
    print(f"    - Conservatoire: ibrahim.mbaye / test123")
    print(f"    - Communication: khadija.bakhoum / test123")
    print(f"    - Members: [firstname].[lastname] / test123")


if __name__ == '__main__':
    main()
