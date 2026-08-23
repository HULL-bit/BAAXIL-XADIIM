from django.db import migrations


def backfill(apps, schema_editor):
    """
    Traduit le rôle existant de chaque compte vers les nouveaux champs de droits
    individuels, pour préserver exactement le comportement actuel — ces champs
    deviennent ensuite la source de vérité (ajustables par personne).
    """
    from apps.accounts.permissions import ROLE_PRESETS

    CustomUser = apps.get_model('accounts', 'CustomUser')
    for role, preset in ROLE_PRESETS.items():
        CustomUser.objects.filter(role=role).update(**preset)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0015_customuser_finance_ajout_customuser_finance_lecture_and_more'),
    ]

    operations = [
        migrations.RunPython(backfill, noop),
    ]
