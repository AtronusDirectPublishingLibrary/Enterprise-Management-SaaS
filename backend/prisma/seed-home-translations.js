const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const dict = [
    { key: "whatWeDo", en: "What We Do", am: "ምን እንሰራለን" },
    { key: "howWeWork", en: "How We Work", am: "እንዴት እንሰራለን" },
    { key: "currentPlansTitle", en: "Current plans, targets and KPIs", am: "የአሁኑ እቅዶች፣ ግቦች እና አመልካቾች" },
    { key: "majorTargets", en: "Major targets", am: "ዋና ዋና ግቦች" },
    { key: "keyPerformanceIndicators", en: "Key performance indicators", am: "ቁልፍ የአፈጻጸም አመልካቾች" },
    { key: "deliveryCompletion", en: "Delivery completion", am: "የማድረስ ማጠናቀቅ" },
    { key: "diagnostics", en: "Diagnostics", am: "ምርመራዎች" },
    { key: "genericMedicines", en: "Generic Medicines", am: "ጄኔሪክ መድኃኒቶች" },
    { key: "ppeSupplies", en: "PPE & Medical Supplies", am: "የግል መከላከያ እና የህክምና አቅርቦቶች" },
    { key: "humanVaccines", en: "Human Vaccines", am: "የሰው ክትባቶች" },
    { key: "buildCommission", en: "Build and commission", am: "ግንባታ እና ስርዓተ-ስራ" },
    { key: "secureFinance", en: "Secure blended finance", am: "የተቀላቀለ ፋይናንስ ማረጋገጥ" },
    { key: "transferTechnology", en: "Transfer technology and certify people", am: "ቴክኖሎጂን ማስተላለፍ እና ሰዎችን ማረጋገጥ" },
    { key: "manufactureSupply", en: "Manufacture and supply", am: "ማምረት እና ማቅረብ" },
    { key: "blendedFinancing", en: "Blended financing for the campus", am: "ለካምፓሱ የተቀላቀለ ፋይናንስ" },
    { key: "corporatePlans", en: "Corporate plans", am: "የኮርፖሬት እቅዶች" },
    { key: "heroTitle1", en: "Building National Health Security", am: "የአገር አቀፍ ጤና ዋስትናን መገንባት" },
    { key: "heroSub1", en: "A strategic state-owned enterprise under Ethiopian Investment Holdings, mandated to build, scale and sustain local manufacturing of human vaccines and pharmaceuticals.", am: "በኢትዮጵያ ኢንቨስትመንት ሆልዲንግስ ስር የሚተዳደር ስትራቴጂያዊ የመንግስት ተቋም፣ የሰው ልጅ ክትባቶችን እና መድኃኒቶችን በአገር ውስጥ ለማምረት የተቋቋመ።" }
  ];

  for (const t of dict) {
    await prisma.translation.upsert({
      where: { key: t.key }, update: { en: t.en, am: t.am }, create: { key: t.key, en: t.en, am: t.am }
    });
  }
  console.log("✅ Home page translations successfully updated in database.");
}
main().catch(console.error).finally(() => prisma.$disconnect());