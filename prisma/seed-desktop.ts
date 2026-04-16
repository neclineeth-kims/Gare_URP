/**
 * Desktop seed — idempotent initialisation for offline SQLite mode.
 * Only creates the base Currency record if it doesn't already exist.
 * Does NOT delete any existing project data.
 *
 * Run via: npm run desktop:setup
 */

import { config } from "dotenv";
config({ path: ".env.desktop" });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.currency.findFirst({ where: { isBase: true } });
  if (existing) {
    console.log(`Base currency already exists: ${existing.code} (${existing.name})`);
    return;
  }

  const currency = await prisma.currency.create({
    data: {
      code: "LOCAL",
      name: "Local Currency",
      symbol: "L",
      exchangeRate: 1,
      isBase: true,
    },
  });

  console.log(`Created base currency: ${currency.code} (${currency.name}) — id: ${currency.id}`);
  console.log("Desktop database is ready. You can now create projects.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
