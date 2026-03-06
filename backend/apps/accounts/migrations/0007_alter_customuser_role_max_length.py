# Migration pour augmenter max_length du champ role à 32 caractères
# Cette migration est nécessaire car la migration 0006 n'a peut-être pas été appliquée en production

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0006_alter_customuser_role'),
    ]

    operations = [
        migrations.AlterField(
            model_name='customuser',
            name='role',
            field=models.CharField(
                choices=[
                    ('admin', 'Administrateur'),
                    ('membre', 'Membre'),
                    ('jewrin', 'Jewrin'),
                    ('jewrine_conservatoire', 'Jewrin Conservatoire'),
                    ('jewrine_culturelle', 'Jewrin Culturelle'),
                    ('jewrine_finance', 'Jewrin Finance'),
                    ('jewrine_sociale', 'Jewrin Sociale'),
                    ('jewrine_communication', 'Jewrin Communication'),
                    ('jewrine_organisation', 'Jewrin Organisation'),
                    ('jewrine_scientifique', 'Jewrin Scientifique')
                ],
                default='membre',
                max_length=32
            ),
        ),
    ]
