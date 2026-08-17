import os
import time
import re
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_incident_pdf(report_text: str, incident_query: str = "Incident Investigation", output_filename: str = None) -> str:
    """Generates a styled PDF incident report from markdown/structured text."""
    if not output_filename:
        timestamp = int(time.time())
        output_filename = f"incident_report_{timestamp}.pdf"

    doc = SimpleDocTemplate(
        output_filename,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'RepTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0f172a'),
        alignment=0
    )

    h1_style = ParagraphStyle(
        'RepH1',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1e3a8a'),
        spaceBefore=10,
        spaceAfter=4
    )

    body_style = ParagraphStyle(
        'RepBody',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155')
    )

    bullet_style = ParagraphStyle(
        'RepBullet',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=9,
        leading=12.5,
        textColor=colors.HexColor('#334155'),
        leftIndent=12
    )

    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#1e293b')
    )

    story = []

    # Title
    story.append(Paragraph("OPSPILOT INCIDENT POST-MORTEM REPORT", title_style))
    story.append(Paragraph(f"<b>Query:</b> {incident_query}", ParagraphStyle('Sub', parent=body_style, textColor=colors.HexColor('#2563eb'))))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#2563eb'), spaceBefore=4, spaceAfter=8))

    # Meta Table
    meta_data = [
        [
            Paragraph(f"<b>Generated At:</b> {time.strftime('%Y-%m-%d %H:%M:%S UTC')}", table_cell),
            Paragraph("<b>Investigator:</b> OpsPilot Autonomous Agent", table_cell)
        ],
        [
            Paragraph("<b>Status:</b> Resolved & Grounded", table_cell),
            Paragraph("<b>Evidence Source:</b> Telemetry, Logs & SOP Runbooks", table_cell)
        ]
    ]
    t = Table(meta_data, colWidths=[270, 270])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t)
    story.append(Spacer(1, 10))

    # Parse markdown lines into styled story elements
    lines = report_text.split("\n")
    for line in lines:
        line_s = line.strip()
        if not line_s:
            story.append(Spacer(1, 4))
            continue
        
        if line_s.startswith("### ") or line_s.startswith("## ") or line_s.startswith("# "):
            heading_text = line_s.lstrip("#").strip()
            story.append(Paragraph(heading_text, h1_style))
        elif line_s.startswith("#### "):
            heading_text = line_s.lstrip("#").strip()
            story.append(Paragraph(f"<b>{heading_text}</b>", ParagraphStyle('H2', parent=body_style, fontName='Helvetica-Bold', textColor=colors.HexColor('#0369a1'))))
        elif line_s.startswith("---") or line_s.startswith("___"):
            story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#cbd5e1'), spaceBefore=4, spaceAfter=6))
        elif line_s.startswith("- ") or line_s.startswith("* ") or (len(line_s) > 2 and line_s[0].isdigit() and line_s[1] in [".", ")"]):
            cleaned = re.sub(r'^\s*[-*•]\s*', '', line_s)
            cleaned = re.sub(r'^\s*\d+[\.\)]\s*', '', cleaned)
            # convert bold markdown **text** to <b>text</b>
            cleaned = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', cleaned)
            story.append(Paragraph(f"• {cleaned}", bullet_style))
        else:
            cleaned = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', line_s)
            story.append(Paragraph(cleaned, body_style))

    story.append(Spacer(1, 10))
    doc.build(story)
    return output_filename
