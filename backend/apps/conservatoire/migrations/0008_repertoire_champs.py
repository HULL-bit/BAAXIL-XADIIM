# Generated manually - Répertoire: titre, événement, texte, date, lien Telegram du son, description optionnel

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('conservatoire', '0007_make_document_fields_optional'),
    ]

    operations = [
        migrations.AddField(
            model_name='archivehistorique',
            name='texte',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='archivehistorique',
            name='lien_telegramme_du_son',
            field=models.URLField(blank=True, help_text='Lien Telegram du son', max_length=500),
        ),
        migrations.AddField(
            model_name='archivehistorique',
            name='evenement',
            field=models.CharField(blank=True, help_text="Nom de l'événement (texte libre)", max_length=200),
        ),
        migrations.AlterField(
            model_name='archivehistorique',
            name='type_archive',
            field=models.CharField(blank=True, choices=[('evenement', 'Événement Historique'), ('personnalite', 'Personnalité'), ('document', 'Document Ancien'), ('photo', 'Photo Ancienne'), ('temoignage', 'Témoignage'), ('autre', 'Autre')], max_length=50, null=True),
        ),
        migrations.AlterField(
            model_name='archivehistorique',
            name='description',
            field=models.TextField(blank=True),
        ),
        migrations.AlterField(
            model_name='archivehistorique',
            name='date_evenement',
            field=models.DateField(blank=True, help_text="Date de l'événement/document", null=True),
        ),
        migrations.AlterField(
            model_name='archivehistorique',
            name='annee',
            field=models.IntegerField(blank=True, null=True),
        ),
    ]
