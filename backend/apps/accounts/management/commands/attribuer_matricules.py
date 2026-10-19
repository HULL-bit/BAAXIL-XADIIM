import csv

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.accounts.matricules import plan_attribution
from apps.organisation.models import Dahira

User = get_user_model()


class Command(BaseCommand):
    help = (
        "Attribue les matricules manquants (champ « numéro de carte ») : code officiel de la "
        "cellule + n° d'ordre à 3 chiffres (S01DK01001, S01DK01002…), dans l'ordre d'inscription. "
        "Simulation par défaut : rien n'est écrit sans --yes. Ne modifie jamais un numéro existant. "
        "Seules les cellules ayant un code officiel (Dahira.code) sont traitées."
    )

    def add_arguments(self, parser):
        parser.add_argument('--yes', action='store_true', help="Écrit réellement les matricules (sinon simulation).")
        parser.add_argument(
            '--premier', action='append', default=[], metavar='CODE=NOM',
            help='Donne le rang 001 à un membre, ex. --premier "S01DK01=Serigne Lamine Bara MBACKE" (répétable).',
        )
        parser.add_argument('--cellule', help="Limite à une cellule (son code, ex. S01DK01).")
        parser.add_argument('--csv', dest='csv_path', help="Exporte le plan d'attribution dans ce fichier CSV.")

    def handle(self, *args, **options):
        premiers = {}
        for item in options['premier']:
            code, sep, nom = item.partition('=')
            if not sep or not code.strip() or not nom.strip():
                raise CommandError(f'--premier attend CODE=NOM (reçu : « {item} »)')
            premiers[code.strip().upper()] = nom.strip()

        cellules = Dahira.objects.exclude(code='').select_related('sous_section__section').order_by('code')
        if options['cellule']:
            cellules = cellules.filter(code=options['cellule'].upper())
        codes_connus = {c.code.upper() for c in cellules}
        inconnus = set(premiers) - codes_connus
        if inconnus:
            raise CommandError(f"--premier : cellule(s) sans code officiel en base ou hors périmètre : {', '.join(sorted(inconnus))}")

        base = User.objects.filter(is_active=True, is_staff=False, is_superuser=False).exclude(role='admin')
        plans = []
        for cellule in cellules:
            membres = list(base.filter(dahira=cellule))
            try:
                plan = plan_attribution(cellule.code, membres, premiers.get(cellule.code.upper()))
            except ValueError as e:
                raise CommandError(f'{cellule.code} ({cellule.nom}) : {e}')
            plans.append((cellule, membres, plan))

        total = 0
        for cellule, membres, plan in plans:
            deja = sum(1 for m in membres if (m.numero_carte or '').strip())
            self.stdout.write(self.style.MIGRATE_HEADING(f'{cellule.code} — {cellule.nom} ({cellule.sous_section.section.nom})'))
            self.stdout.write(f'  {len(membres)} membres, {deja} ont déjà un numéro, {len(plan)} à attribuer')
            for membre, mat in plan[:3]:
                self.stdout.write(f'     {mat}  {membre.first_name} {membre.last_name}')
            if len(plan) > 3:
                self.stdout.write(f'     … jusqu\'à {plan[-1][1]}')
            total += len(plan)

        sans_code = (
            base.filter(dahira__code='').exclude(dahira__isnull=True).values('dahira__nom', 'dahira__sous_section__section__nom')
        )
        ignorees = {}
        for row in sans_code:
            cle = f"{row['dahira__nom']} ({row['dahira__sous_section__section__nom']})"
            ignorees[cle] = ignorees.get(cle, 0) + 1
        if ignorees and not options['cellule']:
            self.stdout.write(self.style.WARNING(
                f"\n{len(ignorees)} cellule(s) ignorée(s) faute de code officiel, {sum(ignorees.values())} membres sans matricule :"
            ))
            for cle, n in sorted(ignorees.items()):
                self.stdout.write(f'  - {cle} : {n} membres')

        if options['csv_path']:
            with open(options['csv_path'], 'w', newline='', encoding='utf-8-sig') as f:
                w = csv.writer(f, delimiter=';')
                w.writerow(['matricule', 'prenom', 'nom', 'cellule', 'section', 'username', 'date_inscription'])
                for cellule, _, plan in plans:
                    for m, mat in plan:
                        w.writerow([mat, m.first_name, m.last_name, cellule.nom, cellule.sous_section.section.nom, m.username, m.date_inscription.date()])
            self.stdout.write(f"Plan exporté dans {options['csv_path']}")

        if not options['yes']:
            self.stdout.write(self.style.WARNING(f"\nSIMULATION : {total} matricules seraient attribués, rien n'a été écrit. Relancez avec --yes pour écrire."))
            return

        ecrits = 0
        with transaction.atomic():
            for _, _, plan in plans:
                for membre, mat in plan:
                    # numero_carte='' : ne jamais écraser un numéro saisi entre-temps.
                    ecrits += User.objects.filter(pk=membre.pk, numero_carte='').update(numero_carte=mat)
        self.stdout.write(self.style.SUCCESS(f'{ecrits} matricules attribués.'))
