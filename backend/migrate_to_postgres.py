#!/usr/bin/env python
"""
Script pour migrer les données de SQLite vers PostgreSQL (Render)
Usage: python migrate_to_postgres.py

Étapes:
  1. Dump des données SQLite dans un fichier JSON
  2. Application des migrations sur la nouvelle base PostgreSQL
  3. Chargement des données dans PostgreSQL
"""
import os
import sys
import json
import subprocess

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DUMP_FILE = os.path.join(BASE_DIR, 'sqlite_dump.json')
PG_URL = os.environ.get(
    'DATABASE_URL',
    'postgresql://bx_s8g4_user:hMdNZ1Gaku16oSX4XqtQ3E1rbSxKpY9h'
    '@dpg-d8n7m03bc2fs73emqheg-a.oregon-postgres.render.com/bx_s8g4'
)


def run(cmd, env=None):
    """Run a shell command and return (returncode, stdout, stderr)."""
    result = subprocess.run(cmd, capture_output=True, text=True, env=env, cwd=BASE_DIR)
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
    return result.returncode


def step1_dump_sqlite():
    """Dump data from SQLite (no DATABASE_URL → Django uses db.sqlite3)."""
    print("=" * 60)
    print("ÉTAPE 1 – Dump des données SQLite")
    print("=" * 60)

    env = os.environ.copy()
    env.pop('DATABASE_URL', None)   # force SQLite
    env['DEBUG'] = 'True'
    env.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

    rc = run(
        [sys.executable, 'manage.py', 'dumpdata',
         '--indent', '2',
         '--natural-foreign',
         '--natural-primary',
         '-e', 'contenttypes',
         '-e', 'auth.permission',
         '-e', 'sessions',
         '-e', 'admin',
         '--output', DUMP_FILE],
        env=env,
    )
    if rc != 0:
        print("✗ Erreur lors du dump SQLite")
        return False

    size = os.path.getsize(DUMP_FILE)
    print(f"✓ Dump créé: {DUMP_FILE} ({size} octets)")
    return True


def step2_migrate_postgres():
    """Apply Django migrations on the fresh PostgreSQL database."""
    print("\n" + "=" * 60)
    print("ÉTAPE 2 – Application des migrations sur PostgreSQL")
    print("=" * 60)

    env = os.environ.copy()
    env['DATABASE_URL'] = PG_URL
    env['DEBUG'] = 'False'
    env.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

    rc = run([sys.executable, 'manage.py', 'migrate', '--noinput'], env=env)
    if rc != 0:
        print("✗ Erreur lors des migrations PostgreSQL")
        return False

    print("✓ Migrations appliquées sur PostgreSQL")
    return True


def step3_load_postgres():
    """Load the JSON dump into PostgreSQL."""
    print("\n" + "=" * 60)
    print("ÉTAPE 3 – Chargement des données dans PostgreSQL")
    print("=" * 60)

    env = os.environ.copy()
    env['DATABASE_URL'] = PG_URL
    env['DEBUG'] = 'False'
    env.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

    rc = run([sys.executable, 'manage.py', 'loaddata', DUMP_FILE], env=env)
    if rc != 0:
        print("✗ Erreur lors du chargement des données")
        return False

    print("✓ Données chargées dans PostgreSQL")
    return True


def main():
    print("=== Migration SQLite → PostgreSQL (Render) ===\n")

    if not step1_dump_sqlite():
        sys.exit(1)

    if not step2_migrate_postgres():
        sys.exit(1)

    if not step3_load_postgres():
        sys.exit(1)

    # Cleanup
    if os.path.exists(DUMP_FILE):
        os.remove(DUMP_FILE)
        print(f"\n✓ Fichier temporaire supprimé: {DUMP_FILE}")

    print("\n" + "=" * 60)
    print("=== Migration terminée avec succès ===")
    print("=" * 60)


if __name__ == '__main__':
    main()
