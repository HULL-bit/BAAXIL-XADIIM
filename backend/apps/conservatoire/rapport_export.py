"""
Export des rapports de séances de répétition en PDF, Excel ou CSV.
Inclut toutes les séances, présences et statistiques (taux de présence, etc.).
"""
from .models import SeanceConservatoire, PresenceSeance


def _get_queryset(date_debut=None, date_fin=None):
    """Queryset des séances de répétition. Si dates absentes, retourne toutes les séances."""
    qs = SeanceConservatoire.objects.filter(type_seance='repetition')
    if date_debut:
        qs = qs.filter(date_heure__date__gte=date_debut)
    if date_fin:
        qs = qs.filter(date_heure__date__lte=date_fin)
    return qs.select_related('kourel').prefetch_related(
        'presences', 'presences__membre', 'khassidas', 'kourel__membres'
    ).order_by('date_heure')


def _get_stats_par_membre(qs):
    """Retourne [{membre, nom, kourel, nb_seances_attendues, nb_presents, nb_abs_just, nb_abs_non_just, taux_presence}]"""
    from collections import defaultdict
    seance_ids = list(qs.values_list('id', flat=True))
    # Pour chaque séance, récupérer le kourel et ses membres
    membre_seances = defaultdict(set)  # membre_id -> set(seance_ids) attendues
    membre_kourel = {}  # membre_id -> nom_kourel
    for seance in qs.select_related('kourel'):
        kourel = seance.kourel
        if not kourel:
            continue
        for m in kourel.membres.all():
            membre_seances[m.id].add(seance.id)
            if m.id not in membre_kourel:
                membre_kourel[m.id] = (m, kourel.nom)
    # Compter les présences par membre
    presences = PresenceSeance.objects.filter(seance_id__in=seance_ids).select_related('membre')
    membre_presents = defaultdict(int)
    membre_abs_just = defaultdict(int)
    membre_abs_non_just = defaultdict(int)
    for p in presences:
        mid = p.membre_id
        if p.statut == 'present':
            membre_presents[mid] += 1
        elif p.statut == 'absent_justifie':
            membre_abs_just[mid] += 1
        else:
            membre_abs_non_just[mid] += 1
    result = []
    for mid, seance_ids_att in membre_seances.items():
        nb_attendues = len(seance_ids_att)
        nb_pres = membre_presents[mid]
        nb_aj = membre_abs_just[mid]
        nb_anj = membre_abs_non_just[mid]
        taux = round(100 * nb_pres / nb_attendues, 1) if nb_attendues else 0
        m, kourel_nom = membre_kourel.get(mid, (None, ''))
        nom = m.get_full_name() if m else f'Membre #{mid}'
        result.append({
            'membre_id': mid, 'membre': m, 'nom': nom, 'kourel': kourel_nom,
            'nb_seances_attendues': nb_attendues, 'nb_presents': nb_pres,
            'nb_abs_just': nb_aj, 'nb_abs_non_just': nb_anj,
            'taux_presence': taux
        })
    return sorted(result, key=lambda x: (-x['taux_presence'], x['nom']))


