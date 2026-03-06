"""
En-tête PDF commun : logo et nom de la Daara pour les rapports.
"""
from pathlib import Path

from django.conf import settings

DAARA_NOM = "Ahibahil Khadim"
DAARA_SOUS_TITRE = "Wakeur Serigne Moustapha Salihou"


def get_logo_path():
    """Retourne le chemin du logo s'il existe."""
    base = Path(settings.BASE_DIR)
    # Essayer frontend/public/logo.png (projet monorepo)
    p = base.parent / 'frontend' / 'public' / 'logo.png'
    if p.exists():
        return str(p)
    # Essayer backend/static/logo.png
    p = base / 'static' / 'logo.png'
    if p.exists():
        return str(p)
    return None


def build_pdf_header(title_report, periode_str):
    """
    Construit l'en-tête PDF (logo + nom daara + titre du rapport).
    Retourne une liste d'éléments platypus à insérer en tête du document.
    """
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import Image, Paragraph, Spacer, Table, TableStyle

    styles = getSampleStyleSheet()
    elements = []

    logo_path = get_logo_path()
    logo_img = None
    if logo_path:
        try:
            logo_img = Image(logo_path, width=2.5*cm, height=2.5*cm)
        except Exception:
            logo_img = None

    nom_style = ParagraphStyle(
        'DaaraNom',
        parent=styles['Title'],
        fontSize=14,
        textColor=colors.HexColor('#2D5F3F'),
        alignment=0,
        spaceAfter=2,
    )

    if logo_img:
        txt = Paragraph(f"<b>{DAARA_NOM}</b><br/><font size='9' color='#1e4029'>{DAARA_SOUS_TITRE}</font>", nom_style)
        tbl = Table([[logo_img, txt]], colWidths=[3*cm, 12*cm])
        tbl.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, 0), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        elements.append(tbl)
    else:
        elements.append(Paragraph(f"<b>{DAARA_NOM}</b>", nom_style))
        elements.append(Paragraph(f"<font size='9' color='#1e4029'>{DAARA_SOUS_TITRE}</font>", styles['Normal']))

    elements.append(Spacer(1, 0.4*cm))
    hr = Table([['']], colWidths=[18*cm])
    hr.setStyle(TableStyle([('LINEABOVE', (0, 0), (-1, 0), 1, colors.HexColor('#C9A961'))]))
    elements.append(hr)
    elements.append(Spacer(1, 0.4*cm))
    elements.append(Paragraph(f"<b>{title_report}</b>", styles['Heading1']))
    elements.append(Paragraph(f"Période : {periode_str}", styles['Normal']))
    elements.append(Spacer(1, 0.5*cm))

    return elements
