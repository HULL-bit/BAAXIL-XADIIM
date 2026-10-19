from django.db import migrations


def creer_sous_sections_manquantes(apps, schema_editor):
    """Les sections créées après le jeu de départ n'ont pas de sous-sections Hommes/Femmes,
    ce qui empêchait d'y ajouter des dahiras. Idempotent : ne touche pas l'existant."""
    Section = apps.get_model('organisation', 'Section')
    SousSection = apps.get_model('organisation', 'SousSection')
    for section in Section.objects.all():
        for sexe in ('H', 'F'):
            SousSection.objects.get_or_create(section=section, sexe=sexe)


class Migration(migrations.Migration):

    dependencies = [
        ('organisation', '0007_dahira_code_references_officielles'),
    ]

    operations = [
        migrations.RunPython(creer_sous_sections_manquantes, migrations.RunPython.noop),
    ]