def export_rapport_excel(date_debut=None, date_fin=None):
    """Export Excel des séances de répétition + feuille statistiques."""
    try:
        import openpyxl
        from openpyxl.styles import Font, Alignment, Border, Side
        from openpyxl.utils import get_column_letter
    except ImportError:
        return None

    qs = _get_queryset(date_debut, date_fin)

    wb = openpyxl.Workbook()
    # Feuille 1 : Statistiques globales
    ws_stats = wb.active
    ws_stats.title = "Statistiques"

    header_font = Font(bold=True)
    thin = Side(style='thin')
    border = Border(left=thin, right=thin, top=thin, bottom=thin)

    # Calcul des statistiques
    nb_seances = qs.count()
    presences_all = PresenceSeance.objects.filter(seance__in=qs)
    nb_total = presences_all.count()
    nb_presents = presences_all.filter(statut='present').count()
    nb_abs_just = presences_all.filter(statut='absent_justifie').count()
    nb_abs_non_just = presences_all.filter(statut='absent_non_justifie').count()
    taux_presence = round(100 * nb_presents / nb_total, 1) if nb_total else 0

    ws_stats.cell(row=1, column=1, value="Statistiques des séances de répétition").font = Font(bold=True, size=14)
    periode_str = f"{date_debut.strftime('%d/%m/%Y')} — {date_fin.strftime('%d/%m/%Y')}" if date_debut and date_fin else "Toutes les séances créées"
    ws_stats.cell(row=2, column=1, value=f"Période : {periode_str}")
    row_s = 4
    for label, val in [
        ("Nombre total de séances", nb_seances),
        ("Total des marquages présence", nb_total),
        ("Présents", nb_presents),
        ("Absents justifiés", nb_abs_just),
        ("Absents non justifiés", nb_abs_non_just),
        ("Taux de présence (%)", f"{taux_presence}%"),
    ]:
        ws_stats.cell(row=row_s, column=1, value=label).font = header_font
        ws_stats.cell(row=row_s, column=2, value=val).border = border
        row_s += 1

    # Feuille 2 : Taux de présence par membre
    stats_membres = _get_stats_par_membre(qs)
    ws_membres = wb.create_sheet("Taux par membre", 1)
    h_membres = ['Membre', 'Kourel', 'Séances attendues', 'Présents', 'Abs. justifiés', 'Abs. non justifiés', 'Taux présence (%)']
    for col, h in enumerate(h_membres, 1):
        c = ws_membres.cell(row=1, column=col, value=h)
        c.font = header_font
        c.border = border
    for i, s in enumerate(stats_membres, 2):
        ws_membres.cell(row=i, column=1, value=s['nom']).border = border
        ws_membres.cell(row=i, column=2, value=s['kourel']).border = border
        ws_membres.cell(row=i, column=3, value=s['nb_seances_attendues']).border = border
        ws_membres.cell(row=i, column=4, value=s['nb_presents']).border = border
        ws_membres.cell(row=i, column=5, value=s['nb_abs_just']).border = border
        ws_membres.cell(row=i, column=6, value=s['nb_abs_non_just']).border = border
        ws_membres.cell(row=i, column=7, value=f"{s['taux_presence']}%").border = border
    for col in range(1, 8):
        ws_membres.column_dimensions[get_column_letter(col)].width = 18

    # Feuille 3 : Détail des séances
    ws = wb.create_sheet("Détail séances", 2)
    taux_par_membre = {s['membre_id']: s['taux_presence'] for s in stats_membres}
    headers = ['Date', 'Heure début', 'Heure fin', 'Lieu', 'Kourel', 'Khassidas (nom, dathie, portion)', 'Membre', 'Statut', 'Taux présence (%)', 'Remarque']
    for col, h in enumerate(headers, 1):
        c = ws.cell(row=1, column=col, value=h)
        c.font = header_font
        c.border = border

    row = 2
    for seance in qs:
        khass_str = ' | '.join(
            f"{k.nom_khassida} ({k.dathie})" + (f" - {k.khassida_portion}" if k.khassida_portion else "")
            for k in seance.khassidas.all()
        ) or '—'
        date_str = seance.date_heure.strftime('%d/%m/%Y') if seance.date_heure else ''
        heure_debut = seance.date_heure.strftime('%H:%M') if seance.date_heure else ''
        heure_fin = seance.heure_fin.strftime('%H:%M') if seance.heure_fin else ''
        lieu = seance.lieu or ''
        kourel_nom = seance.kourel.nom if seance.kourel else ''

        presences = list(seance.presences.all())
        if not presences:
            ws.cell(row=row, column=1, value=date_str).border = border
            ws.cell(row=row, column=2, value=heure_debut).border = border
            ws.cell(row=row, column=3, value=heure_fin).border = border
            ws.cell(row=row, column=4, value=lieu).border = border
            ws.cell(row=row, column=5, value=kourel_nom).border = border
            ws.cell(row=row, column=6, value=khass_str).border = border
            ws.cell(row=row, column=7, value='—').border = border
            ws.cell(row=row, column=8, value='—').border = border
            ws.cell(row=row, column=9, value='—').border = border
            ws.cell(row=row, column=10, value='').border = border
            row += 1
        else:
            for p in presences:
                taux = f"{taux_par_membre.get(p.membre_id, 0)}%" if p.membre_id else '—'
                ws.cell(row=row, column=1, value=date_str).border = border
                ws.cell(row=row, column=2, value=heure_debut).border = border
                ws.cell(row=row, column=3, value=heure_fin).border = border
                ws.cell(row=row, column=4, value=lieu).border = border
                ws.cell(row=row, column=5, value=kourel_nom).border = border
                ws.cell(row=row, column=6, value=khass_str).border = border
                ws.cell(row=row, column=7, value=p.membre.get_full_name() if p.membre else '').border = border
                ws.cell(row=row, column=8, value=p.get_statut_display()).border = border
                ws.cell(row=row, column=9, value=taux).border = border
                ws.cell(row=row, column=10, value=p.remarque or '').border = border
                row += 1

    for col in range(1, 11):
        ws.column_dimensions[get_column_letter(col)].width = 18

    from io import BytesIO
    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf


