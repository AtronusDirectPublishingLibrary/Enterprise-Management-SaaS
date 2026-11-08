const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const dict = [
    // Hero Section
    { key: "heroTitle1", en: "Building National Health Security", am: "የአገር አቀፍ ጤና ዋስትናን መገንባት" },
    { key: "heroSub1", en: "A strategic state-owned enterprise under Ethiopian Investment Holdings, mandated to build, scale and sustain local manufacturing of human vaccines and pharmaceuticals.", am: "በኢትዮጵያ ኢንቨስትመንት ሆልዲንግስ ስር የሚተዳደር ስትራቴጂያዊ የመንግስት ተቋም፣ የሰው ልጅ ክትባቶችን እና መድኃኒቶችን በአገር ውስጥ ለማምረት የተቋቋመ።" },
    { key: "heroTagline", en: "Addis Ababa, Ethiopia", am: "አዲስ አበባ፣ ኢትዮጵያ" },
    { key: "discoverMandate", en: "Discover Our Mandate", am: "ስልጣናችንን ይመልከቱ" },
    
    // What We Do Section
    { key: "whatWeDoTitle", en: "What We Do", am: "ምን እንሰራለን" },
    { key: "whatWeDoDesc", en: "Full-spectrum biopharmaceutical manufacturing for national health security: essential medicines, vaccines, diagnostics and medical supplies made in Ethiopia.", am: "ለአገር አቀፍ ጤና ዋስትና ሙሉ ስፔክትረም የባዮፋርማሲዩቲካል ምርት፡ በኢትዮጵያ የሚመረቱ አስፈላጊ መድኃኒቶች፣ ክትባቶች፣ ምርመራዎች እና የህክምና አቅርቦቶች።" },
    
    // Products
    { key: "prod1Title", en: "Generic Medicines", am: "ጄኔሪክ መድኃኒቶች" },
    { key: "prod1Desc", en: "Tablets, capsules, oral liquids and injectables for high-demand essential medicines, manufactured to WHO-GMP standards to substitute imports.", am: "ከፍተኛ ፍላጎት ያላቸውን አስፈላጊ መድኃኒቶች ለመተካት በWHO-GMP ደረጃዎች የሚመረቱ ታብሌቶች፣ ካፕሱሎች፣ ፈሳሽ መድኃኒቶች እና መርፌዎች።" },
    { key: "prod2Title", en: "Human Vaccines", am: "የሰው ክትባቶች" },
    { key: "prod2Desc", en: "ShieldVax fill-finish and formulation capacity at Kilinto, targeting 16 million vaccine doses a year by 2030.", am: "በኪሊንቶ የሚገኘው የShieldVax ሙሌት-ማጠናቀቂያ እና ቀመር አቅም፣ እስከ 2030 በዓመት 16 ሚሊዮን የክትባት ዶዞችን ለማምረት ያለመ።" },
    { key: "prod3Title", en: "Diagnostics", am: "ምርመራዎች" },
    { key: "prod3Desc", en: "Rapid diagnostic tests for HIV, hepatitis, syphilis and typhoid, together with laboratory and quality-control support.", am: "ለኤችአይቪ፣ ለሄፓታይተስ፣ ለቂጥኝ እና ለተይፎይድ ፈጣን የምርመራ ምርመራዎች፣ ከላብራቶሪ እና ከጥራት ቁጥጥር ድጋፍ ጋር።" },
    { key: "prod4Title", en: "PPE & Medical Supplies", am: "የግል መከላከያ እና የህክምና አቅርቦቶች" },
    { key: "prod4Desc", en: "Auto-disable and reuse-prevention syringes plus medical consumables that close critical gaps in Ethiopia's health system.", am: "በኢትዮጵያ የጤና ስርዓት ውስጥ ያሉ ወሳኝ ክፍተቶችን የሚሞሉ ራስን የሚያሰናክሉ እና እንደገና ጥቅም ላይ እንዳይውሉ የሚከላከሉ መርፌዎች እና የህክምና አቅርቦቶች።" },
    
    // How We Work (Steps)
    { key: "howWeWorkTitle", en: "How We Work", am: "እንዴት እንሰራለን" },
    { key: "step1Title", en: "Secure blended finance", am: "የተቀላቀለ ፋይናንስ ማረጋገጥ" },
    { key: "step1Desc", en: "Mobilize USD 207M+ through equity, concessional loans and development partners, with quick-win units cross-subsidizing the vaccine facility.", am: "ከ207 ሚሊዮን ዶላር በላይ በፍትሃዊነት፣ በቅናሽ ብድሮች እና በልማት አጋሮች ማሰባሰብ፣ ፈጣን አሸናፊ ክፍሎች የክትባት ተቋሙን በመስቀለኛ ድጎማ ያደርጋሉ።" },
    { key: "step2Title", en: "Build and commission", am: "ግንባታ እና ስርዓተ-ስራ" },
    { key: "step2Desc", en: "Construct, validate and commission the Kilinto campus, starting with the Medicines and Diagnostics units that generate early revenue.", am: "የኪሊንቶ ካምፓስን መገንባት፣ ማረጋገጥ እና ማስጀመር፣ ቀደምት ገቢ ከሚያመነጩት የመድኃኒት እና የምርመራ ክፍሎች በመጀመር።" },
    { key: "step3Title", en: "Transfer technology and certify people", am: "ቴክኖሎጂን ማስተላለፍ እና ሰዎችን ማረጋገጥ" },
    { key: "step3Desc", en: "Partner-led technology transfer, EBPE Academy training and a WHO-GMP quality management system build lasting local capability.", am: "በአጋር የሚመራ የቴክኖሎጂ ሽግግር፣ የEBPE አካዳሚ ስልጠና እና የWHO-GMP የጥራት አስተዳደር ስርዓት ዘላቂ የአገር ውስጥ አቅም ይገነባሉ።" },
    { key: "step4Title", en: "Manufacture and supply", am: "ማምረት እና ማቅረብ" },
    { key: "step4Desc", en: "Register products with EFDA, serve EPSS and regional markets, and reinvest profits into vaccine sovereignty and R&D.", am: "ምርቶችን በEFDA መመዝገብ፣ EPSS እና የክልል ገበያዎችን ማገልገል እና ትርፍን ወደ ክትባት ሉዓላዊነት እና ምርምር እንደገና ማዋዕል።" },
    
    // Stats
    { key: "stat1Label", en: "Vaccine doses per year by 2030", am: "በ2030 በዓመት የሚመረቱ የክትባት ዶዞች" },
    { key: "stat2Label", en: "Blended financing for the campus", am: "ለካምፓሱ የተቀላቀለ ፋይናንስ" },
    { key: "stat3Label", en: "Direct jobs created by 2030", am: "በ2030 የተፈጠሩ ቀጥታ ስራዎች" },
    
    // About Landing Section
    { key: "aboutUs", en: "About Us", am: "ስለ እኛ" },
    { key: "aboutTitle", en: "Ethiopia's platform for health sovereignty", am: "የኢትዮጵያ የጤና ሉዓላዊነት መድረክ" },
    { key: "aboutDesc", en: "Ethio-Biopharma was established by Council of Ministers Regulation No. 536/2023 under Ethiopian Investment Holdings. From the Kilinto industrial park we are building an integrated biopharmaceutical campus that manufactures vaccines, essential medicines and diagnostics for Ethiopia and the region.", am: "ኢትዮ-ባዮፋርማ በኢትዮጵያ ኢንቨስትመንት ሆልዲንግስ ስር በሚኒስትሮች ምክር ቤት ደንብ ቁጥር 536/2023 ተቋቁሟል። ከኪሊንቶ ኢንዱስትሪያል ፓርክ ለኢትዮጵያ እና ለአካባቢው ክትባቶችን፣ አስፈላጊ መድኃኒቶችን እና ምርመራዎችን የሚያመርት የተቀናጀ የባዮፋርማሲዩቲካል ካምፓስ እየገነባን ነው።" }
  ];

  for (const t of dict) {
    await prisma.translation.upsert({
      where: { key: t.key }, update: { en: t.en, am: t.am }, create: { key: t.key, en: t.en, am: t.am }
    });
  }
  console.log(`✅ Added/Updated ${dict.length} Home Page translations.`);
}
main().catch(console.error).finally(() => prisma.$disconnect());