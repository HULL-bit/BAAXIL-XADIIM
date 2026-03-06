#!/usr/bin/env bash
# À utiliser comme Start Command sur Render (ou autre) pour appliquer les migrations à chaque démarrage.
set -e
python manage.py migrate --noinput
exec gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-10000}
