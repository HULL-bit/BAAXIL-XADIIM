from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('informations', '0002_news_models'),
    ]

    operations = [
        migrations.AlterField(
            model_name='news',
            name='titre',
            field=models.CharField(max_length=200, blank=True),
        ),
        migrations.AlterField(
            model_name='news',
            name='contenu',
            field=models.TextField(blank=True),
        ),
    ]

