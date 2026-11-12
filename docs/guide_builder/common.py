from pathlib import Path
from docx import Document
from docx.shared import Cm, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING, WD_BREAK
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "guide-assets"
OUT = ROOT / "Ethio-Biopharma_EB-EMS_User_Guide.docx"

NAVY = RGBColor(0x0B, 0x25, 0x45)
GOLD = RGBColor(0xC9, 0xA2, 0x27)
INK = RGBColor(0x1F, 0x29, 0x37)
MUTED = RGBColor(0x64, 0x70, 0x80)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
RED = RGBColor(0xA1, 0x2B, 0x2B)
GREEN = RGBColor(0x24, 0x70, 0x50)
IVORY = "F7F4EC"
PALE_GOLD = "FBF3DC"
PALE_BLUE = "EDF3F8"
PALE_GREEN = "EAF7F0"
PALE_RED = "FBEAEA"
LINE = "E5DDCB"
BODY_FONT = "Segoe UI"
DISPLAY_FONT = "Georgia"


def shade(cell, hex_fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_fill)
    tc_pr.append(shd)


def cell_margins(cell, top=90, bottom=90, left=120, right=120):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    mar = tc_pr.first_child_found_in("w:tcMar")
    if mar is None:
        mar = OxmlElement("w:tcMar")
        tc_pr.append(mar)
    for tag, value in (("top", top), ("bottom", bottom), ("left", left), ("right", right)):
        node = mar.find(qn(f"w:{tag}"))
        if node is None:
            node = OxmlElement(f"w:{tag}")
            mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def tbl_borders(table, color=LINE, size=6):
    tbl = table._tbl
    tbl_pr = tbl.tblPr
    borders = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), str(size))
        el.set(qn("w:space"), "0")
        el.set(qn("w:color"), color)
        borders.append(el)
    tbl_pr.append(borders)


def keep(paragraph, with_next=True):
    paragraph.paragraph_format.keep_with_next = with_next


def runs(paragraph, text):
    """Small inline markup: **bold** and _italic_."""
    bold = False
    italic = False
    buf = ""
    index = 0
    while index < len(text):
        if text.startswith("**", index):
            if buf:
                r = paragraph.add_run(buf)
                r.bold, r.italic = bold, italic
                buf = ""
            bold = not bold
            index += 2
            continue
        if text[index] == "_":
            if buf:
                r = paragraph.add_run(buf)
                r.bold, r.italic = bold, italic
                buf = ""
            italic = not italic
            index += 1
            continue
        buf += text[index]
        index += 1
    if buf:
        r = paragraph.add_run(buf)
        r.bold, r.italic = bold, italic
    return paragraph


def p(doc, text="", size=11.5, color=INK, bold=False, italic=False, align=None,
      space_after=5, space_before=0, line=1.28, font=BODY_FONT):
    paragraph = doc.add_paragraph()
    paragraph.paragraph_format.space_after = Pt(space_after)
    paragraph.paragraph_format.space_before = Pt(space_before)
    paragraph.paragraph_format.line_spacing = line
    if align is not None:
        paragraph.alignment = align
    if text:
        if "**" in text or "_" in text:
            runs(paragraph, text)
        else:
            run = paragraph.add_run(text)
            run.font.name = font
            run._element.rPr.rFonts.set(qn("w:eastAsia"), font)
            run.font.size = Pt(size)
            run.font.color.rgb = color
            run.bold = bold
            run.italic = italic
    return paragraph


def bullet(doc, text, level=0):
    paragraph = doc.add_paragraph(style="List Bullet" if level == 0 else "List Bullet 2")
    paragraph.paragraph_format.space_after = Pt(3)
    paragraph.paragraph_format.line_spacing = 1.2
    runs(paragraph, text)
    return paragraph


def numbered(doc, text):
    paragraph = doc.add_paragraph(style="List Number")
    paragraph.paragraph_format.space_after = Pt(3)
    paragraph.paragraph_format.line_spacing = 1.2
    runs(paragraph, text)
    return paragraph


