from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0017_customuser_logs_lecture_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="customuser",
            name="est_bureau_national",
            field=models.BooleanField(
                default=False,
                help_text="Le tarif de cotisation du Bureau National (5 000 F/mois) doit s’appliquer à ce membre. Vérifié par le contrôle qualité.",
                verbose_name="Membre du Bureau National",
            ),
        ),
    ]
