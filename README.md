# BAAXIL-XADIIM — Plateforme Ahibahil Khadim

Plateforme web de gestion pour la Ahibahil Khadim : interfaces par rôle (Administrateur, Membre, Jewrin), modules Informations, Finance, Culturelle (Kamil), Communication, Sociale, Conservatoire, Scientifique, Organisation.

## Charte graphique

- **Vert primaire** : #2D5F3F (croissant, actions)
- **Or / Doré** : #C9A961 (bordures, accents)
- **Beige** : #F4EAD5 (fonds)
- **Noir** : #1A1A1A (textes)
- Logo : présent dans le header

## Prérequis

- Python 3.10+
- Node.js 18+
- (Optionnel) PostgreSQL pour la production

## Installation

### Backend (Django)

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py create_admin     # crée un compte admin de test (voir ci‑dessous)
python manage.py runserver
```

Le backend est disponible sur http://127.0.0.1:8000

### Compte administrateur pour les tests

Après avoir exécuté `python manage.py create_admin` :

- **Identifiant** : `admin`
- **Mot de passe** : `admin123`

Connectez-vous sur la page de connexion du frontend avec ces identifiants pour accéder au tableau de bord administrateur.

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Le frontend est disponible sur http://localhost:5173 (proxy API vers le backend).

## Rôles

- **Administrateur** : gestion complète (membres, finance, événements, Kamil, etc.)
- **Membre** : profil, cotisations, Kamil, événements, messagerie
- **Jewrin** : validations Kamil, activités religieuses, enseignements

## Structure

- `backend/` : Django (apps accounts, informations, finance, culturelle, communication, sociale, conservatoire, scientifique, organisation)
- `frontend/` : React (Vite, MUI), Layout (Header avec logo, Sidebar par rôle, Footer), dashboards et pages par module

## Médias et persistance après redéploiement

Sur un hébergement type Render, le disque est éphémère : les fichiers uploadés (PDF de la bibliothèque, documents, etc.) peuvent être perdus à chaque redéploiement. Pour que **les fichiers restent toujours disponibles**, configurez un stockage S3 (ou compatible S3).

### Variables d’environnement (backend)

À définir sur le service backend (ex. Render) :

| Variable | Description |
|----------|-------------|
| `AWS_STORAGE_BUCKET_NAME` | Nom du bucket S3 |
| `AWS_ACCESS_KEY_ID` | Clé d’accès AWS (ou fournisseur S3-compatible) |
| `AWS_SECRET_ACCESS_KEY` | Clé secrète |
| `AWS_S3_REGION_NAME` | (optionnel) Région, défaut `us-east-1` |
| `AWS_S3_MEDIA_LOCATION` | (optionnel) Préfixe dans le bucket, défaut `media` |
| `AWS_S3_CUSTOM_DOMAIN` | (optionnel) Domaine personnalisé / CDN |
| `AWS_S3_ENDPOINT_URL` | (optionnel) Pour un stockage S3-compatible (ex. DigitalOcean Spaces) |

Dès que `AWS_STORAGE_BUCKET_NAME` est défini, les uploads partent dans S3 et restent disponibles après chaque redéploiement.

### Si un livre (ou document) a été perdu avant la mise en place de S3

1. **Supprimer** l’entrée du livre dans l’application (Bibliothèque → supprimer le livre concerné).
2. **Réajouter** le livre avec le même PDF (ou le nouveau fichier) : Bibliothèque → Ajouter un livre → renseigner nom, catégorie, et joindre le PDF.

Les nouveaux fichiers uploadés après configuration S3 seront stockés dans le bucket et ne seront plus perdus aux redéploiements.

## Déploiement (Render)

### Migrations en production

Si vous voyez l’erreur **« column nb_lectures of relation culturelle_kamil does not exist »** (ou une colonne manquante), c’est que les migrations Django n’ont pas été appliquées sur la base PostgreSQL de production.

**À faire :**

1. **Une fois** : exécuter les migrations sur la base de production. Sur Render, vous pouvez utiliser le **Shell** du service backend (Dashboard → votre service → Shell) et lancer :
   ```bash
   cd backend && python manage.py migrate --noinput
   ```
   Ou, si votre répertoire de travail Render est déjà `backend` :
   ```bash
   python manage.py migrate --noinput
   ```

2. **Recommandé** : pour que chaque redéploiement applique les migrations automatiquement, utilisez le script fourni en **Start Command** (depuis la racine du dépôt) :
   ```bash
   cd backend && bash run.sh
   ```
   Ou en une ligne :
   ```bash
   cd backend && python manage.py migrate --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
   ```
   Ainsi, après chaque déploiement, les nouvelles migrations (comme `nb_lectures` sur Kamil) seront appliquées avant le démarrage de l’app.

## Licence

Projet Ahibahil Khadim (BAAXIL-XADIIM).