def h1(doc, number, title, kicker=None, page_break=True):
    if page_break:
        doc.add_page_break()
    if kicker:
        label = doc.add_paragraph()
        label.paragraph_format.space_after = Pt(2)
        r = label.add_run(kicker.upper())
        r.font.name = BODY_FONT
        r.font.size = Pt(8.5)
        r.bold = True
        r.font.color.rgb = GOLD
    paragraph = doc.add_paragraph()
    paragraph.style = doc.styles["Heading 1"]
    paragraph.paragraph_format.space_before = Pt(0)
    paragraph.paragraph_format.space_after = Pt(10)
    paragraph.paragraph_format.keep_with_next = True
    r = paragraph.add_run(f"{number}  {title}")
    r.font.name = DISPLAY_FONT
    r.font.size = Pt(22)
    r.font.color.rgb = NAVY
    r.bold = False
    # Gold rule under the title.
    p_pr = paragraph._p.get_or_add_pPr()
    bdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "10")
    bottom.set(qn("w:space"), "6")
    bottom.set(qn("w:color"), "C9A227")
    bdr.append(bottom)
    p_pr.append(bdr)
    return paragraph


def h2(doc, title):
    paragraph = doc.add_paragraph()
    paragraph.style = doc.styles["Heading 2"]
    paragraph.paragraph_format.space_before = Pt(12)
    paragraph.paragraph_format.space_after = Pt(4)
    paragraph.paragraph_format.keep_with_next = True
    r = paragraph.add_run(title)
    r.font.name = DISPLAY_FONT
    r.font.size = Pt(14)
    r.font.color.rgb = NAVY
    return paragraph


def h3(doc, title):
    paragraph = doc.add_paragraph()
    paragraph.paragraph_format.space_before = Pt(8)
    paragraph.paragraph_format.space_after = Pt(2)
    paragraph.paragraph_format.keep_with_next = True
    r = paragraph.add_run(title)
    r.font.name = BODY_FONT
    r.font.size = Pt(10.5)
    r.bold = True
    r.font.color.rgb = NAVY
    return paragraph


def figure(doc, filename, caption, width=16.4):
    path = ASSETS / filename
    if not path.exists():
        p(doc, f"[Screenshot not available: {filename}]", color=MUTED, italic=True)
        return
    paragraph = doc.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    paragraph.paragraph_format.space_before = Pt(8)
    paragraph.paragraph_format.space_after = Pt(2)
    paragraph.add_run().add_picture(str(path), width=Cm(width))
    cap = doc.add_paragraph()
    cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap.paragraph_format.space_after = Pt(10)
    r = cap.add_run(caption)
    r.font.name = BODY_FONT
    r.font.size = Pt(8.5)
    r.italic = True
    r.font.color.rgb = MUTED


def callout(doc, title, body, tone="gold"):
    fill = {"gold": PALE_GOLD, "green": PALE_GREEN, "red": PALE_RED, "blue": PALE_BLUE}[tone]
    accent = {"gold": "C9A227", "green": "2F8F6B", "red": "B23A3A", "blue": "2E6F9E"}[tone]
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = True
    cell = table.cell(0, 0)
    shade(cell, fill)
    cell_margins(cell, 120, 120, 170, 150)
    tbl_pr = table._tbl.tblPr
    borders = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "single" if edge == "left" else "nil")
        el.set(qn("w:sz"), "24" if edge == "left" else "0")
        el.set(qn("w:color"), accent if edge == "left" else "FFFFFF")
        borders.append(el)
    tbl_pr.append(borders)
    paragraph = cell.paragraphs[0]
    paragraph.paragraph_format.space_after = Pt(2)
    r = paragraph.add_run(title.upper())
    r.font.name = BODY_FONT
    r.font.size = Pt(8)
    r.bold = True
    r.font.color.rgb = NAVY
    body_p = cell.add_paragraph()
    body_p.paragraph_format.space_after = Pt(0)
    body_p.paragraph_format.line_spacing = 1.2
    runs(body_p, body)
    for run in body_p.runs:
        run.font.name = BODY_FONT
        run.font.size = Pt(9.5)
        run.font.color.rgb = INK
    doc.add_paragraph().paragraph_format.space_after = Pt(2)


