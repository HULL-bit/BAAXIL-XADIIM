from django.db import migrations


OLD_JEWRINE_ROLES = [
    'jewrin',
    'jewrine_conservatoire',
    'jewrine_culturelle',
    'jewrine_finance',
    'jewrine_sociale',
    'jewrine_communication',
    'jewrine_organisation',
    'jewrine_scientifique',
]


def reclasse_vers_membre(apps, schema_editor):
    """
    Les anciens rôles de test "jewrine_*" (create_test_data.py) n'existent plus dans
    la matrice pilote de l'audit. On les reclasse en 'membre' par sécurité (accès
    minimal) — les comptes qui doivent redevenir admin/cellule sont reconstruits
    manuellement via la nouvelle UI Gestion des membres, avec le bon périmètre.
    """
    CustomUser = apps.get_model('accounts', 'CustomUser')
    CustomUser.objects.filter(role__in=OLD_JEWRINE_ROLES).update(role='membre')


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0012_alter_customuser_role'),
    ]

    operations = [
        migrations.RunPython(reclasse_vers_membre, noop),
    ]
