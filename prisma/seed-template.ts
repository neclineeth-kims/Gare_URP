/**
 * Seed the template (unitrate_main) database with schema + currencies only.
 * Run with: DATABASE_URL="file:./data/unitrate_main/unitrate.db" npx prisma db push && npx tsx prisma/seed-template.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Ensure base currency exists
  const existing = await prisma.currency.findFirst({
    where: { code: "USD" },
  });

  if (!existing) {
    await prisma.currency.create({
      data: {
        code: "USD",
        name: "US Dollar",
        symbol: "$",
        exchangeRate: 1,
        isBase: true,
      },
    });
    console.log("Template seeded: base currency (USD) added.");
  } else {
    console.log("Template already has base currency.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
