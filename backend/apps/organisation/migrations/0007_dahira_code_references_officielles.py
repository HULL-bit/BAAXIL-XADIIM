from django.db import migrations, models

# Références officielles communiquées par le Bureau National (octobre 2026).
# Chaque correction est conditionnelle : on ne touche une ligne que si elle porte
# exactement l'ancienne valeur attendue, et jamais si le nouveau code est déjà pris.
CODES_SECTION = (
    ('S21VL', 'S21VG'),            # SECTION VELINGARA
    ('SECTION_GAMBIE', 'S22BJ'),   # SECTION GAMBIE / BANJUL
)
CODES_CELLULE = (
    # (code section, nom de la cellule, code cellule)
    ('S01DK', 'AHIBAHIL KHADIM CREDIT FONCIER', 'S01DK01'),
)


def appliquer_references(apps, schema_editor):
    Section = apps.get_model('organisation', 'Section')
    Dahira = apps.get_model('organisation', 'Dahira')
    for ancien, nouveau in CODES_SECTION:
        if Section.objects.filter(code=nouveau).exists():
            continue
        Section.objects.filter(code=ancien).update(code=nouveau)
    for code_section, nom, code in CODES_CELLULE:
        if Dahira.objects.filter(code=code).exists():
            continue
        candidates = Dahira.objects.filter(
            nom__iexact=nom, sous_section__section__code=code_section, code='',
        )
        if candidates.count() == 1:  # ambigu (ex. cellule Hommes + Femmes) : on ne devine pas
            candidates.update(code=code)


class Migration(migrations.Migration):

    dependencies = [
        ('organisation', '0006_dahira_est_pilote'),
    ]

    operations = [
        migrations.AddField(
            model_name='dahira',
            name='code',
            field=models.CharField(
                blank=True, db_index=True, max_length=12,
                help_text="Code officiel de la cellule (ex. S01DK01) : code de la section + n° de cellule. Préfixe des matricules de ses membres (ex. S01DK01001).",
            ),
        ),
        migrations.AddConstraint(
            model_name='dahira',
            constraint=models.UniqueConstraint(
                condition=models.Q(('code', ''), _negated=True), fields=('code',),
                name='dahira_code_unique_si_renseigne',
            ),
        ),
        migrations.RunPython(appliquer_references, migrations.RunPython.noop),
    ]
