from django.db import migrations


def seed_ahibahil_structure(apps, schema_editor):
    Regroupement = apps.get_model("organisation", "Regroupement")
    Section = apps.get_model("organisation", "Section")
    SousSection = apps.get_model("organisation", "SousSection")
    Dahira = apps.get_model("organisation", "Dahira")

    # 1) Regroupements de la confédération (DIM)
    regroupements_data = [
        {
            "nom": "CHEIKH SI",
            "code": "CHEIKH_SI",
            "description": "Regroupement CHEIKH SI de la confédération Ahibahil Khadim.",
        },
        {
            "nom": "SECTION YI",
            "code": "SECTION_YI",
            "description": "Regroupement des sections géographiques (Dakar, Touba, Diourbel, etc.).",
        },
        {
            "nom": "DIAMAHATOU MOURIDINA SADIKHINA",
            "code": "DIAMAHATOU_MOURIDINA_SADIKHINA",
            "description": "Regroupement Diamahatou Mouridina Sadikhina.",
        },
        {
            "nom": "DIASPORA",
            "code": "DIASPORA",
            "description": "Regroupement Diaspora (Europe, Amérique, etc.).",
        },
        {
            "nom": "ANSAROUDIIN",
            "code": "ANSAROUDIIN",
            "description": "Regroupement Ansaroudiin.",
        },
    ]

    regroupements_by_code = {}
    for item in regroupements_data:
        regroupement, _created = Regroupement.objects.get_or_create(
            code=item["code"],
            defaults={
                "nom": item["nom"],
                "description": item.get("description", ""),
            },
        )
        regroupements_by_code[item["code"]] = regroupement

    # 2) Sections du regroupement "SECTION YI"
    reg_sections = regroupements_by_code.get("SECTION_YI")
    if not reg_sections:
        return

    sections_data = [
        # nom, code, ville, pays
        ("SECTION DAKAR", "SECTION_DAKAR", "Dakar", "Sénégal"),
        ("SECTION TOUBA", "SECTION_TOUBA", "Touba", "Sénégal"),
        ("SECTION DIOURBEL", "SECTION_DIOURBEL", "Diourbel", "Sénégal"),
        ("SECTION THIES", "SECTION_THIES", "Thiès", "Sénégal"),
        ("SECTION MBOUR", "SECTION_MBOUR", "Mbour", "Sénégal"),
        ("SECTION TAIF", "SECTION_TAIF", "Taïf", "Sénégal"),
        ("SECTION NIAKHEN", "SECTION_NIAKHEN", "Niakhen", "Sénégal"),
        ("SECTION MBACKE", "SECTION_MBACKE", "Mbacké", "Sénégal"),
        ("SECTION LOUGA", "SECTION_LOUGA", "Louga", "Sénégal"),
        ("SECTION GAMBIE", "SECTION_GAMBIE", "", "Gambie"),
    ]

    sections_by_code = {}
    for nom, code, ville, pays in sections_data:
        section, _created = Section.objects.get_or_create(
            code=code,
            defaults={
                "regroupement": reg_sections,
                "nom": nom,
                "ville": ville or nom,
                "pays": pays or "Sénégal",
            },
        )
        # S'assurer que la section est bien rattachée au bon regroupement même si elle existait déjà
        if section.regroupement_id != reg_sections.id:
            section.regroupement = reg_sections
            if not section.ville:
                section.ville = ville or nom
            if not section.pays:
                section.pays = pays or "Sénégal"
            section.save(update_fields=["regroupement", "ville", "pays"])
        sections_by_code[code] = section

    # 3) Sous-sections Homme / Femme pour chaque section
    sous_sections_by_key = {}
    for section in sections_by_code.values():
        for sexe in ("H", "F"):
            ss, _created = SousSection.objects.get_or_create(
                section=section,
                sexe=sexe,
            )
            sous_sections_by_key[(section.code, sexe)] = ss

    # 4) Dahiras d'exemple pour Dakar et Touba
    dahiras_def = {
        "SECTION_DAKAR": [
            "TAIF THIAROYE",
            "ANSAROUDINE KEUR MBAYE FALL",
            "MOUHADJIRINA",
        ],
        "SECTION_TOUBA": [
            "SOULAMOUL DJIANA",
            "MOUDJTAHIDINA",
        ],
    }

    for section_code, dahira_noms in dahiras_def.items():
        section = sections_by_code.get(section_code)
        if not section:
            continue
        # On rattache les dahiras par défaut à la sous-section "Hommes"
        ss_h = sous_sections_by_key.get((section_code, "H"))
        if not ss_h:
            continue
        for nom in dahira_noms:
            Dahira.objects.get_or_create(
                sous_section=ss_h,
                nom=nom,
                defaults={
                    "ville": section.ville or "",
                    "adresse": "",
                    "actif": True,
                },
            )


class Migration(migrations.Migration):

    dependencies = [
        ("organisation", "0003_famille_regroupement_section_soussection_and_more"),
    ]

    operations = [
        migrations.RunPython(seed_ahibahil_structure, migrations.RunPython.noop),
    ]

