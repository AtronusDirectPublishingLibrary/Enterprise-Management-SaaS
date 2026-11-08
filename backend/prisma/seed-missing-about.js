const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const dict = [
    // Foundation
    { key: "foundationHeading", en: "Our Foundation & Mandate", am: "መሠረታችን እና ተልዕኮአችን" },
    { key: "instMandateHeading", en: "Institutional Mandate", am: "የተቋሙ ተልዕኮ" },
    { key: "instMandateDesc", en: "EBPE serves as the primary vehicle for transforming Ethiopia from an import-dependent nation into a regional biopharmaceutical manufacturing hub—addressing the vulnerabilities exposed by the global COVID-19 pandemic.", am: "EBPE ኢትዮጵያን ከአስመጪ ጥገኛ ሀገር ወደ አካባቢያዊ የባዮፋርማሲዩቲካል ማምረቻ ማዕከል ለመቀየር ዋና መንገድ ሆኖ ያገለግላል - በአለም አቀፍ የኮቪድ-19 ወረርሽኝ የተጋለጡ ተጋላጭነቶችን መፍታት።" },
    { key: "campusHeading", en: "The Integrated Campus", am: "የተቀናጀ ካምፓስ" },
    { key: "campusDesc", en: "Located in Kilinto Industrial Park, the campus co-locates multiple synergistic business units including human vaccine production (ShieldVax), generic medicines, diagnostics, and PPE manufacturing.", am: "በኪሊንቶ ኢንዱስትሪያል ፓርክ የሚገኝ ሲሆን ካምፓሱ የሰው ልጅ ክትባት ማምረቻ (ShieldVax)፣ ጄኔሪክ መድኃኒቶች፣ ምርመራዎች እና የPPE ማምረቻን ጨምሮ በርካታ ተጓዳኝ የንግድ ክፍሎችን አንድ ላይ ያስቀምጣል።" },
    { key: "crossSubHeading", en: "Cross-Subsidization Model", am: "የመስቀለኛ ድጎማ ሞዴል" },
    { key: "crossSubDesc", en: "A tiered launch strategy. The \"Quick-Win\" units (PPE, Diagnostics, and Medicines) are engineered for rapid commissioning and early revenue generation. Profits are reinvested into ShieldVax vaccine facility CAPEX.", am: "ደረጃ በደረጃ የማስጀመሪያ ስትራቴጂ። \"Quick-Win\" ክፍሎች (PPE፣ ምርመራዎች እና መድኃኒቶች) ለፈጣን ስርዓተ-ስራ እና ቀደምት የገቢ ማመንጨት የተነደፉ ናቸው። ትርፍ ወደ ShieldVax የክትባት ተቋም CAPEX እንደገና ይውላል።" },
    { key: "natHealthHeading", en: "National Health Security", am: "የአገር አቀፍ ጤና ዋስትና" },
    { key: "natHealthDesc", en: "By establishing a fully integrated biopharmaceutical campus, EBPE aims to transform Ethiopia into a self-reliant producer and a leading exporter within the African Continental Free Trade Area (AfCFTA).", am: "ሙሉ በሙሉ የተቀናጀ የባዮፋርማሲዩቲካል ካምፓስ በማቋቋም EBPE ኢትዮጵያን በአፍሪካ አህጉራዊ ነፃ የንግድ ቀጠና (AfCFTA) ውስጥ ራሱን የቻለ አምራች እና ግንባር ቀደም ላኪ ለማድረግ ያለመ።" },
    
    // Governance
    { key: "eihDesc", en: "As Ethiopia's sovereign wealth fund and EBPE's parent organization, EIH provides high-level strategic oversight. EIH functions as an active owner, enforcing modern corporate governance standards and evaluating enterprise performance against both commercial and national benchmarks.", am: "የኢትዮጵያ ሉዓላዊ የሀብት ፈንድ እና የEBPE የላይኛው ድርጅት እንደመሆኑ መጠን EIH ከፍተኛ ስትራቴጂካዊ ቁጥጥር ይሰጣል። EIH እንደ ንቁ ባለቤት በመስራት ዘመናዊ የኮርፖሬት አስተዳደር ደረጃዎችን ያስፈጽማል እና የድርጅቱን አፈጻጸም ከንግድ እና ከብሔራዊ መለኪያዎች ጋር ያመዛዝናል።" },
    { key: "boardDesc", en: "The Board serves as the primary governing body of EBPE, reporting directly to EIH. It provides strategic guidance on the enterprise's roadmap and commercial trajectory while ensuring accountability through adherence to national and international quality standards.", am: "ቦርዱ የEBPE ዋና የአስተዳደር አካል ሆኖ ያገለግላል፣ በቀጥታ ለEIH ሪፖርት ያደርጋል። በድርጅቱ ፍኖተ ካርታ እና የንግድ አቅጣጫ ላይ ስትራቴጂካዊ መመሪያ ይሰጣል እና ብሔራዊ እና አለም አቀፍ የጥራት ደረጃዎችን በማክበር ተጠያቂነትን ያረጋግጣል።" },
    { key: "ebpeDesc", en: "The Enterprise Office functions as the corporate holding entity, delivering centralized leadership and shared services across the integrated campus. It sets the overall strategic direction and financial policy for the group.", am: "የድርጅቱ ቢሮ እንደ የኮርፖሬት ይዞታ አካል ሆኖ ያገለግላል፣ በተቀናጀ ካምፓስ ውስጥ ማእከላዊ አመራር እና የጋራ አገልግሎቶችን ያቀርባል። ለቡድኑ አጠቃላይ ስትራቴጂካዊ አቅጣጫ እና የፋይናንስ ፖሊሲ ያወጣል።" },

    // Business Units
    { key: "buShieldVax", en: "ShieldVax Unit (Vaccine Production)", am: "ShieldVax ክፍል (የክትባት ምርት)" },
    { key: "buMedicines", en: "Medicines and Input Production Unit", am: "የመድኃኒት እና ግብዓት ምርት ክፍል" },
    { key: "buDiagnostics", en: "Diagnostic, PPE and Medical Supplies Unit", am: "የምርመራ፣ የPPE እና የህክምና አቅርቦት ክፍል" },
    { key: "buTraining", en: "Training & Capacity Building Unit", am: "የስልጠና እና የአቅም ግንባታ ክፍል" }
  ];

  for (const t of dict) {
    await prisma.translation.upsert({
      where: { key: t.key }, update: { en: t.en, am: t.am }, create: { key: t.key, en: t.en, am: t.am }
    });
  }
  console.log("✅ Added missing Foundation and Governance translations.");
}
main().catch(console.error).finally(() => prisma.$disconnect());