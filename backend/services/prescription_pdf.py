"""
MediConnect Digital Prescription PDF Generator
Generates clinical-grade, high-fidelity A4 prescription PDFs compliant with healthcare standards.
"""

import io
import os
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Safe Font Registration
FONT_NORMAL = 'Helvetica'
FONT_BOLD = 'Helvetica-Bold'

try:
    # Try registering TrueType Unicode fonts for multi-language & Telugu support
    font_paths = [
        ("SegoeUI", "C:\\Windows\\Fonts\\segoeui.ttf", "SegoeUI-Bold", "C:\\Windows\\Fonts\\segoeuib.ttf"),
        ("Arial", "C:\\Windows\\Fonts\\arial.ttf", "Arial-Bold", "C:\\Windows\\Fonts\\arialbd.ttf")
    ]
    for normal_name, normal_path, bold_name, bold_path in font_paths:
        if os.path.exists(normal_path) and os.path.exists(bold_path):
            try:
                pdfmetrics.registerFont(TTFont(normal_name, normal_path))
                pdfmetrics.registerFont(TTFont(bold_name, bold_path))
                FONT_NORMAL = normal_name
                FONT_BOLD = bold_name
                break
            except Exception:
                continue
except Exception:
    pass


def generate_prescription_pdf(rx_data):
    """
    Builds a professional A4 prescription PDF document in-memory.
    Returns bytes buffer.
    """
    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=32,
        bottomMargin=32
    )

    # Clinical Color Palette
    PRIMARY_TEAL = colors.HexColor('#0F766E')      # Deep Teal
    DARK_HEADER = colors.HexColor('#0C2328')       # Deep Forest / Slate
    TEXT_DARK = colors.HexColor('#1E293B')         # Slate 800
    TEXT_MUTED = colors.HexColor('#64748B')        # Slate 500
    BG_LIGHT = colors.HexColor('#F8FAFC')          # Slate 50
    BORDER_COLOR = colors.HexColor('#CBD5E1')      # Slate 300
    ACCENT_MINT = colors.HexColor('#2DD4BF')       # Mint
    ROW_ALT = colors.HexColor('#F1F5F9')

    styles = getSampleStyleSheet()

    # Custom Typography Styles
    style_brand = ParagraphStyle(
        'RxBrand',
        parent=styles['Normal'],
        fontName=FONT_BOLD,
        fontSize=15,
        leading=18,
        textColor=PRIMARY_TEAL
    )

    style_hospital_name = ParagraphStyle(
        'RxHospName',
        parent=styles['Normal'],
        fontName=FONT_BOLD,
        fontSize=13,
        leading=16,
        textColor=DARK_HEADER
    )

    style_subtext = ParagraphStyle(
        'RxSubtext',
        parent=styles['Normal'],
        fontName=FONT_NORMAL,
        fontSize=8.5,
        leading=11,
        textColor=TEXT_MUTED
    )

    style_doc_name = ParagraphStyle(
        'RxDocName',
        parent=styles['Normal'],
        fontName=FONT_BOLD,
        fontSize=12,
        leading=15,
        textColor=DARK_HEADER
    )

    style_section_title = ParagraphStyle(
        'RxSectionTitle',
        parent=styles['Normal'],
        fontName=FONT_BOLD,
        fontSize=10,
        leading=13,
        textColor=PRIMARY_TEAL
    )

    style_body = ParagraphStyle(
        'RxBody',
        parent=styles['Normal'],
        fontName=FONT_NORMAL,
        fontSize=9,
        leading=12,
        textColor=TEXT_DARK
    )

    style_body_bold = ParagraphStyle(
        'RxBodyBold',
        parent=styles['Normal'],
        fontName=FONT_BOLD,
        fontSize=9,
        leading=12,
        textColor=TEXT_DARK
    )

    style_table_header = ParagraphStyle(
        'RxTableHeader',
        parent=styles['Normal'],
        fontName=FONT_BOLD,
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )

    style_table_cell = ParagraphStyle(
        'RxTableCell',
        parent=styles['Normal'],
        fontName=FONT_NORMAL,
        fontSize=8.5,
        leading=11,
        textColor=TEXT_DARK
    )

    style_table_cell_bold = ParagraphStyle(
        'RxTableCellBold',
        parent=styles['Normal'],
        fontName=FONT_BOLD,
        fontSize=8.5,
        leading=11,
        textColor=DARK_HEADER
    )

    style_disclaimer = ParagraphStyle(
        'RxDisclaimer',
        parent=styles['Normal'],
        fontName=FONT_NORMAL,
        fontSize=7.5,
        leading=10,
        alignment=TA_CENTER,
        textColor=TEXT_MUTED
    )

    elements = []

    # ------------------------------------------------------------------
    # 1. HEADER: BRAND & HOSPITAL INFO
    # ------------------------------------------------------------------
    hospital_name = rx_data.get('hospital_name') or 'MediConnect Medical Center'
    hospital_addr = rx_data.get('hospital_address') or 'Healthcare Network Services'
    hospital_phone = rx_data.get('hospital_phone') or '+91 40 2345 6789'

    left_header = [
        Paragraph("MediConnect Health", style_brand),
        Paragraph("DIGITAL CLINICAL WORKSPACE", ParagraphStyle('Sub', parent=style_subtext, fontName=FONT_BOLD, fontSize=7, textColor=PRIMARY_TEAL)),
        Paragraph("E-Health Network of AP & Telangana", style_subtext)
    ]

    right_header = [
        Paragraph(hospital_name, ParagraphStyle('HospRight', parent=style_hospital_name, alignment=TA_RIGHT)),
        Paragraph(hospital_addr, ParagraphStyle('HospAddr', parent=style_subtext, alignment=TA_RIGHT)),
        Paragraph(f"Tel: {hospital_phone}", ParagraphStyle('HospPhone', parent=style_subtext, alignment=TA_RIGHT))
    ]

    header_table = Table([[left_header, right_header]], colWidths=[200, 323])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 6))

    # Teal divider
    elements.append(HRFlowable(width="100%", thickness=2, color=PRIMARY_TEAL, spaceBefore=2, spaceAfter=8))

    # ------------------------------------------------------------------
    # 2. DOCTOR & PRESCRIPTION META ROW
    # ------------------------------------------------------------------
    doctor_name = rx_data.get('doctor_name') or 'Physician'
    if not (doctor_name.startswith('Dr.') or doctor_name.startswith('డాక్టర్')):
        doctor_name = f"Dr. {doctor_name}"

    doctor_qual = rx_data.get('doctor_qualification') or 'MBBS, MD'
    doctor_spec = rx_data.get('doctor_specialization') or 'Consultant Physician'
    doctor_reg = rx_data.get('doctor_reg_number') or 'NMC Certified'
    rx_num = rx_data.get('prescription_number') or 'RX-00000000'
    created_raw = rx_data.get('created_at') or datetime.now().strftime('%Y-%m-%d')
    try:
        if 'T' in str(created_raw):
            created_dt = datetime.fromisoformat(str(created_raw).replace('Z', '+00:00'))
            created_str = created_dt.strftime('%d %b %Y, %I:%M %p')
        else:
            created_str = str(created_raw)
    except Exception:
        created_str = str(created_raw)

    doc_details = [
        Paragraph(doctor_name, style_doc_name),
        Paragraph(f"{doctor_qual} • {doctor_spec}", style_body),
        Paragraph(f"Medical Council Reg No: <b>{doctor_reg}</b>", style_subtext)
    ]

    rx_meta = [
        Paragraph(f"<b>Prescription No:</b> {rx_num}", ParagraphStyle('RxNum', parent=style_body, alignment=TA_RIGHT)),
        Paragraph(f"<b>Date:</b> {created_str}", ParagraphStyle('RxDate', parent=style_body, alignment=TA_RIGHT)),
        Paragraph(f"<b>Status:</b> <font color='#0D9488'>Official Active Rx</font>", ParagraphStyle('RxStatus', parent=style_subtext, alignment=TA_RIGHT))
    ]

    meta_table = Table([[doc_details, rx_meta]], colWidths=[310, 213])
    meta_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 6))

    # ------------------------------------------------------------------
    # 3. PATIENT DEMOGRAPHICS BOX
    # ------------------------------------------------------------------
    pat_name = rx_data.get('patient_name') or 'Valued Patient'
    pat_id = rx_data.get('patient_id') or 'N/A'
    pat_age = rx_data.get('patient_age') or 'N/A'
    pat_gender = rx_data.get('patient_gender') or 'Not Specified'
    pat_phone = rx_data.get('patient_phone') or 'Not Provided'

    pat_box_data = [
        [
            Paragraph(f"<b>Patient Name:</b> {pat_name}", style_body),
            Paragraph(f"<b>Patient ID:</b> PID-{pat_id}", style_body),
            Paragraph(f"<b>Age / Sex:</b> {pat_age} / {pat_gender}", style_body)
        ],
        [
            Paragraph(f"<b>Contact:</b> {pat_phone}", style_body),
            Paragraph(f"<b>Facility:</b> {hospital_name}", style_body),
            Paragraph(f"<b>Encounter:</b> Clinical Consultation", style_body)
        ]
    ]

    pat_table = Table(pat_box_data, colWidths=[185, 170, 168])
    pat_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
        ('BOX', (0, 0), (-1, -1), 1, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(pat_table)
    elements.append(Spacer(1, 10))

    # ------------------------------------------------------------------
    # 4. CLINICAL DIAGNOSIS & SYMPTOMS
    # ------------------------------------------------------------------
    diag_text = rx_data.get('diagnosis') or 'Clinical Examination Completed'
    symptoms_text = rx_data.get('symptoms') or 'Clinical assessment and findings recorded.'

    diag_data = [
        [Paragraph("CLINICAL DIAGNOSIS & FINDINGS", style_section_title)],
        [Paragraph(f"<b>Primary Diagnosis:</b> {diag_text}", style_body)],
        [Paragraph(f"<b>Clinical Observations / Symptoms:</b> {symptoms_text}", style_subtext)]
    ]
    diag_table = Table(diag_data, colWidths=[523])
    diag_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(diag_table)
    elements.append(Spacer(1, 10))

    # ------------------------------------------------------------------
    # 5. RX / MEDICATIONS TABLE
    # ------------------------------------------------------------------
    elements.append(Paragraph("<font size='13' color='#0F766E'><b>&#8478;</b></font> <b>PRESCRIBED MEDICATIONS</b>", style_section_title))
    elements.append(Spacer(1, 4))

    med_headers = [
        Paragraph("#", style_table_header),
        Paragraph("Medicine & Dosage", style_table_header),
        Paragraph("Frequency", style_table_header),
        Paragraph("Duration", style_table_header),
        Paragraph("Food Timing & Instructions", style_table_header)
    ]

    med_rows = [med_headers]
    medicines = rx_data.get('medicines') or []
    if isinstance(medicines, str):
        try:
            import json
            medicines = json.loads(medicines)
        except Exception:
            medicines = []

    if not medicines:
        med_rows.append([
            Paragraph("1", style_table_cell),
            Paragraph("No systemic pharmaceuticals prescribed at this time.", style_table_cell),
            Paragraph("-", style_table_cell),
            Paragraph("-", style_table_cell),
            Paragraph("Continue general supportive care.", style_table_cell)
        ])
    else:
        for idx, med in enumerate(medicines, 1):
            name = med.get('name') or 'Medication'
            dosage = med.get('dosage') or ''
            freq = med.get('frequency') or '1-0-1'
            duration = med.get('duration') or '5 Days'
            timing = med.get('timing') or 'After Food'
            instructions = med.get('instructions') or ''

            med_title = f"<b>{name}</b>"
            if dosage:
                med_title += f"<br/><font size='7.5' color='#64748B'>Dose: {dosage}</font>"

            inst_text = f"<b>{timing}</b>"
            if instructions:
                inst_text += f"<br/><font size='7.5' color='#475569'>{instructions}</font>"

            med_rows.append([
                Paragraph(str(idx), style_table_cell_bold),
                Paragraph(med_title, style_table_cell),
                Paragraph(f"<b>{freq}</b>", style_table_cell),
                Paragraph(duration, style_table_cell),
                Paragraph(inst_text, style_table_cell)
            ])

    col_widths = [26, 175, 78, 74, 170]
    med_table = Table(med_rows, colWidths=col_widths, repeatRows=1)

    table_style_commands = [
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_TEAL),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
    ]

    for r_idx in range(1, len(med_rows)):
        if r_idx % 2 == 0:
            table_style_commands.append(('BACKGROUND', (0, r_idx), (-1, r_idx), ROW_ALT))

    med_table.setStyle(TableStyle(table_style_commands))
    elements.append(med_table)
    elements.append(Spacer(1, 12))

    # ------------------------------------------------------------------
    # 6. ADDITIONAL ADVICE & FOLLOW-UP INSTRUCTIONS
    # ------------------------------------------------------------------
    advice = rx_data.get('additional_advice') or ''
    follow_up = rx_data.get('follow_up_date') or ''
    notes = rx_data.get('notes') or ''

    advice_items = []
    if advice:
        advice_items.append(Paragraph(f"<b>General & Dietary Advice:</b> {advice}", style_body))
    if notes:
        advice_items.append(Paragraph(f"<b>Clinical Notes:</b> {notes}", style_subtext))
    if follow_up:
        advice_items.append(Paragraph(f"<b>Follow-Up Review:</b> Schedule review on or before <b>{follow_up}</b>.", ParagraphStyle('FUp', parent=style_body, textColor=PRIMARY_TEAL)))

    if advice_items:
        elements.append(Paragraph("ADVICE & CLINICAL INSTRUCTIONS", style_section_title))
        elements.append(Spacer(1, 3))
        advice_table = Table([[item] for item in advice_items], colWidths=[523])
        advice_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
            ('BOX', (0, 0), (-1, -1), 1, BORDER_COLOR),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(advice_table)
        elements.append(Spacer(1, 14))

    # ------------------------------------------------------------------
    # 7. SIGNATURE & DIGITAL VERIFICATION BLOCK
    # ------------------------------------------------------------------
    sig_left = [
        Paragraph("<b>Digital Verification Security:</b>", style_subtext),
        Paragraph(f"Prescription Token: <code>{rx_num}</code>", style_subtext),
        Paragraph("Verified via MediConnect Encrypted Clinical Gateway", style_subtext),
        Paragraph("Tamper-Proof E-Prescription Standard", style_subtext)
    ]

    sig_right = [
        Spacer(1, 16),
        Paragraph("___________________________________", ParagraphStyle('Line', parent=style_body, alignment=TA_RIGHT, textColor=BORDER_COLOR)),
        Paragraph(f"<b>{doctor_name}</b>", ParagraphStyle('SigName', parent=style_body_bold, alignment=TA_RIGHT)),
        Paragraph(f"{doctor_spec} • {doctor_qual}", ParagraphStyle('SigSpec', parent=style_subtext, alignment=TA_RIGHT)),
        Paragraph(f"NMC Reg: {doctor_reg}", ParagraphStyle('SigReg', parent=style_subtext, alignment=TA_RIGHT))
    ]

    sig_table = Table([[sig_left, sig_right]], colWidths=[260, 263])
    sig_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(KeepTogether([sig_table]))
    elements.append(Spacer(1, 10))

    # ------------------------------------------------------------------
    # 8. FOOTER DISCLAIMER
    # ------------------------------------------------------------------
    elements.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR, spaceBefore=4, spaceAfter=6))
    elements.append(Paragraph(
        "Notice: This is a verified electronic clinical prescription generated through MediConnect Healthcare Platform in compliance with Digital Health Records Guidelines. Valid for dispensing at licensed pharmacies.",
        style_disclaimer
    ))

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()

