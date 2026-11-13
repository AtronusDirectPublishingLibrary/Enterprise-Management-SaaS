import "dotenv/config";
import fs from "fs";
import path from "path";
import { prisma } from "../src/lib/prisma";

const root = path.resolve(process.cwd(), "uploads");

function legacyName(url: string | null | undefined) {
  const match = /^\/uploads\/([^/]+)$/.exec(url || "");
  return match?.[1] || null;
}

function moveToFolder(url: string, folder: string) {
  const name = legacyName(url);
  if (!name) return null;
  const source = path.join(root, name);
  if (!fs.existsSync(source)) return null;
  const destinationDir = path.join(root, folder);
  fs.mkdirSync(destinationDir, { recursive: true });
  let destination = path.join(destinationDir, name);
  if (fs.existsSync(destination)) {
    destination = path.join(destinationDir, `${Date.now()}-${name}`);
  }
  fs.renameSync(source, destination);
  return `/uploads/${folder}/${path.basename(destination)}`;
}

async function main() {
  let documents = 0;
  let qms = 0;
  let news = 0;

  for (const doc of await prisma.document.findMany({ select: { id: true, fileUrl: true } })) {
    if (!legacyName(doc.fileUrl)) continue;
    const next = moveToFolder(doc.fileUrl!, "documents");
    if (!next) {
      console.warn(`[files] missing archive file for document ${doc.id}: ${doc.fileUrl}`);
      continue;
    }
    await prisma.document.update({ where: { id: doc.id }, data: { fileUrl: next } });
    documents += 1;
  }

  for (const doc of await prisma.qmsDocument.findMany({ select: { id: true, fileUrl: true } })) {
    if (!legacyName(doc.fileUrl)) continue;
    const next = moveToFolder(doc.fileUrl!, "qms");
    if (!next) {
      console.warn(`[files] missing QMS file for document ${doc.id}: ${doc.fileUrl}`);
      continue;
    }
    await prisma.qmsDocument.update({ where: { id: doc.id }, data: { fileUrl: next } });
    qms += 1;
  }

  for (const item of await prisma.news.findMany({ select: { id: true, imageUrl: true } })) {
    if (!legacyName(item.imageUrl)) continue;
    const next = moveToFolder(item.imageUrl!, "news");
    if (!next) {
      console.warn(`[files] missing news image for ${item.id}: ${item.imageUrl}`);
      continue;
    }
    await prisma.news.update({ where: { id: item.id }, data: { imageUrl: next } });
    news += 1;
  }

  console.log(JSON.stringify({ documents, qms, news }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
