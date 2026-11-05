import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaults = {
  "Status": ["Not Started", "In Progress", "On Hold", "Completed", "Cancelled"],
  "Source of Funds": ["Treasury", "Competitive Grants", "Grand Challenges Eth.", "Other"],
  "Priority": ["Low", "Medium", "High", "Critical"],
  "Project Category": ["Basic Biomedical Science", "Preclinical", "Clinical Trial", "Translational", "Public Health", "Other Specify"]
};

async function main() {
  for (const [category, values] of Object.entries(defaults)) {
    for (const value of values) {
      await prisma.dropdownOption.upsert({
        where: { category_value: { category, value } },
        update: {},
        create: { category, value }
      });
    }
  }
  console.log("Seeded dropdown options.");
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());