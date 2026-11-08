const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Starting Phase 1 Translation Seeding...");

  const translations = [
    // --- FIXING EXISTING 27 KEYS (Overwriting bad Amharic) ---
    { key: "about", en: "About", am: "ስለ እኛ" },
    { key: "products", en: "Products", am: "ምርቶች" },
    { key: "news", en: "News", am: "ዜናዎች" },
    { key: "partners", en: "Partners", am: "አጋሮች" },
    { key: "investors", en: "Investors", am: "ባለሀብቶች" },
    { key: "documents", en: "Documents", am: "ሰነዶች" },
    { key: "contact", en: "Contact", am: "አግኙን" },
    { key: "staffLogin", en: "Staff Login", am: "የሰራተኞች መግቢያ" },
    { key: "brandName", en: "Ethio-Biopharma", am: "ኢትዮ-ባዮፋርማ" },
    { key: "footerRights", en: "All rights reserved.", am: "መብቱ በህግ የተጠበቀ ነው።" },
    { key: "quickLinks", en: "Quick Links", am: "ፈጣን አገናኞች" },
    { key: "headOffice", en: "Head Office", am: "ዋና መስሪያ ቤት" },
    { key: "headOfficeAddress1", en: "Kazanchis, Bete Berhan Building, 5th floor", am: "ካዛንቺስ፣ ቤተ ብርሃን ህንፃ፣ 5ኛ ፎቅ" },
    { key: "headOfficeAddress2", en: "Addis Ababa, Ethiopia", am: "አዲስ አበባ፣ ኢትዮጵያ" },
    { key: "heroTitle1", en: "Building National Health Security", am: "የአገር አቀፍ ጤና ዋስትናን መገንባት" },
    { key: "heroSub1", en: "A strategic state-owned enterprise under Ethiopian Investment Holdings, mandated to build, scale and sustain local manufacturing of human vaccines and pharmaceuticals.", am: "በኢትዮጵያ ኢንቨስትመንት ሆልዲንግስ ስር የሚተዳደር ስትራቴጂያዊ የመንግስት ተቋም፣ የሰው ልጅ ክትባቶችን እና መድኃኒቶችን በአገር ውስጥ ለማምረት የተቋቋመ።" },
    { key: "productsCapabilities", en: "Products & Capabilities", am: "ምርቶች እና አቅሞች" },
    { key: "newsAnnouncements", en: "News & Announcements", am: "ዜናዎች እና ማስታወቂያዎች" },
    { key: "discoverMandate", en: "Discover Our Mandate", am: "ስልጣናችንን ይመልከቱ" },
    { key: "pillar1Title", en: "Infrastructure and Integrated Campus", am: "መሠረተ ልማት እና የተቀናጀ ካምፓስ" },
    { key: "pillar1Desc", en: "Establishing a fully integrated biopharmaceutical campus.", am: "ሙሉ በሙሉ የተቀናጀ የባዮፋርማሲዩቲካል ካምፓስ ማቋቋም።" },
    { key: "pillar2Title", en: "Technology Transfer & R&D", am: "ቴክኖሎጂ ሽግግር እና ምርምር" },
    { key: "pillar2Desc", en: "Absorbing international knowledge and innovating.", am: "ዓለም አቀፍ እውቀትን መቅሰም እና ፈጠራ።" },
    { key: "pillar3Title", en: "Regulatory Excellence", am: "የቁጥጥር ልቀት" },
    { key: "pillar3Desc", en: "Achieving WHO-PQ and ISO certifications.", am: "የዓለም ጤና ድርጅት ብቁነት እና ISO ማረጋገጫዎችን ማግኘት።" },
    { key: "aboutUs", en: "About Us", am: "ስለ እኛ" },
    { key: "footerDesc", en: "A strategic state-owned enterprise under EIH.", am: "በኢትዮጵያ ኢንቨስትመንት ሆልዲንግስ ስር ያለ ስትራቴጂካዊ የመንግስት ተቋም።" },

    // --- NEW PHASE 1 PUBLIC KEYS ---
    // Landing Page
    { key: "heroTitle2", en: "Innovating for a Healthier Tomorrow", am: "ለተሻለ ነገ ለመፍጠር እንሰራለን" },
    { key: "landingAboutTitle", en: "Ethiopia's platform for health sovereignty", am: "የኢትዮጵያ የጤና ሉዓላዊነት መድረክ" },
    { key: "landingAboutDesc", en: "Ethio-Biopharma was established by Council of Ministers Regulation No. 536/2023 under Ethiopian Investment Holdings. From the Kilinto industrial park we are building an integrated biopharmaceutical campus that manufactures vaccines, essential medicines and diagnostics for Ethiopia and the region.", am: "ኢትዮ-ባዮፋርማ በኢትዮጵያ ኢንቨስትመንት ሆልዲንግስ ስር በሚኒስትሮች ምክር ቤት ደንብ ቁጥር 536/2023 ተቋቁሟል። ከኪሊንቶ ኢንዱስትሪያል ፓርክ ለኢትዮጵያ እና ለአካባቢው ክትባቶችን፣ አስፈላጊ መድኃኒቶችን እና ምርመራዎችን የሚያመርት የተቀናጀ የባዮፋርማሲዩቲካል ካምፓስ እየገነባን ነው።" },
    { key: "whatWeDo", en: "What We Do", am: "ምን እንሰራለን" },
    { key: "howWeWork", en: "How We Work", am: "እንዴት እንሰራለን" },
    { key: "corporatePlans", en: "Corporate plans", am: "የኮርፖሬት እቅዶች" },
    { key: "currentPlansTitle", en: "Current plans, targets and KPIs", am: "የአሁኑ እቅዶች፣ ግቦች እና አመልካቾች" },
    { key: "keyPerformanceIndicators", en: "Key performance indicators", am: "ቁልፍ የአፈጻጸም አመልካቾች" },
    { key: "majorTargets", en: "Major targets", am: "ዋና ዋና ግቦች" },
    { key: "deliveryCompletion", en: "Delivery completion", am: "የማድረስ ማጠናቀቅ" },
    { key: "blendedFinancing", en: "Blended financing for the campus", am: "ለካምፓሱ የተቀላቀለ ፋይናንስ" },
    { key: "buildCommission", en: "Build and commission", am: "ግንባታ እና ስርዓተ-ስራ" },
    { key: "secureFinance", en: "Secure blended finance", am: "የተቀላቀለ ፋይናንስ ማረጋገጥ" },
    { key: "transferTechnology", en: "Transfer technology and certify people", am: "ቴክኖሎጂን ማስተላለፍ እና ሰዎችን ማረጋገጥ" },
    { key: "manufactureSupply", en: "Manufacture and supply", am: "ማምረት እና ማቅረብ" },
    { key: "humanVaccines", en: "Human Vaccines", am: "የሰው ክትባቶች" },
    { key: "genericMedicines", en: "Generic Medicines", am: "ጄኔሪክ መድኃኒቶች" },
    { key: "ppeSupplies", en: "PPE & Medical Supplies", am: "የግል መከላከያ እና የህክምና አቅርቦቶች" },
    { key: "diagnostics", en: "Diagnostics", am: "ምርመራዎች" },

    // About Page
    { key: "aboutPageTitle", en: "About Ethio-Biopharma", am: "ስለ ኢትዮ-ባዮፋርማ" },
    { key: "aboutPageSubtitle", en: "The Ethio-BioPharma Enterprise (EBPE) Strategic Plan for the 2026-2030 period establishes a comprehensive framework for achieving pharmaceutical and vaccine sovereignty for Ethiopia.", am: "የኢትዮ-ባዮፋርማ ኢንተርፕራይዝ (EBPE) የ2026-2030 ስትራቴጂካዊ እቅድ ለኢትዮጵያ የፋርማሲዩቲካል እና የክትባት ሉዓላዊነትን ለማምጣት አጠቃላይ ማዕቀፍ ያቋቁማል።" },
    { key: "missionVisionHeading", en: "Our Mission & Vision", am: "ተልዕኮአችን እና ራዕያችን" },
    { key: "vision2035", en: "Vision 2035", am: "ራዕይ 2035" },
    { key: "visionText", en: "To be among the leading integrated biopharmaceutical campuses in Africa, ensuring health security and pharmaceutical sovereignty for Ethiopia and the continent through self-reliant, sustainable manufacturing.", am: "በአፍሪካ ከሚገኙ መሪ የተቀናጁ የባዮፋርማሲዩቲካል ካምፓሶች አንዱ ለመሆን፣ ለኢትዮጵያ እና ለአህጉሪቱ የጤና ዋስትናን እና የፋርማሲዩቲካል ሉዓላዊነትን በራስ መተማመን እና በዘላቂ ምርት ማረጋገጥ።" },
    { key: "missionHeading", en: "Mission", am: "ተልዕኮ" },
    { key: "missionText", en: "To develop, manufacture, and deliver high-quality, affordable essential medicines, vaccines, diagnostics, and medical supplies to meet public health needs through building a self-sustaining ecosystem of manufacturing businesses.", am: "ጥራት ያላቸውን እና ተመጣጣኝ አስፈላጊ መድኃኒቶችን፣ ክትባቶችን፣ ምርመራዎችን እና የህክምና አቅርቦቶችን ለማዘጋጀት፣ ለማምረት እና ለማድረስ የህዝብ ጤና ፍላጎቶችን ለማሟላት ራሱን የቻለ የአምራች ንግዶች ስነ-ምህዳር በመገንባት።" },
    { key: "coreValues", en: "Core Values", am: "መሰረታዊ እሴቶች" },
    { key: "strategicObjectivesHeading", en: "Strategic Objectives", am: "ስትራቴጂካዊ ግቦች" },
    { key: "strategicObjectivesIntro", en: "The core of the 2026-2030 plan is defined by five Strategic Objectives (SOs).", am: "የ2026-2030 እቅድ ዋና አካል በአምስት ስትራቴጂካዊ ግቦች (SOs) ይገለጻል።" },
    { key: "governanceHeading", en: "Governance & Board", am: "አስተዳደር እና ቦርድ" },

    // Products & Partners
    { key: "productsPageTitle", en: "Products", am: "ምርቶች" },
    { key: "partnersPageTitle", en: "Partners & Stakeholders", am: "አጋሮች እና ባለድርሻ አካላት" },
    { key: "partnersPageSubtitle", en: "Collaborating with government counterparts, international health organizations, and technology transfer partners.", am: "ከመንግስት አጋሮች፣ ከዓለም አቀፍ የጤና ድርጅቶች እና ከቴክኖሎጂ ሽግግር አጋሮች ጋር በመተባበር።" },
    { key: "techTransferPartners", en: "Technology Transfer Partners", am: "የቴክኖሎጂ ሽግግር አጋሮች" },
    { key: "techTransferDesc", en: "We work closely with international manufacturers to transfer technology, ensuring domestic self-reliance in biopharmaceutical production.", am: "ከዓለም አቀፍ አምራቾች ጋር በቅርበት በመስራት ቴክኖሎጂን እናስተላልፋለን፣ ይህም በባዮፋርማሲዩቲካል ምርት ውስጥ የአገር ውስጥ ራስን መቻልን ያረጋግጣል።" },
    { key: "govMultilateral", en: "Government & Multilateral", am: "መንግስት እና ሁለገብ" },
    { key: "govMultilateralDesc", en: "EBPE engages regularly with the Ministry of Health, the Industrial Parks Development Corporation, and multilateral development partners.", am: "EBPE ከጤና ሚኒስቴር፣ ከኢንዱስትሪያል ፓርኮች ልማት ኮርፖሬሽን እና ከሁለገብ የልማት አጋሮች ጋር በመደበኛነት ይሳተፋል።" },

    // Contact & Investors
    { key: "investorsPageTitle", en: "Investor Information", am: "የባለሀብት መረጃ" },
    { key: "investorsPageSubtitle", en: "A Strategic Investment Opportunity", am: "ስትራቴጂካዊ የኢንቨስትመንት እድል" },
    { key: "contactPageTitle", en: "Contact & Inquiries", am: "ያግኙን እና ጥያቄዎች" },
    { key: "contactPageSubtitle", en: "Send us a message", am: "መልእክት ይላኩልን" },
    { key: "contactForm", en: "Contact Form", am: "የመገኛ ቅጽ" },
    { key: "fullName", en: "Full Name", am: "ሙሉ ስም" },
    { key: "emailAddress", en: "Email Address", am: "የኢሜይል አድራሻ" },
    { key: "message", en: "Message", am: "መልእክት" },
    { key: "submitInquiry", en: "Submit Inquiry", am: "ጥያቄ አስገባ" },
    { key: "messageSent", en: "Message sent.", am: "መልእክት ተልኳል።" },
    { key: "headOfficeLabel", en: "Head Office", am: "ዋና መስሪያ ቤት" },

    // News & Documents
    { key: "documentsPageTitle", en: "Documents", am: "ሰነዶች" },
    { key: "documentsNoData", en: "No documents available yet.", am: "እስካሁን ምንም ሰነዶች የሉም።" },
    { key: "newsPageTitle", en: "News & Announcements", am: "ዜናዎች እና ማስታወቂያዎች" },
    { key: "newsNoArticles", en: "No news articles published yet.", am: "እስካሁን ምንም ዜና አልታተመም።" },

    // Footer
    { key: "footerRightsLong", en: "© 2026 Ethio-Biopharma. All rights reserved.", am: "© 2026 ኢትዮ-ባዮፋርማ። መብቱ በህግ የተጠበቀ ነው።" }
  ];

  let added = 0;
  let updated = 0;

  for (const t of translations) {
    const existing = await prisma.translation.findUnique({ where: { key: t.key } });
    
    if (existing) {
      // Update existing keys to fix bad Amharic translations
      await prisma.translation.update({
        where: { key: t.key },
        data: { en: t.en, am: t.am }
      });
      updated++;
    } else {
      // Add new keys
      await prisma.translation.create({
        data: { key: t.key, en: t.en, am: t.am }
      });
      added++;
    }
  }

  console.log(`✅ Phase 1 Complete.`);
  console.log(`   - Added ${added} new translation keys.`);
  console.log(`   - Updated ${updated} existing keys (fixed encoding/accuracy).`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());