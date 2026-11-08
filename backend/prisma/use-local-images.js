const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Replacing Unsplash images with local images...");

  // 1. Delete all existing hero images
  const deleted = await prisma.heroImage.deleteMany({});
  console.log(`🗑️ Deleted ${deleted.count} generic images.`);

  // 2. Insert your local images from backend/uploads/hero/
  const newImages = [
    { url: "http://localhost:5000/uploads/hero/EBPE%203D%201.png", isActive: true },
    { url: "http://localhost:5000/uploads/hero/EBPE%203D%202.png", isActive: true },
    { url: "http://localhost:5000/uploads/hero/EBPE%203D%203.png", isActive: true },
    { url: "http://localhost:5000/uploads/hero/EBPE%20Phase%20I%20construction%20in%20pregress.jpg", isActive: true }
  ];

  for (const img of newImages) {
    await prisma.heroImage.create({ data: img });
  }

  console.log(`✅ Successfully added ${newImages.length} local images to the database.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());