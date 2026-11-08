const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const dict = [
    { key: "Building National Health Security", en: "Building National Health Security", am: "የአገር አቀፍ ጤና ዋስትናን መገንባት" },
    { key: "A strategic state-owned enterprise under Ethiopian Investment Holdings, mandated to build, scale and sustain local manufacturing of human vaccines and pharmaceuticals.", en: "A strategic state-owned enterprise under Ethiopian Investment Holdings, mandated to build, scale and sustain local manufacturing of human vaccines and pharmaceuticals.", am: "በኢትዮጵያ ኢንቨስትመንት ሆልዲንግስ ስር የሚተዳደር ስትራቴጂያዊ የመንግስት ተቋም፣ የሰው ልጅ ክትባቶችን እና መድኃኒቶችን በአገር ውስጥ ለማምረት የተቋቋመ።" },
    { key: "Addis Ababa, Ethiopia", en: "Addis Ababa, Ethiopia", am: "አዲስ አበባ፣ ኢትዮጵያ" },
    { key: "Discover Our Mandate", en: "Discover Our Mandate", am: "ስልጣናችንን ይመልከቱ" },
    
    // Add the other database texts just in case they rotate in
    { key: "Innovating for a Healthier Tomorrow", en: "Innovating for a Healthier Tomorrow", am: "ለተሻለ ነገ ለመፍጠር እንሰራለን" },
    { key: "Establishing a fully integrated, end-to-end pharmaceutical and vaccine manufacturing campus in Ethiopia to achieve self-reliance by 2035.", en: "Establishing a fully integrated, end-to-end pharmaceutical and vaccine manufacturing campus in Ethiopia to achieve self-reliance by 2035.", am: "እስከ 2035 ራስን ለመቻል በኢትዮጵያ ሙሉ በሙሉ የተቀናጀ የፋርማሲዩቲካል እና የክትባት ማምረቻ ካምፓስ ማቋቋም።" },
    { key: "Vision 2035", en: "Vision 2035", am: "ራዕይ 2035" },
    { key: "Read Our Strategic Plan", en: "Read Our Strategic Plan", am: "ስትራቴጂካዊ እቅዳችንን ያንብቡ" },
    
    { key: "Global Partnerships for Local Impact", en: "Global Partnerships for Local Impact", am: "ለአገር ውስጥ ተጽእኖ ዓለም አቀፍ አጋርነቶች" },
    { key: "Leveraging quick-win business units for early cash flow and cross-subsidization, while embedding digitalization and AI into our manufacturing operations.", en: "Leveraging quick-win business units for early cash flow and cross-subsidization, while embedding digitalization and AI into our manufacturing operations.", am: "ለቀደምት የገንዘብ ፍሰት እና የመስቀለኛ ድጎማ ፈጣን አሸናፊ የንግድ ክፍሎችን መጠቀም፣ በአምራች ስራዎቻችን ውስጥ ዲጂታላይዜሽን እና AI ን ማካተት።" },
    { key: "Integrated Campus Model", en: "Integrated Campus Model", am: "የተቀናጀ ካምፓስ ሞዴል" },
    { key: "Explore Our Objectives", en: "Explore Our Objectives", am: "ግቦቻችንን ያስሱ" },

    { key: "A Strategic Investment Opportunity", en: "A Strategic Investment Opportunity", am: "ስትራቴጂካዊ የኢንቨስትመንት እድል" },
    { key: "Securing USD 207M+ in blended financing to commission the ShieldVax facility and deliver 16 million vaccine doses annually by 2030.", en: "Securing USD 207M+ in blended financing to commission the ShieldVax facility and deliver 16 million vaccine doses annually by 2030.", am: "የShieldVax ተቋምን ለማስጀመር እና እስከ 2030 በዓመት 16 ሚሊዮን የክትባት ዶዞችን ለማድረስ ከ207 ሚሊዮን ዶላር በላይ የተቀላቀለ ፋይናንስ ማረጋገጥ።" },
    { key: "Pharmaceutical Sovereignty", en: "Pharmaceutical Sovereignty", am: "የፋርማሲዩቲካል ሉዓላዊነት" },
    { key: "Partner With Us", en: "Partner With Us", am: "ከእኛ ጋር ይተባበሩ" }
  ];

  for (const t of dict) {
    await prisma.translation.upsert({
      where: { key: t.key }, update: { en: t.en, am: t.am }, create: { key: t.key, en: t.en, am: t.am }
    });
  }
  console.log(`✅ Added/Updated ${dict.length} Hero slide sentences in the database dictionary.`);
}
main().catch(console.error).finally(() => prisma.$disconnect());