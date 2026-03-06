# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('conservatoire', '0006_khassida_repetee_rapport'),
    ]

    operations = [
        migrations.AlterField(
            model_name='documentnumerique',
            name='description',
            field=models.TextField(blank=True),
        ),
        migrations.AlterField(
            model_name='documentnumerique',
            name='type_document',
            field=models.CharField(blank=True, choices=[('livre', 'Livre'), ('article', 'Article'), ('these', 'Thèse'), ('memoire', 'Mémoire'), ('rapport', 'Rapport'), ('guide', 'Guide'), ('autre', 'Autre')], default='autre', max_length=50),
        ),
        migrations.AlterField(
            model_name='documentnumerique',
            name='categorie',
            field=models.ForeignKey(blank=True, null=True, on_delete=models.SET_NULL, to='conservatoire.categoriedocument'),
        ),
    ]
