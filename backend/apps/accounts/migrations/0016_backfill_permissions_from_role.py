from django.db import migrations


def backfill(apps, schema_editor):
    """
    Traduit le rôle existant de chaque compte vers les nouveaux champs de droits
    individuels, pour préserver exactement le comportement actuel — ces champs
    deviennent ensuite la source de vérité (ajustables par personne).
    """
    from apps.accounts.permissions import ROLE_PRESETS

    CustomUser = apps.get_model('accounts', 'CustomUser')
    # ROLE_PRESETS reflète le code actuel : il peut référencer des droits créés par des
    # migrations POSTÉRIEURES (ex. logs_lecture, 0017). Sur une base vierge (tests, nouvel
    # environnement) ces champs n'existent pas encore à ce stade, d'où le filtre.
    champs_existants = {f.name for f in CustomUser._meta.get_fields()}
    for role, preset in ROLE_PRESETS.items():
        CustomUser.objects.filter(role=role).update(
            **{k: v for k, v in preset.items() if k in champs_existants}
        )


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0015_customuser_finance_ajout_customuser_finance_lecture_and_more'),
    ]

    operations = [
        migrations.RunPython(backfill, noop),
    ]
