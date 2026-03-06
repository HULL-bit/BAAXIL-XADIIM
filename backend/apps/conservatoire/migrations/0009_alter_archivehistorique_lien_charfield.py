# Migration: lien_telegramme_du_son en CharField pour accepter tous les formats de lien

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('conservatoire', '0008_repertoire_champs'),
    ]

    operations = [
        migrations.AlterField(
            model_name='archivehistorique',
            name='lien_telegramme_du_son',
            field=models.CharField(blank=True, help_text='Lien Telegram du son', max_length=500),
        ),
    ]
