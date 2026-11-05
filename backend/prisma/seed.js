const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log("Ensuring DB is seeded...");
  
  const passwordHash = await bcrypt.hash("pms2026", 12);
  await prisma.user.upsert({
    where: { username: "admin" },
    update: { passwordHash },
    create: { username: "admin", passwordHash, role: "admin" }
  });

  const heroCount = await prisma.heroImage.count();
  if (heroCount === 0) {
    await prisma.heroImage.createMany({ data: [
      { url: "https://images.unsplash.com/photo-1574263867128-a3d5c1b1275c?q=80&w=2070&auto=format&fit=crop" },
      { url: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=2070&auto=format&fit=crop" },
      { url: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=2000&auto=format&fit=crop" }
    ]});
  }

  const textCount = await prisma.heroText.count();
  if (textCount === 0) {
    await prisma.heroText.createMany({ data: [
      { title: "Building National Health Security", subtitle: "A strategic state-owned enterprise under EIH." },
      { title: "Innovating for a Healthier Tomorrow", subtitle: "Shifting reliance away from global supply chains." },
      { title: "Global Partnerships for Local Impact", subtitle: "Advancing product and technology partnerships." }
    ]});
  }

  const transCount = await prisma.translation.count();
  if (transCount === 0) {
    await prisma.translation.createMany({ data: [
      { key: "brandName", en: "Ethio-Biopharma", am: "\u12a2\u1275\u12ee-\u1263\u12ee\u134b\u122d\u121b" },
      { key: "footerDesc", en: "A strategic state-owned enterprise under EIH.", am: "\u1260\u12a2\u1275\u12ee\u1335\u12eb \u12a5\u1295\u1268\u1235\u1275\u1218\u1295\u1275 \u1206\u120d\u12f5\u1295\u130d\u1235 \u1235\u122d \u12e8\u1218\u1295\u130d\u1235\u1275 \u1235\u1275\u122b\u1274\u130a\u12ca \u12e8\u1218\u1228\u1275 \u1218\u1235\u1228\u1275\u1362" },
      { key: "about", en: "About", am: "\u1235\u1208 \u12a5\u129b" },
      { key: "products", en: "Products", am: "\u121d\u122d\u1276\u127d" },
      { key: "news", en: "News", am: "\u12dc\u1293\u12ce\u127d" },
      { key: "partners", en: "Partners", am: "\u12a0\u130b\u122e\u127d" },
      { key: "investors", en: "Investors", am: "\u1263\u1208\u1200\u1265\u1276\u127d" },
      { key: "documents", en: "Documents", am: "\u1230\u1290\u12f6\u127d" },
      { key: "contact", en: "Contact", am: "\u12a0\u130d\u1299\u1295" },
      { key: "staffLogin", en: "Staff Login", am: "\u12e8\u1230\u122b\u1270\u129e\u127d \u1218\u130d\u1262\u12eb" },
      { key: "footerRights", en: "All rights reserved.", am: "\u1218\u1265\u1271 \u1260\u1205\u130d \u12e8\u1270\u1320\u1260\u1240 \u1290\u12cd\u1362" },
      { key: "heroTitle1", en: "Building National Health Security", am: "\u1265\u1204\u122b\u12ca \u12e8\u1324\u1293 \u12f0\u1205\u1295\u1290\u1275\u1295 \u1218\u1308\u1295\u1263\u1275" },
      { key: "heroSub1", en: "A strategic state-owned enterprise under EIH.", am: "\u1265\u1204\u122b\u12ca \u12e8\u1324\u1293 \u12f0\u1205\u1295\u1290\u1275 \u12a5\u1295\u12f0\u1275\u12cb\u12ca \u12e8\u1218\u1295\u130d\u1235\u1275 \u12e8\u1218\u1228\u1275 \u1218\u1235\u1228\u1275\u1362" },
      { key: "discoverMandate", en: "Discover Our Mandate", am: "\u1270\u120d\u12d5\u1296\u12a0\u127d\u1295 \u12ed\u1218\u120d\u12a8\u1271" },
      { key: "pillar1Title", en: "Strategic State Mandate", am: "\u1235\u1275\u122b\u1274\u130a\u12ca \u12e8\u1218\u1295\u130d\u1235\u1275 \u1270\u120d\u12d5\u1296" },
      { key: "pillar1Desc", en: "A strategic state-owned enterprise under EIH.", am: "\u1260\u12a2\u1275\u12ee\u1335\u12eb \u12a5\u1295\u1268\u1235\u1275\u1218\u1295\u1275 \u1206\u120d\u12f5\u1295\u130d\u1235 \u1235\u122d \u12e8\u1218\u1295\u130d\u1235\u1275 \u1235\u1275\u122b\u1274\u130a\u12ca \u12e8\u1218\u1228\u1275 \u1218\u1235\u1228\u1275\u1362" },
      { key: "pillar2Title", en: "Kilinto Special Economic Zone", am: "\u12aa\u120a\u1295\u1276 \u120d\u12e9\u12ca \u12a2\u12ae\u1296\u121a\u12ca \u12de\u1295" },
      { key: "pillar2Desc", en: "Production facilities located at the Kilinto Special Economic Zone.", am: "\u1218\u122d\u1276\u127d \u1218\u1228\u1275 \u1260\u12a0\u12f2\u1235 \u12a0\u1260\u1263 \u12aa\u120a\u1295\u1276 \u120d\u12e9\u12ca \u12a2\u12ae\u1296\u121a\u12ca \u12de\u1295 \u12cd\u1235\u1325 \u12ed\u1308\u1293\u120d\u1362" },
      { key: "pillar3Title", en: "Global Partnerships", am: "\u12a0\u120d\u12d3\u1208\u12cd\u12ed \u12a0\u130b\u122e\u127d" },
      { key: "pillar3Desc", en: "Advancing product and technology partnerships.", am: "\u12a8\u12a0\u120d\u12d3\u1208\u12cd\u12ed \u12a0\u121d\u122b\u127a\u12ce\u127d \u130b\u122d \u1218\u122d\u1276\u127d\u1295 \u12a5\u1293 \u1270\u12ad\u1296\u120e\u1302\u1295 \u1235\u122d\u1275\u1295 \u1218\u12f0\u130d\u121b\u1275\u1362" },
      { key: "quickLinks", en: "Quick Links", am: "\u1240\u120d\u120b\u129b \u12a0\u1308\u1295\u129b\u1275\u127d" },
      { key: "aboutUs", en: "About Us", am: "\u1235\u1208 \u12a5\u129b" },
      { key: "productsCapabilities", en: "Products & Capabilities", am: "\u121d\u122d\u1276\u127d \u12a5\u1293 \u12a0\u1265\u1208\u1275\u127d" },
      { key: "newsAnnouncements", en: "News & Announcements", am: "\u12dc\u1293\u12ce\u127d \u12a5\u1293 \u121b\u1235\u1270\u12c8\u1242\u12eb\u12ce\u127d" },
      { key: "headOffice", en: "Head Office", am: "\u12a0\u1235\u1270\u12f3\u12f0\u122d \u124d\u120d\u134d" },
      { key: "headOfficeAddress1", en: "Kazanchis, Bete Berhan Building, 5th floor", am: "\u12ab\u12dc\u1295\u127a\u1235\u1363 \u1264\u1274 \u1265\u122d\u1203\u1295 \u120d\u1245\u1363 5\u1c5a \u12d5\u12f5\u122d" },
      { key: "headOfficeAddress2", en: "Addis Ababa, Ethiopia", am: "\u12a0\u12f2\u1235 \u12a0\u1260\u1263\u1363 \u12a2\u1275\u12ee\u1335\u12eb" }
    ]});
  }
  console.log("✅ DB seeded!");
}
main().catch(console.error).finally(() => prisma.$disconnect());
