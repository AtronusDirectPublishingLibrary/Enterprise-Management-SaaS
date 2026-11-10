/**
 * Seeds the Language & Translations table with every public-site string.
 *
 * The public pages resolve copy by English text (tText / localiseCopy), so a
 * row keyed by `pub.<slug>` with the English sentence in `en` makes that exact
 * sentence editable in Admin → Language & Translations. Re-running is safe.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const frontend = path.join(__dirname, "../../frontend/src");

function read(file) {
  return fs.readFileSync(path.join(frontend, file), "utf8").replace(/\r\n/g, "\n");
}

function sliceObject(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`Missing ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  if (end < 0) throw new Error(`Missing end of ${startMarker}`);
  // endMarker starts with the newline before the closing `};` or `];`.
  const statement = source.slice(start, end + 3);
  const name = (startMarker.match(/const\s+(\w+)/) || [])[1];
  return Function(`"use strict"; ${statement}; return ${name};`)();
}

function collect(en, am, out) {
  if (typeof en === "string") {
    const text = en.trim();
    if (text) out.set(text, (typeof am === "string" && am.trim()) || text);
    return;
  }
  if (Array.isArray(en)) {
    en.forEach((value, index) => collect(value, Array.isArray(am) ? am[index] : undefined, out));
    return;
  }
  if (en && typeof en === "object") {
    for (const key of Object.keys(en)) collect(en[key], am && typeof am === "object" ? am[key] : undefined, out);
  }
}

const dictionary = new Map();

// Landing page: every hero, capability, roadmap, campus, plan, media, partner
// and CTA string, paired with the Amharic copy already maintained in the page.
const landing = read("pages/LandingPage.jsx");
const COPY = sliceObject(landing, "const COPY = {", "\n};\n\nconst ICONS");
collect(COPY.en, COPY.am, dictionary);

// Public header navigation.
const layout = read("layouts/PublicLayout.jsx");
const NAV = sliceObject(layout, "const NAV = [", "\n];");
NAV.forEach((item) => dictionary.set(item.en, item.am));

// Footer labels, address, credit and accessibility text.
const FOOTER = sliceObject(layout, "const FOOTER = {", "\n};\n\nconst BANNER_DISMISSED_KEY");
collect(FOOTER.en, FOOTER.am, dictionary);

// Strings rendered outside the copy objects.
const extra = {
  "Skip to content": "ወደ ዋና ይዘት ዝለል",
  "Primary": "ዋና ማውጫ",
  "Language": "ቋንቋ",
  "Close menu": "ማውጫውን ዝጋ",
  "Open menu": "ማውጫውን ክፈት",
  "Ethio-Biopharma Enterprise — home": "የኢትዮ-ባዮፋርማ ኢንተርፕራይዝ — መነሻ",
  "Designed and developed by": "በዲዛይንና ግንባታ የተዘጋጀው በ",
  "No news articles published yet.": "እስካሁን የታተመ የዜና ጽሑፍ የለም።",
  "Watch the video": "ቪዲዮውን ይመልከቱ",
  "By": "በ",
  "Collaborating with government counterparts, international health organizations, technology transfer partners and investors.":
    "ከመንግስት አካላት፣ ከዓለም አቀፍ የጤና ድርጅቶች፣ ከቴክኖሎጂ ሽግግር አጋሮችና ከባለሀብቶች ጋር በመተባበር።",
  "Research and academic partners": "የምርምርና የትምህርት አጋሮች",
  "Universities, regulatory bodies and research institutes support product development, testing and the training of the workforce that will run the campus.":
    "ዩኒቨርሲቲዎች፣ የቁጥጥር አካላትና የምርምር ተቋማት የምርት ልማትን፣ ምርመራንና ካምፓሱን የሚያስተዳድረውን የሰው ኃይል ስልጠና ይደግፋሉ።",
  "Financial reports, strategic direction, and investment opportunities with EBPE.":
    "የፋይናንስ ሪፖርቶች፣ ስትራቴጂካዊ አቅጣጫ እና ከEBPE ጋር ያሉ የኢንቨስትመንት ዕድሎች።",
  "EBPE is at an active stage of institutional build-out, advancing towards domestic self-reliance in health security. We welcome engagement with prospective investors and development finance institutions.":
    "EBPE ተቋሙን በንቃት እየገነባ ሲሆን በጤና ዋስትና ራስን በራስ ወደማስቻል እየተመራ ነው። ከባለሀብቶችና ከልማት ፋይናንስ ተቋማት ጋር መስራት እንፈልጋለን።",
  "Blended finance and co-investment for campus Phase II.":
    "ለካምፓስ ምዕራፍ II የተቀላቀለ ፋይናንስና የጋራ ኢንቨስትመንት።",
  "Technology transfer and licensing partnerships.": "የቴክኖሎጂ ሽግግርና የፈቃድ አጋርነት።",
  "Offtake and supply agreements for priority health products.":
    "ለቅድሚያ የጤና ምርቶች የግዥና የአቅርቦት ስምምነቶች።",
  "Investor resources": "የባለሀብት መረጃዎች",
  "Board papers, approved plans and financial reports are published in the document library as they are approved.":
    "የቦርድ ሰነዶች፣ የጸደቁ ዕቅዶችና የፋይናንስ ሪፖርቶች ሲጸድቁ በሰነድ መዝገቡ ይታተማሉ።",
  "Document library": "የሰነድ መዝገብ",
  "Get in touch with EBPE for general, partnership, or media inquiries.":
    "ለአጠቃላይ፣ ለአጋርነት ወይም ለሚዲያ ጥያቄዎች ከEBPE ጋር ይገናኙ።",
  "Head Office": "ዋና መስሪያ ቤት",
  "Kazanchis, Bete Berhan Building, 5th floor": "ካዛንቺስ፣ ቤተ ብርሃን ሕንፃ፣ 5ኛ ፎቅ",
  "Email:": "ኢሜይል፦",
  "Production:": "ምርት፦",
  "Kilinto Special Economic Zone": "ኪሊንቶ ልዩ ኢኮኖሚ ዞን",
  "Message sent.": "መልእክቱ ተልኳል።",
  "Title": "ርዕስ",
  "Type": "ዓይነት",
  "Date": "ቀን",
  "Action": "እርምጃ",
  "Download": "አውርድ",
  "The core of the 2026-2030 plan is defined by five Strategic Objectives (SOs).":
    "የ2026-2030 ዕቅድ ዋና ይዘት በአምስት ስትራቴጂካዊ ግቦች (SOs) ይገለጻል።",
  "Contact Us": "ያግኙን",
  "About Us": "ስለ እኛ",
  "Partners & Stakeholders": "አጋሮችና ባለድርሻ አካላት",
  "Investor Information": "የባለሀብት መረጃ",
  "Mission & Vision": "ተልዕኮና ራዕይ",
  "Board & Governance": "ቦርድና አስተዳደር",
  "Objectives": "ግቦች",
  "No documents have been published yet.": "እስካሁን የታተመ ሰነድ የለም።",
  "All rights reserved.": "መብቱ በህግ የተጠበቀ ነው።",
  "Back to top": "ወደ ላይ",
  "Follow us": "ይከተሉን",
  "Contact us": "ያግኙን",
  "Staff login": "የሰራተኛ መግቢያ",
  "Newsroom": "ዜና ማዕከል",
  "Explore": "ያስሱ",
  "Resources": "መረጃዎች",
  "Head office": "ዋና መስሪያ ቤት",
};

for (const [en, am] of Object.entries(extra)) dictionary.set(en, am);

function keyFor(english) {
  const slug = english
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90) || "text";
  const hash = crypto.createHash("sha1").update(english).digest("hex").slice(0, 6);
  return `pub.${slug}-${hash}`.slice(0, 119);
}

async function main() {
  const rows = await prisma.translation.findMany({ select: { id: true, key: true, en: true, am: true } });
  const normalise = (value) => String(value || "").replace(/\s+/g, " ").trim().toLowerCase();

  // Rows that already exist under a human key (e.g. "aboutPageTitle") win over
  // generated `pub.*` duplicates for the same English sentence.
  const humanByEnglish = new Map();
  for (const row of rows) {
    if (!row.key.startsWith("pub.")) humanByEnglish.set(normalise(row.en), row);
  }

  let removed = 0;
  for (const row of rows) {
    if (!row.key.startsWith("pub.")) continue;
    const human = humanByEnglish.get(normalise(row.en));
    if (human) {
      await prisma.translation.delete({ where: { id: row.id } });
      removed += 1;
    }
  }

  let created = 0;
  let updated = 0;
  for (const [en, am] of dictionary.entries()) {
    if (humanByEnglish.has(normalise(en))) continue;
    const key = keyFor(en);
    const existing = await prisma.translation.findUnique({ where: { key } });
    if (existing) {
      await prisma.translation.update({ where: { key }, data: { en, am } });
      updated += 1;
    } else {
      await prisma.translation.create({ data: { key, en, am } });
      created += 1;
    }
  }
  console.log(`Public translations: ${created} created, ${updated} refreshed, ${removed} duplicate(s) removed (${dictionary.size} strings).`);
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
