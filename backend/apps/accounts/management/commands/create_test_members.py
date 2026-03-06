from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = "Crée 10 membres de test sénégalais autour de Diourbel / Touba / Mbacké"

    def handle(self, *args, **options):
        membres = [
            ("membre1", "Moussa", "Diop"),
            ("membre2", "Awa", "Ndiaye"),
            ("membre3", "Serigne", "Fall"),
            ("membre4", "Mame", "Faye"),
            ("membre5", "Cheikh", "Mbaye"),
            ("membre6", "Fatou", "Sarr"),
            ("membre7", "Ibrahima", "Ba"),
            ("membre8", "Astou", "Diouf"),
            ("membre9", "Ousmane", "Sow"),
            ("membre10", "Khady", "Gueye"),
        ]

        created = 0
        for username, first_name, last_name in membres:
            if User.objects.filter(username=username).exists():
                self.stdout.write(self.style.WARNING(f'Le membre "{username}" existe déjà, on le saute.'))
                continue
            user = User.objects.create_user(
                username=username,
                email=f"{username}@test.sn",
                password="test1234",
                first_name=first_name,
                last_name=last_name,
                role="membre",
                telephone="77 000 00 00",
                adresse="Environs Diourbel / Touba / Mbacké",
                sexe="M" if username not in ("membre2", "membre4", "membre6", "membre8", "membre10") else "F",
                profession="Membre test",
            )
            user.is_active = True
            user.est_actif = True
            user.save()
            created += 1
            self.stdout.write(self.style.SUCCESS(f'Membre créé : {username} / mot de passe "test1234"'))

        if created == 0:
            self.stdout.write(self.style.WARNING("Aucun nouveau membre de test créé."))
        else:
            self.stdout.write(self.style.SUCCESS(f"{created} membres de test créés."))