def export_rapport_pdf(date_debut=None, date_fin=None):
    """Export PDF des séances de répétition."""
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
    except ImportError:
        return None

    qs = _get_queryset(date_debut, date_fin)

    from io import BytesIO
    buf = BytesIO()

    doc = SimpleDocTemplate(buf, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    elements = []

    periode_str = f"{date_debut.strftime('%d/%m/%Y')} — {date_fin.strftime('%d/%m/%Y')}" if date_debut and date_fin else "Toutes les séances créées"
    from utils.pdf_header import build_pdf_header
    elements.extend(build_pdf_header("Rapport des séances de répétition", periode_str))

    # Statistiques
    presences_all = list(PresenceSeance.objects.filter(seance__in=qs))
    nb_total = len(presences_all)
    nb_presents = sum(1 for p in presences_all if p.statut == 'present')
    nb_abs_just = sum(1 for p in presences_all if p.statut == 'absent_justifie')
    nb_abs_non_just = sum(1 for p in presences_all if p.statut == 'absent_non_justifie')
    taux_presence = round(100 * nb_presents / nb_total, 1) if nb_total else 0
    stats_data = [
        ['Nombre de séances', str(qs.count())],
        ['Total marquages présence', str(nb_total)],
        ['Présents', str(nb_presents)],
        ['Absents justifiés', str(nb_abs_just)],
        ['Absents non justifiés', str(nb_abs_non_just)],
        ['Taux de présence (%)', f'{taux_presence}%'],
    ]
    stats_table = Table([['Indicateur', 'Valeur']] + stats_data, colWidths=[6*cm, 4*cm])
    stats_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2D5F3F')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    elements.append(Paragraph('<b>Statistiques</b>', styles['Heading2']))
    elements.append(stats_table)
    elements.append(Spacer(1, 0.8*cm))
    # Taux par membre
    stats_membres = _get_stats_par_membre(qs)
    elements.append(Paragraph('<b>Taux de présence par membre</b>', styles['Heading2']))
    elements.append(Spacer(1, 0.3*cm))
    if stats_membres:
        m_headers = [['Membre', 'Kourel', 'Séances attendues', 'Présents', 'Abs. just.', 'Abs. non just.', 'Taux (%)']]
        m_data = [[s['nom'], s['kourel'], str(s['nb_seances_attendues']), str(s['nb_presents']),
                   str(s['nb_abs_just']), str(s['nb_abs_non_just']), f"{s['taux_presence']}%"] for s in stats_membres]
        mt = Table(m_headers + m_data, colWidths=[5*cm, 4*cm, 3*cm, 2*cm, 2*cm, 2.5*cm, 2*cm])
        mt.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2D5F3F')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        elements.append(mt)
    else:
        elements.append(Paragraph('Aucun membre concerné.', styles['Normal']))
    elements.append(Spacer(1, 0.8*cm))
    elements.append(Paragraph('<b>Détail des séances</b>', styles['Heading2']))
    elements.append(Spacer(1, 0.3*cm))

    for seance in qs:
        khass_str = ', '.join(
            f"{k.nom_khassida} ({k.dathie})" + (f" - {k.khassida_portion}" if k.khassida_portion else "")
            for k in seance.khassidas.all()
        ) or '—'
        date_str = seance.date_heure.strftime('%d/%m/%Y %H:%M') if seance.date_heure else ''
        heure_fin = seance.heure_fin.strftime('%H:%M') if seance.heure_fin else '—'

        h = [['Date/Heure', 'Heure fin', 'Lieu', 'Kourel', 'Khassidas']]
        h.append([date_str, heure_fin, seance.lieu or '—', seance.kourel.nom if seance.kourel else '—', khass_str])
        t = Table(h, colWidths=[4*cm, 2.5*cm, 4*cm, 3*cm, 6*cm])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2D5F3F')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#f4ead5')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 0.3*cm))

        presences = list(seance.presences.all())
        if presences:
            taux_par_membre = {s['membre_id']: s['taux_presence'] for s in stats_membres}
            ph = [['Membre', 'Statut', 'Taux présence (%)', 'Remarque']]
            for p in presences:
                taux = f"{taux_par_membre.get(p.membre_id, 0)}%" if p.membre_id else '—'
                ph.append([p.membre.get_full_name() if p.membre else '', p.get_statut_display(), taux, p.remarque or ''])
            pt = Table(ph, colWidths=[5*cm, 3*cm, 2.5*cm, 5*cm])
            pt.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#C9A961')),
                ('FONTSIZE', (0, 0), (-1, 0), 9),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ]))
            elements.append(pt)
        elements.append(Spacer(1, 0.8*cm))

    doc.build(elements)
    buf.seek(0)
    return buf


