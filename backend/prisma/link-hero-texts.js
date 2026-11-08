const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Linking Hero Texts to Hero Images...");

  // Get all images and texts from the DB
  const images = await prisma.heroImage.findMany();
  const texts = await prisma.heroText.findMany();

  if (images.length === 0 || texts.length === 0) {
    console.log("❌ Missing images or texts in the database!");
    return;
  }

  // Loop through the texts and assign an image to each
  for (let i = 0; i < texts.length; i++) {
    // Pick an image (loops back to the start if there are more texts than images)
    const imageUrl = images[i % images.length].url;

    await prisma.heroText.update({
      where: { id: texts[i].id },
      data: { imageUrl: imageUrl }
    });
    console.log(`✅ Linked text "${texts[i].title}" to image ${i + 1}`);
  }

  console.log("🎉 All texts successfully linked to images.");
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());