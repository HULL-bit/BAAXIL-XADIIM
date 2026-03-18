import os
from pathlib import Path
from datetime import timedelta
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

# Charge des variables depuis backend/.env si présent (non committé)
try:
    from dotenv import load_dotenv  # type: ignore

    load_dotenv(BASE_DIR / ".env")
except Exception:
    pass

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-dev-key-change-in-production')

DEBUG = os.environ.get('DEBUG', 'True').lower() == 'true'

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '*']

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    'apps.accounts',
    'apps.informations',
    'apps.finance',
    'apps.culturelle',
    'apps.communication',
    'apps.sociale',
    'apps.conservatoire',
    'apps.scientifique',
    'apps.organisation',
    'apps.bibliotheque',
]

AUTH_USER_MODEL = 'accounts.CustomUser'

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'django.middleware.locale.LocaleMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

DATABASE_URL = os.environ.get('DATABASE_URL')

if not DATABASE_URL:
    raise ImproperlyConfigured('DATABASE_URL est requis.')

import urllib.parse as urlparse

urlparse.uses_netloc.append('postgres')
url = urlparse.urlparse(DATABASE_URL)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': url.path[1:],
        'USER': url.username,
        'PASSWORD': url.password,
        'HOST': url.hostname,
        'PORT': url.port or 5432,
        'OPTIONS': {'sslmode': 'require'},
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'fr-fr' 
TIME_ZONE = 'Africa/Dakar'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Médias (uploads)
# Sur Render, le filesystem est éphémère sauf si vous montez un Disk.
# Configurez MEDIA_ROOT_PATH=/var/data/media (ou autre mount path) pour persister.
MEDIA_URL = os.environ.get('MEDIA_URL', 'media/')
MEDIA_ROOT = Path(os.environ.get('MEDIA_ROOT_PATH', BASE_DIR / 'media'))

# Stockage des médias : S3 (persistant après redéploiement) si configuré, sinon disque local
USE_S3_MEDIA = bool(os.environ.get('AWS_STORAGE_BUCKET_NAME'))

if USE_S3_MEDIA:
    # Les fichiers restent disponibles après redéploiement (Render, etc.)
    STORAGES = {
        'default': {
            'BACKEND': 'storages.backends.s3boto3.S3Boto3Storage',
            'OPTIONS': {
                'bucket_name': os.environ.get('AWS_STORAGE_BUCKET_NAME'),
                'access_key': os.environ.get('AWS_ACCESS_KEY_ID'),
                'secret_key': os.environ.get('AWS_SECRET_ACCESS_KEY'),
                'region_name': os.environ.get('AWS_S3_REGION_NAME', 'us-east-1'),
                'custom_domain': os.environ.get('AWS_S3_CUSTOM_DOMAIN') or None,
                'endpoint_url': os.environ.get('AWS_S3_ENDPOINT_URL') or None,
                'location': os.environ.get('AWS_S3_MEDIA_LOCATION', 'media'),
                'file_overwrite': False,
                'querystring_auth': os.environ.get('AWS_QUERYSTRING_AUTH', 'true').lower() == 'true',
            },
        },
        'staticfiles': {
            'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage',
        },
    }
    # URL des médias : bucket ou CDN
    if os.environ.get('AWS_S3_CUSTOM_DOMAIN'):
        MEDIA_URL = f"https://{os.environ['AWS_S3_CUSTOM_DOMAIN']}/{os.environ.get('AWS_S3_MEDIA_LOCATION', 'media')}/"
    else:
        MEDIA_URL = f"https://{os.environ.get('AWS_STORAGE_BUCKET_NAME')}.s3.{os.environ.get('AWS_S3_REGION_NAME', 'us-east-1')}.amazonaws.com/{os.environ.get('AWS_S3_MEDIA_LOCATION', 'media')}/"
else:
    # Pas de STORAGES : Django utilise le stockage fichier par défaut (MEDIA_ROOT)
    # Créer le répertoire des médias en local pour que les PDF soient sauvegardés
    MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
    (MEDIA_ROOT / 'bibliotheque' / 'livres').mkdir(parents=True, exist_ok=True)
    (MEDIA_ROOT / 'bibliotheque' / 'livres' / 'alquran').mkdir(parents=True, exist_ok=True)
    (MEDIA_ROOT / 'bibliotheque' / 'livres' / 'qassida').mkdir(parents=True, exist_ok=True)

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Limite d'upload pour les PDF de la bibliothèque (10 Mo)
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024

# CORS
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
    CORS_ALLOWED_ORIGINS = []
else:
    CORS_ALLOW_ALL_ORIGINS = False
    cors_allowed = os.environ.get("CORS_ALLOWED_ORIGINS", "")
    CORS_ALLOWED_ORIGINS = [o.strip() for o in cors_allowed.split(",") if o.strip()]

# REST Framework ukgkgk
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_FILTER_BACKENDS': ['django_filters.rest_framework.DjangoFilterBackend'],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

# JWT
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=24),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}