def export_rapport_csv(date_debut=None, date_fin=None):
    """Export CSV des séances de répétition."""
    import csv
    from io import StringIO

    qs = _get_queryset(date_debut, date_fin)

    buf = StringIO()
    writer = csv.writer(buf, delimiter=';')
    periode_str = f"{date_debut.strftime('%d/%m/%Y')} — {date_fin.strftime('%d/%m/%Y')}" if date_debut and date_fin else "Toutes les séances créées"
    writer.writerow([f'Rapport séances de répétition - Période {periode_str}'])
    presences_all = list(PresenceSeance.objects.filter(seance__in=qs))
    nb_total = len(presences_all)
    nb_presents = sum(1 for p in presences_all if p.statut == 'present')
    taux_presence = round(100 * nb_presents / nb_total, 1) if nb_total else 0
    writer.writerow([f'Séances: {qs.count()} | Présences: {nb_total} | Présents: {nb_presents} | Taux: {taux_presence}%'])
    writer.writerow([])
    # Taux par membre
    stats_membres = _get_stats_par_membre(qs)
    writer.writerow(['Taux de présence par membre'])
    writer.writerow(['Membre', 'Kourel', 'Séances attendues', 'Présents', 'Abs. justifiés', 'Abs. non justifiés', 'Taux (%)'])
    for s in stats_membres:
        writer.writerow([s['nom'], s['kourel'], s['nb_seances_attendues'], s['nb_presents'],
                        s['nb_abs_just'], s['nb_abs_non_just'], f"{s['taux_presence']}%"])
    writer.writerow([])
    writer.writerow(['Date', 'Heure début', 'Heure fin', 'Lieu', 'Kourel', 'Khassidas (nom, dathie, portion)', 'Membre', 'Statut', 'Taux présence (%)', 'Remarque'])

    taux_par_membre = {s['membre_id']: s['taux_presence'] for s in stats_membres}
    for seance in qs:
        khass_str = ' | '.join(
            f"{k.nom_khassida} ({k.dathie})" + (f" - {k.khassida_portion}" if k.khassida_portion else "")
            for k in seance.khassidas.all()
        ) or '—'
        date_str = seance.date_heure.strftime('%d/%m/%Y') if seance.date_heure else ''
        heure_debut = seance.date_heure.strftime('%H:%M') if seance.date_heure else ''
        heure_fin = seance.heure_fin.strftime('%H:%M') if seance.heure_fin else ''
        lieu = seance.lieu or ''
        kourel_nom = seance.kourel.nom if seance.kourel else ''

        presences = list(seance.presences.all())
        if not presences:
            writer.writerow([date_str, heure_debut, heure_fin, lieu, kourel_nom, khass_str, '—', '—', '—', ''])
        else:
            for p in presences:
                taux = f"{taux_par_membre.get(p.membre_id, 0)}%" if p.membre_id else '—'
                writer.writerow([
                    date_str, heure_debut, heure_fin, lieu, kourel_nom, khass_str,
                    p.membre.get_full_name() if p.membre else '',
                    p.get_statut_display(),
                    taux,
                    p.remarque or ''
                ])

    from io import BytesIO
    out = BytesIO(buf.getvalue().encode('utf-8-sig'))
    out.seek(0)
    return out
