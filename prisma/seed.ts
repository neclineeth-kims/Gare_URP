/**
 * Seed file - ALL test data from SPEC.md Section 10.1
 * Single source of truth for validation.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clear existing data (in reverse dependency order)
  await prisma.boqAnalysis.deleteMany();
  await prisma.boqItem.deleteMany();
  await prisma.analysisResource.deleteMany();
  await prisma.analysis.deleteMany();
  await prisma.equipmentResource.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.material.deleteMany();
  await prisma.labor.deleteMany();
  await prisma.project.deleteMany();
  await prisma.currency.deleteMany();

  // 1. Currency
  const currency = await prisma.currency.create({
    data: {
      code: "USD",
      name: "US Dollar",
      symbol: "$",
      exchangeRate: 1,
      isBase: true,
    },
  });

  // 2. Project
  const project = await prisma.project.create({
    data: {
      name: "Test Project Alpha",
      description: "Validation project",
      status: "active",
      currencyId: currency.id,
    },
  });

  // 2b. Project currencies (5 slots)
  await prisma.projectCurrency.createMany({
    data: [
      { projectId: project.id, slot: 1, code: "USD", name: "US Dollar", multiplier: 1 },
      { projectId: project.id, slot: 2, code: "CUR2", name: "Currency 2", multiplier: 1 },
      { projectId: project.id, slot: 3, code: "CUR3", name: "Currency 3", multiplier: 1 },
      { projectId: project.id, slot: 4, code: "CUR4", name: "Currency 4", multiplier: 1 },
      { projectId: project.id, slot: 5, code: "CUR5", name: "Currency 5", multiplier: 1 },
    ],
  });

  // 3. Labor
  const labor1001 = await prisma.labor.create({
    data: {
      projectId: project.id,
      code: "1001",
      name: "Unskilled Laborer",
      unit: "hr",
      rate: 6,
    },
  });
  const labor1002 = await prisma.labor.create({
    data: {
      projectId: project.id,
      code: "1002",
      name: "Semi-skilled Laborer",
      unit: "hr",
      rate: 8,
    },
  });
  const labor1003 = await prisma.labor.create({
    data: {
      projectId: project.id,
      code: "1003",
      name: "Skilled Laborer",
      unit: "hr",
      rate: 10,
    },
  });

  // 4. Materials
  const material2001 = await prisma.material.create({
    data: {
      projectId: project.id,
      code: "2001",
      name: "Diesel",
      unit: "lt",
      rate: 4.55,
    },
  });
  const material2002 = await prisma.material.create({
    data: {
      projectId: project.id,
      code: "2002",
      name: "Benzine",
      unit: "lt",
      rate: 5,
    },
  });
  const material2003 = await prisma.material.create({
    data: {
      projectId: project.id,
      code: "2003",
      name: "Cement",
      unit: "ton",
      rate: 100,
    },
  });

  // 5. Equipment with sub-resources
  const equipment6001 = await prisma.equipment.create({
    data: {
      projectId: project.id,
      code: "6001",
      name: "Bulldozer",
      unit: "hr",
      totalValue: 500000,
      depreciationTotal: 20000,
    },
  });
  await prisma.equipmentResource.createMany({
    data: [
      {
        equipmentId: equipment6001.id,
        resourceType: "labor",
        laborId: labor1003.id,
        materialId: null,
        quantity: 1,
      },
      {
        equipmentId: equipment6001.id,
        resourceType: "material",
        laborId: null,
        materialId: material2001.id,
        quantity: 40,
      },
    ],
  });

  const equipment6002 = await prisma.equipment.create({
    data: {
      projectId: project.id,
      code: "6002",
      name: "Roller",
      unit: "hr",
      totalValue: 250000,
      depreciationTotal: 25000,
    },
  });
  await prisma.equipmentResource.createMany({
    data: [
      {
        equipmentId: equipment6002.id,
        resourceType: "labor",
        laborId: labor1003.id,
        materialId: null,
        quantity: 1,
      },
      {
        equipmentId: equipment6002.id,
        resourceType: "material",
        laborId: null,
        materialId: material2001.id,
        quantity: 20,
      },
    ],
  });

  // 6. Analysis with resources
  const analysis7001 = await prisma.analysis.create({
    data: {
      projectId: project.id,
      code: "7001",
      name: "Excavation",
      unit: "cum",
      baseQuantity: 1000,
    },
  });
  await prisma.analysisResource.createMany({
    data: [
      {
        analysisId: analysis7001.id,
        resourceType: "labor",
        laborId: labor1002.id,
        materialId: null,
        equipmentId: null,
        quantity: 2,
      },
      {
        analysisId: analysis7001.id,
        resourceType: "equipment",
        laborId: null,
        materialId: null,
        equipmentId: equipment6001.id,
        quantity: 10,
      },
    ],
  });

  const analysis7002 = await prisma.analysis.create({
    data: {
      projectId: project.id,
      code: "7002",
      name: "Soft Excavation",
      unit: "cum",
      baseQuantity: 10000,
    },
  });
  await prisma.analysisResource.createMany({
    data: [
      {
        analysisId: analysis7002.id,
        resourceType: "labor",
        laborId: labor1003.id,
        materialId: null,
        equipmentId: null,
        quantity: 20,
      },
      {
        analysisId: analysis7002.id,
        resourceType: "equipment",
        laborId: null,
        materialId: null,
        equipmentId: equipment6002.id,
        quantity: 200,
      },
      {
        analysisId: analysis7002.id,
        resourceType: "material",
        laborId: null,
        materialId: material2003.id,
        equipmentId: null,
        quantity: 100,
      },
    ],
  });

  // 7. BoQ Items with analysis composition
  const boqItem9001 = await prisma.boqItem.create({
    data: {
      projectId: project.id,
      code: "9001",
      name: "Excavation in Bulk",
      unit: "cum",
      quantity: 1000000,
    },
  });
  await prisma.boqAnalysis.createMany({
    data: [
      {
        boqItemId: boqItem9001.id,
        analysisId: analysis7001.id,
        coefficient: 0.5,
      },
      {
        boqItemId: boqItem9001.id,
        analysisId: analysis7002.id,
        coefficient: 0.5,
      },
    ],
  });

  // Second BoQ item: single analysis (7001 only)
  const boqItem9002 = await prisma.boqItem.create({
    data: {
      projectId: project.id,
      code: "9002",
      name: "Excavation - Standard Only",
      unit: "cum",
      quantity: 50000,
    },
  });
  await prisma.boqAnalysis.create({
    data: {
      boqItemId: boqItem9002.id,
      analysisId: analysis7001.id,
      coefficient: 1,
    },
  });

  console.log("Seed completed successfully!");
  console.log("Project:", project.name, "ID:", project.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
