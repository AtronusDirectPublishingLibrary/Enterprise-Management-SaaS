from docx.shared import Cm, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from .common import (
    NAVY, GOLD, WHITE, MUTED, INK, PALE_GOLD, LINE,
    p, bullet, table, callout, figure, shade, cell_margins, tbl_borders,
)


def add_cover(doc, monogram_path):
    cover = doc.sections[0]
    cover.top_margin = Cm(1.7)
    cover.bottom_margin = Cm(1.5)
    cover.left_margin = Cm(1.8)
    cover.right_margin = Cm(1.8)

    banner = doc.add_table(rows=1, cols=2)
    banner.alignment = WD_TABLE_ALIGNMENT.CENTER
    banner.autofit = False
    banner.columns[0].width = Cm(3.2)
    banner.columns[1].width = Cm(14.2)
    left, right = banner.rows[0].cells
    left.width = Cm(3.2)
    right.width = Cm(14.2)
    for cell in (left, right):
        shade(cell, "0B2545")
        cell_margins(cell, 150, 130, 120, 120)
    logo = left.paragraphs[0]
    logo.alignment = WD_ALIGN_PARAGRAPH.LEFT
    logo.add_run().add_picture(str(monogram_path), width=Cm(1.9))
    brand = right.paragraphs[0]
    brand.paragraph_format.space_after = Pt(2)
    run = brand.add_run("ETHIO-BIOPHARMA ENTERPRISE")
    run.font.name = "Georgia"
    run.font.size = Pt(13)
    run.bold = True
    run.font.color.rgb = WHITE
    sub = right.add_paragraph()
    sub.paragraph_format.space_after = Pt(0)
    run = sub.add_run("Enterprise Management System  ·  EB-EMS")
    run.font.name = "Segoe UI"
    run.font.size = Pt(8.5)
    run.font.color.rgb = GOLD

    p(doc, "", space_after=18)
    kicker = p(doc, "SYSTEM USER GUIDE  ·  NOVEMBER 2026", size=9, color=GOLD, bold=True, space_after=8)
    kicker.paragraph_format.space_before = Pt(5)
    title = p(doc, "One system for planning, projects, people and performance.", size=27, color=NAVY, font="Georgia", line=1.08, space_after=8)
    title.paragraph_format.space_before = Pt(2)
    p(
        doc,
        "A practical, role-based guide to Ethio-Biopharma's Enterprise Management System — from the annual plan and project delivery to HR, payroll, fleet cost control, documents, public communications and executive intelligence.",
        size=12,
        color=MUTED,
        line=1.35,
        space_after=16,
    )
    rule = doc.add_paragraph()
    rule.paragraph_format.space_after = Pt(10)
    p_pr = rule._p.get_or_add_pPr()
    from docx.oxml import OxmlElement
    from docx.oxml.ns import qn
    bdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "16")
    bottom.set(qn("w:space"), "2")
    bottom.set(qn("w:color"), "C9A227")
    bdr.append(bottom)
    p_pr.append(bdr)

    figure(doc, "03-public-home.jpg", "The EBPE public homepage — the front door to the same EB-EMS data that powers the internal workspace.", 16.2)
    p(doc, "", space_after=10)

    meta = doc.add_table(rows=1, cols=3)
    meta.alignment = WD_TABLE_ALIGNMENT.CENTER
    labels = [
        ("VERSION", "2.0 · 12 November 2026"),
        ("AUDIENCE", "All staff, managers and administrators"),
        ("CLASSIFICATION", "Internal · controlled document"),
    ]
    for index, (label, value) in enumerate(labels):
        cell = meta.rows[0].cells[index]
        shade(cell, "F7F4EC")
        cell_margins(cell, 110, 110, 140, 120)
        paragraph = cell.paragraphs[0]
        paragraph.paragraph_format.space_after = Pt(1)
        r = paragraph.add_run(label)
        r.font.name = "Segoe UI"
        r.font.size = Pt(7)
        r.bold = True
        r.font.color.rgb = GOLD
        value_p = cell.add_paragraph()
        value_p.paragraph_format.space_after = Pt(0)
        r = value_p.add_run(value)
        r.font.name = "Segoe UI"
        r.font.size = Pt(8.5)
        r.font.color.rgb = NAVY


