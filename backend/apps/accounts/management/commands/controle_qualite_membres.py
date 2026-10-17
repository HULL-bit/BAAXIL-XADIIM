import csv

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.accounts.controle_qualite import rapport_controle_qualite

User = get_user_model()


class Command(BaseCommand):
    help = (
        "Contrôle qualité des membres (lecture seule) : matricules conformes (S01DK01001), "
        "adultes classés enfant à 500 F, membres du Bureau National au tarif 5 000 F."
    )

    def add_arguments(self, parser):
        parser.add_argument('--csv', dest='csv_path', help="Exporte toutes les anomalies dans ce fichier CSV.")
        parser.add_argument('--detail', type=int, default=10, help="Nombre d'exemples affichés par type d'anomalie (défaut 10).")

    def handle(self, *args, **options):
        rapport = rapport_controle_qualite(User.objects.all())
        self.stdout.write(f"{rapport['total_membres']} membres contrôlés (année de référence {rapport['annee_reference']})\n")

        toutes = []
        for cle, bloc in rapport['controles'].items():
            self.stdout.write(self.style.MIGRATE_HEADING(f"{bloc['libelle']} — {bloc['total_anomalies']} anomalie(s)"))
            par_type = {}
            for a in bloc['anomalies']:
                par_type.setdefault(a['type'], []).append(a)
                toutes.append({'controle': cle, **a})
            for type_, liste in par_type.items():
                self.stdout.write(f"  {rapport['libelles'][type_]} : {len(liste)}")
                for a in liste[:options['detail']]:
                    self.stdout.write(f"     - {a['nom']} ({a['section']} / {a['dahira']}) {a['detail']}".rstrip())
                if len(liste) > options['detail']:
                    self.stdout.write(f"     … {len(liste) - options['detail']} de plus (utiliser --csv pour la liste complète)")
            self.stdout.write('')

        if options['csv_path']:
            champs = ['controle', 'type', 'libelle', 'severite', 'nom', 'username', 'section', 'dahira',
                      'matricule', 'annee_naissance', 'montant_cotisation', 'est_bureau_national', 'detail']
            with open(options['csv_path'], 'w', newline='', encoding='utf-8-sig') as f:
                writer = csv.DictWriter(f, fieldnames=champs, extrasaction='ignore', delimiter=';')
                writer.writeheader()
                writer.writerows(toutes)
            self.stdout.write(self.style.SUCCESS(f"{len(toutes)} anomalies exportées dans {options['csv_path']}"))
