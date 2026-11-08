const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const images = await prisma.heroImage.findMany();
  const texts = await prisma.heroText.findMany();
  const settings = await prisma.appSetting.findMany();
  
  let foundGreen = false;
  
  // Helper to scan for green hexes
  const scanObj = (obj, table) => {
    const str = JSON.stringify(obj).toLowerCase();
    if (str.includes('#1e5631') || str.includes('#0d1b12') || str.includes('#2ecc71') || str.includes('green')) {
        console.log(`  [!] Found potential green hex/word in table ${table}:`);
        console.log(JSON.stringify(obj, null, 2));
        foundGreen = true;
    }
  };

  images.forEach(i => scanObj(i, 'HeroImage'));
  texts.forEach(t => scanObj(t, 'HeroText'));
  settings.forEach(s => scanObj(s, 'AppSetting'));

  if (!foundGreen) {
      console.log("  [OK] Database tables (HeroImage, HeroText, AppSetting) contain NO green hexes or 'green' words.");
  }

  // Output raw data to visually inspect for any green images
  console.log("\n--- RAW HERO IMAGE URLS ---");
  images.forEach(i => console.log(`  - ${i.url}`));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
