from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Crée un compte administrateur pour les tests (admin / admin123)'

    def handle(self, *args, **options):
        username = 'admin'
        email = 'admin@daara.local'
        password = 'admin123'
        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.WARNING(f'Le compte "{username}" existe déjà.'))
            return
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name='Admin',
            last_name='Daara',
            role='admin',
        )
        user.is_staff = True
        user.is_superuser = True
        user.save()
        self.stdout.write(self.style.SUCCESS(
            f'Compte admin créé : identifiant "{username}", mot de passe "{password}"'
        ))
