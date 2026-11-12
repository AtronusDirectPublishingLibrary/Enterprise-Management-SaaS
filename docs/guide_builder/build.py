from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

from .common import body_doc, new_body_section, OUT
from .front import add_cover, add_front_matter
from .sections_a import chapter_welcome, chapter_start, chapter_roles
from .sections_b import chapter_navigation, chapter_planning, chapter_myhr
from .sections_c import chapter_hr, chapter_fleet
from .sections_d import chapter_fleet_cost, chapter_social, chapter_executive
from .sections_qms import chapter_qms
from .sections_e import (
    chapter_documents, chapter_public, chapter_security, chapter_reference,
    appendix_config, appendix_verification,
)


def monogram():
    path = Path(__file__).resolve().parent / "monogram.png"
    size = 512
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((8, 8, size - 8, size - 8), radius=72, fill="#0B2545")
    draw.rounded_rectangle((42, 42, size - 42, size - 42), radius=44, outline="#C9A227", width=8)
    font = None
    for candidate in (
        r"C:\Windows\Fonts\georgia.ttf",
        r"C:\Windows\Fonts\georgiab.ttf",
        r"C:\Windows\Fonts\DejaVuSerif.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
    ):
        if Path(candidate).exists():
            font = ImageFont.truetype(candidate, 238)
            break
    if font is None:
        font = ImageFont.load_default()
    text = "EB"
    box = draw.textbbox((0, 0), text, font=font)
    width = box[2] - box[0]
    height = box[3] - box[1]
    draw.text(((size - width) / 2, (size - height) / 2 - 34), text, font=font, fill="#C9A227")
    image.save(path)
    return path


def main():
    logo = monogram()
    doc = body_doc()
    add_cover(doc, logo)
    new_body_section(doc)
    add_front_matter(doc)

    chapter_welcome(doc)
    chapter_start(doc)
    chapter_roles(doc)
    chapter_navigation(doc)
    chapter_planning(doc)
    chapter_myhr(doc)
    chapter_hr(doc)
    chapter_fleet(doc)
    chapter_fleet_cost(doc)
    chapter_social(doc)
    chapter_executive(doc)
    chapter_qms(doc)
    chapter_documents(doc)
    chapter_public(doc)
    chapter_security(doc)
    chapter_reference(doc)
    appendix_config(doc)
    appendix_verification(doc)

    doc.core_properties.title = "Ethio-Biopharma EB-EMS User Guide"
    doc.core_properties.subject = "Enterprise Management System user guide"
    doc.core_properties.author = "Ethio-Biopharma Enterprise"
    doc.core_properties.company = "Ethio-Biopharma Enterprise"
    doc.core_properties.keywords = "EB-EMS, planning, PMS, HR, payroll, fleet, documents, EBPE"
    doc.core_properties.comments = "Version 2.0, November 2026"
    doc.save(str(OUT))
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