def add_front_matter(doc):
    p(doc, "ABOUT THIS GUIDE", size=8.5, color=GOLD, bold=True, space_after=3)
    p(doc, "How to use this guide", size=22, color=NAVY, font="Georgia", space_after=8)
    p(
        doc,
        "EB-EMS is broad by design: the same signed-in workspace serves a project engineer, an HR manager, a fleet officer and the Chief Executive. This guide follows the work rather than the menu. Each chapter explains what a screen is for, the decisions it supports, and the steps to complete the task.",
        size=11,
        line=1.35,
    )
    p(doc, "Use the chapter for your role first, then keep the shared chapters on navigation, documents and security as a reference. Text in **bold** names a button, field or menu; numbered steps are performed in order.", size=11, line=1.35)

    callout(
        doc,
        "The one rule that keeps the system trustworthy",
        "Enter the evidence once, in the workspace that owns it. Plans, projects, reports, HR records, fleet costs, news and documents are all read from the same database — do not duplicate a record to make it appear somewhere else. Visibility is a property of the record, not a second copy.",
        "gold",
    )

    p(doc, "Document control", size=14, color=NAVY, font="Georgia", space_after=4)
    table(
        doc,
        ["Item", "Detail"],
        [
            ["Product", "Ethio-Biopharma Enterprise Management System (EB-EMS)"],
            ["Release", "Version 2.0 — planning, people, fleet, documents and executive intelligence"],
            ["Guide owner", "Strategy and Planning Office, Ethio-Biopharma Enterprise"],
            ["Audience", "All staff, supervisors, managers, executives and system administrators"],
            ["Source of truth", "The live EB-EMS application and its audit log"],
            ["Screenshots", "Captured from the working system on 12 November 2026"],
            ["Review cycle", "Review after each major release or change to roles, approval rules or statutory requirements"],
        ],
        widths=[3.6, 12.8],
        size=8.8,
        first_bold=True,
    )

    p(doc, "Contents", size=14, color=NAVY, font="Georgia", space_after=4)
    table(
        doc,
        ["Chapter", "What you will learn"],
        [
            ["1  Welcome to EB-EMS", "The operating model, the main workspaces and the single-record principle."],
            ["2  Getting started", "Sign in, recover access, understand the dashboard and find anything quickly."],
            ["3  Your role-based workspace", "How positions shape navigation, route access and API permissions."],
            ["4  Navigation and shared tools", "Search, notifications, language, print, export and profile controls."],
            ["5  Planning, delivery and reporting", "Annual, strategic and roadmap plans; projects; progress updates; consolidated reports; calendars and alerts."],
            ["6  My HR and the reporting gate", "Self-service, the monthly timesheet gate, reminders, signatures and personal records."],
            ["7  HR administration", "Staff, leave, training history, dynamic appraisals, recruitment, induction, payroll and offboarding."],
            ["8  Fleet and transport", "Requests, approvals, assignment, gate passes, vehicles, drivers and ride services."],
            ["9  Fleet cost control", "Fuel logbook, maintenance schedule, spare parts, tyres, per-vehicle cost analytics and CSV/BI use."],
            ["10  News and social distribution", "Publish once, distribute to Facebook, LinkedIn, X, Telegram or a webhook, and manage delivery receipts."],
            ["11  Executive BI and AI brief", "Cross-filtered portfolio intelligence, the deterministic AI brief and the Power BI-ready dataset."],
            ["12  Quality Management System", "WHO-aligned controlled documents, deviations, CAPA, change control and the QMS overview."],
            ["13  Documents and archives", "One corporate registry, public visibility, project attachments and the internal archive."],
            ["14  Public website and QR", "Public pages, newsroom, document library, footer QR generation and download."],
            ["15  Security, audit and support", "Audit trails, sessions, backups, safe use and where to get help."],
            ["16  Quick reference", "Role summary, key routes, glossary and release checklist."],
            ["Appendix A", "Configuration and environment variables."],
            ["Appendix B", "Feature verification checklist for administrators."],
        ],
        widths=[4.7, 11.7],
        size=8.5,
        first_bold=True,
    )

    p(doc, "Conventions used in this guide", size=14, color=NAVY, font="Georgia", space_after=4)
    bullet(doc, "**Menu path** — for example, Fleet → Cost control. Menu names match the left-hand navigation.")
    bullet(doc, "**Button or field** — shown in bold and quoted the first time it appears.")
    bullet(doc, "**Callout** — an important governance or data-quality rule. Read these before changing records.")
    bullet(doc, "**Tip** — a faster way to do the same work, or a safe default for a common decision.")
    bullet(doc, "**Do not duplicate** — if a document, news item or report already exists, update the existing record and change its visibility instead of creating a second one.")
