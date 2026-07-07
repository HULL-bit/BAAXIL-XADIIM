from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db.models import Q

User = get_user_model()


class Command(BaseCommand):
    help = (
        "Supprime tous les comptes utilisateurs sauf les administrateurs "
        "(role='admin' ou is_superuser=True). Utile pour vider les comptes de "
        "test avant un import de vrais membres."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--yes',
            action='store_true',
            help="Exécute réellement la suppression. Sans ce flag, affiche uniquement un aperçu (dry-run).",
        )

    def handle(self, *args, **options):
        keep_qs = User.objects.filter(Q(role='admin') | Q(is_superuser=True))
        delete_qs = User.objects.exclude(Q(role='admin') | Q(is_superuser=True))

        keep_count = keep_qs.count()
        delete_count = delete_qs.count()

        self.stdout.write(f"Comptes conservés (admin/superuser) : {keep_count}")
        for u in keep_qs:
            self.stdout.write(f"  - garder : {u.username} (role={u.role}, superuser={u.is_superuser})")

        self.stdout.write(f"Comptes à supprimer : {delete_count}")

        if not options['yes']:
            self.stdout.write(self.style.WARNING(
                "Dry-run : aucune suppression effectuée. Relancer avec --yes pour supprimer réellement."
            ))
            return

        if delete_count == 0:
            self.stdout.write(self.style.SUCCESS("Rien à supprimer."))
            return

        deleted, _details = delete_qs.delete()
        self.stdout.write(self.style.SUCCESS(f"{delete_count} comptes supprimés (dont objets liés : {deleted})."))
