from django.db import migrations


def create_default_dahiras(apps, schema_editor):
  SousSection = apps.get_model("organisation", "SousSection")
  Dahira = apps.get_model("organisation", "Dahira")

  for sous in SousSection.objects.select_related("section").all():
    # Ne rien faire si la sous-section a déjà au moins un dahira
    if Dahira.objects.filter(sous_section=sous).exists():
      continue

    section = getattr(sous, "section", None)
    section_nom = getattr(section, "nom", "") if section else ""
    ville = getattr(section, "ville", "") if section else ""

    # Nom générique mais parlant, en attendant une liste complète fournie par l'organisation
    if sous.sexe == "H":
      suffix = "Hommes"
    elif sous.sexe == "F":
      suffix = "Femmes"
    else:
      suffix = ""

    nom_parts = ["Dahira"]
    if section_nom:
      nom_parts.append(section_nom)
    if suffix:
      nom_parts.append(suffix)
    nom = " ".join(nom_parts).strip()

    Dahira.objects.get_or_create(
      sous_section=sous,
      nom=nom,
      defaults={
        "ville": ville or "",
        "adresse": "",
        "actif": True,
      },
    )


class Migration(migrations.Migration):

  dependencies = [
    ("organisation", "0004_seed_ahibahil_structure"),
  ]

  operations = [
    migrations.RunPython(create_default_dahiras, migrations.RunPython.noop),
  ]

