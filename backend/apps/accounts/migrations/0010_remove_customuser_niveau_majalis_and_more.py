# Generated manually: remove niveau_quran and niveau_majalis from CustomUser

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0009_customuser_groupe_sanguin_customuser_niveau_majalis_and_more'),
    ]

    operations = [
        migrations.RemoveField(model_name='customuser', name='niveau_majalis'),
        migrations.RemoveField(model_name='customuser', name='niveau_quran'),
    ]