def table(doc, headers, rows, widths=None, size=8.6, header_fill="0B2545", first_bold=False):
    table_obj = doc.add_table(rows=1, cols=len(headers))
    table_obj.alignment = WD_TABLE_ALIGNMENT.CENTER
    table_obj.autofit = True
    tbl_borders(table_obj, LINE, 4)
    header = table_obj.rows[0]
    for index, label in enumerate(headers):
        cell = header.cells[index]
        shade(cell, header_fill)
        cell_margins(cell)
        paragraph = cell.paragraphs[0]
        paragraph.paragraph_format.space_after = Pt(0)
        run = paragraph.add_run(label)
        run.font.name = BODY_FONT
        run.font.size = Pt(size)
        run.bold = True
        run.font.color.rgb = WHITE
        if widths:
            cell.width = Cm(widths[index])
    for row_index, row in enumerate(rows):
        cells = table_obj.add_row().cells
        for index, value in enumerate(row):
            cell = cells[index]
            cell_margins(cell)
            if row_index % 2:
                shade(cell, "FCFAF4")
            paragraph = cell.paragraphs[0]
            paragraph.paragraph_format.space_after = Pt(0)
            paragraph.paragraph_format.line_spacing = 1.15
            runs(paragraph, str(value))
            for run in paragraph.runs:
                run.font.name = BODY_FONT
                run.font.size = Pt(size)
                run.font.color.rgb = INK
                if first_bold and index == 0:
                    run.bold = True
            if widths:
                cell.width = Cm(widths[index])
    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    return table_obj


def field(paragraph, instruction):
    run = paragraph.add_run()
    fld_begin = OxmlElement("w:fldChar")
    fld_begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = instruction
    fld_sep = OxmlElement("w:fldChar")
    fld_sep.set(qn("w:fldCharType"), "separate")
    text = OxmlElement("w:t")
    text.text = "1"
    fld_end = OxmlElement("w:fldChar")
    fld_end.set(qn("w:fldCharType"), "end")
    run._r.append(fld_begin)
    run._r.append(instr)
    run._r.append(fld_sep)
    run._r.append(text)
    run._r.append(fld_end)


def add_header_footer(section):
    section.header.is_linked_to_previous = False
    section.footer.is_linked_to_previous = False
    header = section.header.paragraphs[0]
    header.text = ""
    r = header.add_run("ETHIO-BIOPHARMA ENTERPRISE")
    r.font.name = BODY_FONT
    r.font.size = Pt(8)
    r.bold = True
    r.font.color.rgb = NAVY
    tab = header.add_run("\t\tEB-EMS · USER GUIDE")
    tab.font.name = BODY_FONT
    tab.font.size = Pt(8)
    tab.bold = True
    tab.font.color.rgb = GOLD
    p_pr = header._p.get_or_add_pPr()
    bdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "6")
    bottom.set(qn("w:space"), "4")
    bottom.set(qn("w:color"), "C9A227")
    bdr.append(bottom)
    p_pr.append(bdr)

    footer = section.footer.paragraphs[0]
    footer.text = ""
    r = footer.add_run("Ethio-Biopharma Enterprise · EB-EMS User Guide · November 2026")
    r.font.name = BODY_FONT
    r.font.size = Pt(7.5)
    r.font.color.rgb = MUTED
    footer.add_run("\t\t")
    r = footer.add_run("Page ")
    r.font.name = BODY_FONT
    r.font.size = Pt(7.5)
    r.font.color.rgb = MUTED
    field(footer, "PAGE")


def body_doc():
    doc = Document()
    section = doc.sections[0]
    section.page_width = Cm(21)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(1.8)
    section.bottom_margin = Cm(1.8)
    section.left_margin = Cm(2.2)
    section.right_margin = Cm(2.2)
    section.different_first_page_header_footer = True
    normal = doc.styles["Normal"]
    normal.font.name = BODY_FONT
    normal.font.size = Pt(11.5)
    normal.font.color.rgb = INK
    normal.paragraph_format.line_spacing = 1.28
    normal.paragraph_format.space_after = Pt(5)
    for name, size in (("Heading 1", 22), ("Heading 2", 14), ("Heading 3", 10.5)):
        style = doc.styles[name]
        style.font.name = DISPLAY_FONT if name != "Heading 3" else BODY_FONT
        style.font.size = Pt(size)
        style.font.color.rgb = NAVY
        style.font.bold = name == "Heading 3"
    return doc


def new_body_section(doc):
    section = doc.add_section(WD_SECTION.NEW_PAGE)
    section.top_margin = Cm(1.9)
    section.bottom_margin = Cm(1.8)
    section.left_margin = Cm(2.2)
    section.right_margin = Cm(2.2)
    section.different_first_page_header_footer = False
    add_header_footer(section)
    # Restart page numbering after the cover.
    sect_pr = section._sectPr
    pg = sect_pr.find(qn("w:pgNumType"))
    if pg is None:
        pg = OxmlElement("w:pgNumType")
        sect_pr.append(pg)
    pg.set(qn("w:start"), "1")
    return section
