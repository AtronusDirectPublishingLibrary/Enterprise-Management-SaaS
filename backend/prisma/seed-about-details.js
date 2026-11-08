const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const translations = [
    { key: "quality", en: "Quality", am: "ጥራት" },
    { key: "qualityDesc", en: "Adherence to the highest national and international standards (WHO-GMP, ISO).", am: "ከፍተኛ ብሔራዊ እና አለም አቀፍ ደረጃዎችን (WHO-GMP, ISO) ማክበር።" },
    { key: "integrity", en: "Integrity", am: "ታማኝነት" },
    { key: "integrityDesc", en: "Operating with transparency, accountability, and ethical conduct.", am: "በግልጽነት፣ በተጠያቂነት እና በሥነ-ምግባር መርሆዎች መስራት።" },
    { key: "innovation", en: "Innovation", am: "ፈጠራ" },
    { key: "innovationDesc", en: "Embracing advanced technologies, continuous improvement, and R&D.", am: "የላቀ ቴክኖሎጂዎችን፣ ቀጣይነት ያለው መሻሻልን እና ምርምርን መቀበል።" },
    { key: "collaboration", en: "Collaboration", am: "ትብብር" },
    { key: "collaborationDesc", en: "Building strong partnerships with government and the private sector.", am: "ከመንግስት እና ከግሉ ዘርፍ ጋር ጠንካራ አጋርነትን መገንባት።" },
    { key: "sustainability", en: "Sustainability", am: "ዘላቂነት" },
    { key: "sustainabilityDesc", en: "Ensuring long-term financial, operational, and environmental viability.", am: "የረጅም ጊዜ የፋይናንስ፣ የአሰራር እና የአካባቢ ዘላቂነትን ማረጋገጥ።" },
    { key: "peopleCentricity", en: "People-Centricity", am: "በሰዎች ላይ ያተኮረ" },
    { key: "peopleCentricityDesc", en: "Investing in our workforce and improving community health.", am: "በሰራተኞቻችን ላይ ኢንቨስት ማድረግ እና የማህበረሰብ ጤናን ማሻሻል።" },
    
    { key: "so1Title", en: "SO1: Rapid Infrastructure Development", am: "SO1፡ ፈጣን የመሠረተ ልማት ልማት" },
    { key: "so1Desc", en: "Deliver and commission the Diagnostics, Generic Medicines, and PPE units within 18-24 months of groundbreaking.", am: "የምርመራ፣ የጄኔሪክ መድኃኒቶች እና የPPE ክፍሎችን ከመሠረት ጥልቀት በኋላ በ18-24 ወራት ውስጥ ማድረስ እና ማስጀመር።" },
    { key: "so2Title", en: "SO2: ShieldVax Facility Construction", am: "SO2፡ የShieldVax ተቋም ግንባታ" },
    { key: "so2Desc", en: "Complete the construction and validation of the vaccine fill-finish facility, preparing it for commercial manufacturing by 2029.", am: "የክትባት ሙሌት-ማጠናቀቂያ ተቋምን ግንባታ እና ማረጋገጫ ማጠናቀቅ፣ ለ2029 የንግድ ምርት ተዘጋጅቷል።" },
    { key: "so3Title", en: "SO3: Workforce and Capacity Building", am: "SO3፡ የሰው ኃይል እና አቅም ግንባታ" },
    { key: "so3Desc", en: "Recruit and train a workforce of over 400 staff by 2030, establishing the EBPE Workforce Development Center.", am: "እስከ 2030 ከ400 በላይ ሰራተኞችን መቅጠር እና ማሰልጠን፣ የEBPE የሰው ኃይል ልማት ማዕከልን ማቋቋም።" },
    { key: "so4Title", en: "SO4: Financial Sustainability Foundation", am: "SO4፡ የፋይናንስ ዘላቂነት መሠረት" },
    { key: "so4Desc", en: "Secure $207M+ in blended financing and activate the cross-subsidization mechanism from Quick-Win units.", am: "ከ207 ሚሊዮን ዶላር በላይ የተቀላቀለ ፋይናንስ ማረጋገጥ እና ከQuick-Win ክፍሎች የመስቀለኛ ድጎማ ዘዴን ማግበር።" },
    { key: "so5Title", en: "SO5: Regulatory and Quality Systems", am: "SO5፡ የቁጥጥር እና የጥራት ስርዓቶች" },
    { key: "so5Desc", en: "Implement WHO-GMP compliant Quality Management Systems (QMS) across all campus units.", am: "በሁሉም የካምፓስ ክፍሎች ውስጥ ከWHO-GMP ጋር የሚስማሙ የጥራት አስተዳደር ስርዓቶችን (QMS) ተግባራዊ ማድረግ።" }
  ];

  let added = 0;
  for (const t of translations) {
    const existing = await prisma.translation.findUnique({ where: { key: t.key } });
    if (!existing) {
      await prisma.translation.create({ data: t });
      added++;
    } else {
      await prisma.translation.update({ where: { key: t.key }, data: t });
    }
  }
  console.log(`✅ Added/Updated ${translations.length} detail translations.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());