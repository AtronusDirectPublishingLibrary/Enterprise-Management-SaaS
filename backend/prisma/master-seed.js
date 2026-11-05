const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log("Checking DB state...");
  
  // 1. Admin
  const adminExists = await prisma.user.findUnique({ where: { username: "admin" } });
  if (!adminExists) {
    const passwordHash = await bcrypt.hash("pms2026", 12);
    await prisma.user.create({ data: { username: "admin", passwordHash, role: "admin" } });
    console.log("✅ Admin created.");
  }

  // 2. Hero Images
  const heroCount = await prisma.heroImage.count();
  if (heroCount === 0) {
    await prisma.heroImage.createMany({ data: [
      { url: "https://images.unsplash.com/photo-1574263867128-a3d5c1b1275c?q=80&w=2070&auto=format&fit=crop" },
      { url: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=2070&auto=format&fit=crop" },
      { url: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=2000&auto=format&fit=crop" }
    ]});
    console.log("✅ Hero images created.");
  }

  // 3. Translations
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
      { key: "quickLinks", en: "Quick Links", am: "\u1240\u120d\u120b\u129b \u12a0\u1308\u1295\u129b\u1275\u127d" },
      { key: "aboutUs", en: "About Us", am: "\u1235\u1208 \u12a5\u129b" },
      { key: "productsCapabilities", en: "Products & Capabilities", am: "\u121d\u122d\u1276\u127d \u12a5\u1293 \u12a0\u1265\u1208\u1275\u127d" },
      { key: "newsAnnouncements", en: "News & Announcements", am: "\u12dc\u1293\u12ce\u127d \u12a5\u1293 \u121b\u1235\u1270\u12c8\u1242\u12eb\u12ce\u127d" },
      { key: "headOffice", en: "Head Office", am: "\u12a0\u1235\u1270\u12f3\u12f0\u122d \u124d\u120d\u134d" },
      { key: "headOfficeAddress1", en: "Kazanchis, Bete Berhan Building, 5th floor", am: "\u12ab\u12dc\u1295\u127a\u1235\u1363 \u1264\u1274 \u1265\u122d\u1203\u1295 \u120d\u1245\u1363 5\u1c5a \u12d5\u12f5\u122d" },
      { key: "headOfficeAddress2", en: "Addis Ababa, Ethiopia", am: "\u12a0\u12f2\u1235 \u12a0\u1260\u1263\u1363 \u12a2\u1275\u12ee\u1335\u12eb" },
      { key: "homeCornerstoneTitle", en: "A Cornerstone for National Health Security", am: "\u1218\u1218\u122d \u1208\u1265\u1204\u122b\u12ca \u12e8\u1324\u1293 \u12f0\u1205\u1295\u1290\u1275" },
      { key: "homeCornerstoneDesc", en: "Established by Council of Ministers Regulation No. 536/2023, EBPE holds a national mandate to build, scale, and sustain local manufacturing of human vaccines, essential pharmaceuticals, diagnostics, and medical supplies.", am: "\u1265\u12a0\u130b\u1265\u12cd\u12f5 \u121a\u1295\u12a8\u122e\u127d \u12c8\u12f5\u1265\u1295 \u1265\u1241\u122d \u0536\u0533\u0536/2023 \u12e8\u1270\u1240\u1218\u1263\u1275\u1363 \u12a2\u1265\u1350 \u12e8\u12a0\u130d\u122d \u1218\u1235\u1228\u1275 \u1265\u1241\u122d \u12e8\u1206\u1295 \u1218\u12cd\u1234\u12f5\u1363 \u12a0\u12eb\u12f5\u130d \u1218\u12f0\u1200\u129b\u12ce\u127d\u1363 \u1218\u122b\u130a\u12eb\u12ce\u127d \u12a5\u1293 \u12e8\u1218\u12f5\u1235\u1293\u12ca \u12a0\u1265\u12de\u12ce\u127d \u12a0\u12f0\u130d \u1218\u122d\u1276\u127d\u1295 \u1265\u1204\u122b\u12ca \u1208\u12a0\u1308\u1295\u120b\u12ca \u1218\u122d\u1276\u127d\u1295 \u1208\u1218\u1218\u122b\u1275\u1363 \u1208\u121b\u1235\u1265\u12cd\u1275 \u12a5\u1293 \u1208\u121b\u1228\u130d\u130d\u1275 \u1265\u1204\u122b\u12ca \u1203\u130d\u12ca \u1270\u120d\u12d5\u1296 \u12a0\u1208\u12cd\u1362" },
      { key: "whatWeDoTitle", en: "What We Do", am: "\u121d\u1295 \u12a5\u1293\u12f0\u122d\u130b\u1208\u1295" },
      { key: "whatWeDoDesc", en: "Full-spectrum biopharmaceutical manufacturing and national health security.", am: "\u1218\u120d\u12a0\u12cd \u1218\u1228\u1275\u1295 \u12e8\u1218\u122d\u1276\u127d \u121d\u122d\u1275 \u12a5\u1293 \u1265\u1204\u122b\u12ca \u12e8\u1324\u1293 \u12f0\u1205\u1295\u1290\u1275\u1295 \u121b\u1208\u12cd\u12cd\u127d\u1295\u1362" },
      { key: "pillar4Title", en: "In-Vitro Diagnostics", am: "\u12a0\u12ed\u12a4\u12ed\u12a4 \u1218\u122d\u1276\u127d" },
      { key: "pillar4Desc", en: "Advanced diagnostic tools for public health.", am: "\u1208\u1215\u1265\u12cd\u132d \u1324\u1293 \u12e8\u1270\u1218\u1230\u1229 \u12e8\u1218\u122d\u1276\u127d \u1218\u1233\u122a\u12eb\u1362" },
      { key: "pillar5Title", en: "Medical Devices & Supplies", am: "\u12e8\u1205\u12ad\u121d\u1293 \u1218\u1233\u122a\u12eb\u12ce\u127d" },
      { key: "pillar5Desc", en: "Sustainable production of vital medical equipment.", am: "\u12a0\u12cd\u12f5\u130d \u12e8\u1218\u12f5\u1235\u1293\u12ca \u1218\u1233\u122a\u12eb\u12ce\u127d \u12cd\u1235\u1325 \u12ed\u1308\u1293\u120d\u1362" },
      { key: "pillar6Title", en: "Technology Transfer Partnerships", am: "\u12e8\u1270\u12ad\u1296\u120e\u1302\u1295 \u1218\u120b\u12cd\u12cd\u127d \u12a0\u130b\u122e\u127d" },
      { key: "pillar6Desc", en: "Collaboration with global manufacturers to localize production.", am: "\u1208\u12a0\u1308\u1295\u120b\u12ca \u121d\u122d\u1275\u1295 \u1208\u121b\u12ad\u1290\u1295 \u12a8\u12a0\u120d\u12d3\u1208\u12cd\u12ed \u12a0\u121d\u122b\u127a\u12ce\u127d \u130b\u122d \u1218\u1240\u122d\u1263\u1228\u1275\u1362" },
      { key: "statProjectsTitle", en: "Strategic Projects", am: "\u1235\u1275\u122b\u1274\u130a\u12ca \u1355\u122e\u1304\u12ad\u1276\u127d" },
      { key: "statPartnersTitle", en: "Global Partners", am: "\u12a0\u120d\u12d3\u1208\u12cd\u12ed \u12a0\u130b\u122e\u127d" },
      { key: "statCapacityTitle", en: "Million Doses Capacity", am: "\u121a\u120a\u12ee\u1295 \u12f0\u122d\u1233 \u12a0\u1245\u1260\u120d" },
      { key: "howWeWorkTitle", en: "How We Work", am: "\u12a5\u1295\u12f4\u1275 \u12a5\u1295\u1230\u122b\u1208\u1295" },
      { key: "howWeWorkStep1Title", en: "Discover", am: "\u121b\u1323\u1208\u1275" },
      { key: "howWeWorkStep1Desc", en: "Institutional review, mandate analysis, and feasibility.", am: "\u12a0\u1245\u1260\u120d \u130d\u121d\u130b\u122d\u1363 \u1270\u120d\u12d5\u1296 \u1245\u1293\u1294 \u12a5\u1293 \u12a0\u1308\u1295\u120d\u132d\u1295\u1362" },
      { key: "howWeWorkStep2Title", en: "Design", am: "\u1295\u12f5\u134d" },
      { key: "howWeWorkStep2Desc", en: "Facility design, technology selection, and layout.", am: "\u12e8\u124b\u1235\u1295 \u1295\u12f5\u134d\u1363 \u12e8\u1270\u12ad\u1296\u120e\u1302\u1295 \u121d\u122b\u1325 \u12a5\u1293 \u12a0\u1230\u122b\u12cd\u1362" },
      { key: "howWeWorkStep3Title", en: "Build", am: "\u1218\u1308\u1295\u1263\u1275" },
      { key: "howWeWorkStep3Desc", en: "Construction, equipment installation, and validation.", am: "\u130d\u1295\u1263\u1275\u1363 \u1218\u1233\u122a\u12eb \u1218\u1320\u1263\u1275 \u12a5\u1293 \u121b\u1208\u12ab\u1275\u1362" },
      { key: "howWeWorkStep4Title", en: "Launch", am: "\u121b\u1235\u1300\u1218\u122d" },
      { key: "howWeWorkStep4Desc", en: "Regulatory approval, trial runs, and production.", am: "\u1295\u12f5\u134d \u134d\u1240\u12f5\u1363 \u121d\u12f5\u1265 \u1235\u122a\u12eb \u12a5\u1293 \u121d\u122d\u1275\u1362" },
      { key: "howWeWorkStep5Title", en: "Support", am: "\u12f5\u130b\u134d" },
      { key: "howWeWorkStep5Desc", en: "Continuous quality assurance and capacity building.", am: "\u1270\u12c8\u12f0\u1293\u12ca \u12e8\u130d\u1323\u121d\u1290\u1275 \u121b\u1228\u130b\u1308\u130d \u12a5\u1293 \u12a0\u1245\u121d \u130d\u1295\u1263\u1275\u1362" },
      { key: "aboutSectionTitle", en: "A Sovereign Mandate for National Health", am: "\u1208\u1265\u1204\u122b\u12ca \u1324\u1293 \u12e8\u1218\u1295\u130d\u1235\u1275 \u1270\u120d\u12d5\u1296" },
      { key: "aboutSectionDesc", en: "Ethio-Biopharma Enterprise (EBPE) was established by Council of Ministers Regulation No. 536/2023 under Ethiopian Investment Holdings (EIH). We are building Africa's leading biopharmaceutical manufacturing hub.", am: "\u12a2\u1265\u1350-\u1263\u12ee\u134b\u122d\u121b \u12a2\u1295\u1270\u122d\u1338\u122b\u12ed\u12dd (\u12a2\u1265\u133e\u12a2) \u1265\u12a0\u130b\u1265\u12cd\u12f5 \u121a\u1295\u12a8\u122e\u127d \u12c8\u12f5\u1265\u1295 \u1265\u1241\u122d \u0536\u0533\u0536/2023 \u12a5\u1293 \u1260\u12a2\u1275\u12ee\u1335\u12eb \u12a5\u1295\u1268\u1235\u1275\u1218\u1295\u1275 \u1206\u120d\u12f5\u1295\u130d\u1235 \u1235\u122d \u1270\u1218\u122d\u1277\u120d\u1362 \u12a0\u1348\u122a\u12ab\u1295 \u1218\u122d\u1275 \u12e8\u1263\u12ee\u134b\u122d\u121b \u121d\u122d\u1275 \u121b\u12d5\u12f0\u122d \u12a5\u1295\u1308\u1295\u1263\u1208\u1295\u1362" },
      { key: "aboutBullet1", en: "Strategic state-owned enterprise", am: "\u1235\u1275\u122b\u1274\u130a\u12ca \u12e8\u1218\u1295\u130d\u1235\u1275 \u1218\u1228\u1275" },
      { key: "aboutBullet2", en: "Kilinto Special Economic Zone facility", am: "\u12aa\u120a\u1295\u1276 \u120d\u12e9\u12ca \u12a2\u12ae\u1296\u121a\u12ca \u12de\u1295 \u124b\u1235" },
      { key: "aboutBullet3", en: "International technology partnerships", am: "\u12a0\u120d\u12d3\u1208\u12cd\u12ed \u12e8\u1270\u12ad\u1296\u120e\u1302\u1295 \u12a0\u130b\u122e\u127d" }
    ]});
    console.log("✅ Translations created.");
  }
  console.log("✅ DB check complete!");
}
main().catch(console.error).finally(() => prisma.$disconnect());
