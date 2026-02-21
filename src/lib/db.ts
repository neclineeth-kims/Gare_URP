import { PrismaClient, Prisma } from "@prisma/client";

export { getPrismaForProject } from "./projects";
import { Decimal } from "@prisma/client/runtime/library";
import { computeEquipmentCosts, computeAnalysisCosts, computeBoqCosts } from "./calculations";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Equipment helper types
export type EquipmentWithCosts = Prisma.EquipmentGetPayload<{
  include: {
    subResources: {
      include: {
        labor: true;
        material: true;
      };
    };
  };
}> & {
  costs: {
    edc: number;
    edp: number;
    etc: number;
  };
};

export type SubResourceInput = {
  resourceId: string;
  quantity: number;
  rate?: number; // Optional, can be fetched from resource if not provided
};

export type CreateEquipmentInput = {
  code: string;
  name: string;
  unit: string;
  totalValue: number;
  depreciationTotal: number;
  laborSubResources?: SubResourceInput[];
  materialSubResources?: SubResourceInput[];
};

export type UpdateEquipmentInput = {
  code?: string;
  name?: string;
  unit?: string;
  totalValue?: number;
  depreciationTotal?: number;
  laborSubResources?: SubResourceInput[];
  materialSubResources?: SubResourceInput[];
};

/**
 * Get equipment list with search and sort support
 */
export async function getEquipmentList(
  prisma: PrismaClient,
  projectId: string,
  options?: {
    search?: string;
    sort?: "code" | "name";
  }
): Promise<EquipmentWithCosts[]> {
  const where: Prisma.EquipmentWhereInput = { projectId };

  const orderBy: Prisma.EquipmentOrderByWithRelationInput =
    options?.sort === "name" ? { name: "asc" } : { code: "asc" };

  let equipment = await prisma.equipment.findMany({
    where,
    include: {
      subResources: {
        include: {
          labor: true,
          material: true,
        },
      },
    },
    orderBy,
  });

  // Case-insensitive search filter (SQLite doesn't support case-insensitive mode in Prisma)
  if (options?.search) {
    const searchLower = options.search.toLowerCase();
    equipment = equipment.filter(
      (eq) =>
        eq.code.toLowerCase().includes(searchLower) ||
        eq.name.toLowerCase().includes(searchLower)
    );
  }

  return equipment.map((eq) => {
    const costs = computeEquipmentCosts(
      eq.totalValue,
      eq.depreciationTotal,
      eq.subResources
    );
    return {
      ...eq,
      costs,
    };
  });
}

/**
 * Get equipment by ID with computed costs
 */
export async function getEquipmentById(
  prisma: PrismaClient,
  projectId: string,
  equipmentId: string
): Promise<EquipmentWithCosts | null> {
  const equipment = await prisma.equipment.findFirst({
    where: { id: equipmentId, projectId },
    include: {
      subResources: {
        include: {
          labor: true,
          material: true,
        },
      },
    },
  });

  if (!equipment) {
    return null;
  }

  const costs = computeEquipmentCosts(
    equipment.totalValue,
    equipment.depreciationTotal,
    equipment.subResources
  );

  return {
    ...equipment,
    costs,
  };
}

/**
 * Create equipment with nested sub-resources
 */
export async function createEquipment(
  prisma: PrismaClient,
  projectId: string,
  input: CreateEquipmentInput
): Promise<EquipmentWithCosts> {
  // Validate that labor/material resources exist and belong to the project
  if (input.laborSubResources) {
    for (const subRes of input.laborSubResources) {
      const labor = await prisma.labor.findFirst({
        where: { id: subRes.resourceId, projectId },
      });
      if (!labor) {
        throw new Error(`Labor resource ${subRes.resourceId} not found`);
      }
    }
  }

  if (input.materialSubResources) {
    for (const subRes of input.materialSubResources) {
      const material = await prisma.material.findFirst({
        where: { id: subRes.resourceId, projectId },
      });
      if (!material) {
        throw new Error(`Material resource ${subRes.resourceId} not found`);
      }
    }
  }

  const equipment = await prisma.equipment.create({
    data: {
      projectId,
      code: input.code.trim(),
      name: input.name.trim(),
      unit: input.unit.trim(),
      totalValue: new Decimal(input.totalValue),
      depreciationTotal: new Decimal(input.depreciationTotal),
      subResources: {
        create: [
          ...(input.laborSubResources?.map((subRes) => ({
            resourceType: "labor",
            laborId: subRes.resourceId,
            quantity: new Decimal(subRes.quantity),
          })) || []),
          ...(input.materialSubResources?.map((subRes) => ({
            resourceType: "material",
            materialId: subRes.resourceId,
            quantity: new Decimal(subRes.quantity),
          })) || []),
        ],
      },
    },
    include: {
      subResources: {
        include: {
          labor: true,
          material: true,
        },
      },
    },
  });

  const costs = computeEquipmentCosts(
    equipment.totalValue,
    equipment.depreciationTotal,
    equipment.subResources
  );

  return {
    ...equipment,
    costs,
  };
}

/**
 * Update equipment with atomic sub-resource replacement
 */
export async function updateEquipment(
  prisma: PrismaClient,
  projectId: string,
  equipmentId: string,
  input: UpdateEquipmentInput
): Promise<EquipmentWithCosts> {
  // Verify equipment exists and belongs to project
  const existing = await prisma.equipment.findFirst({
    where: { id: equipmentId, projectId },
  });

  if (!existing) {
    throw new Error("Equipment not found");
  }

  // Validate sub-resources if provided
  if (input.laborSubResources) {
    for (const subRes of input.laborSubResources) {
      const labor = await prisma.labor.findFirst({
        where: { id: subRes.resourceId, projectId },
      });
      if (!labor) {
        throw new Error(`Labor resource ${subRes.resourceId} not found`);
      }
    }
  }

  if (input.materialSubResources) {
    for (const subRes of input.materialSubResources) {
      const material = await prisma.material.findFirst({
        where: { id: subRes.resourceId, projectId },
      });
      if (!material) {
        throw new Error(`Material resource ${subRes.resourceId} not found`);
      }
    }
  }

  // Build update data
  const updateData: Prisma.EquipmentUpdateInput = {};

  if (input.code != null) {
    updateData.code = input.code.trim();
  }
  if (input.name != null) {
    updateData.name = input.name.trim();
  }
  if (input.unit != null) {
    updateData.unit = input.unit.trim();
  }
  if (input.totalValue != null) {
    updateData.totalValue = new Decimal(input.totalValue);
  }
  if (input.depreciationTotal != null) {
    updateData.depreciationTotal = new Decimal(input.depreciationTotal);
  }

  // Atomically replace sub-resources if provided
  if (input.laborSubResources !== undefined || input.materialSubResources !== undefined) {
    // Use transaction to atomically delete old and create new sub-resources
    const newSubResources: Prisma.EquipmentResourceCreateWithoutEquipmentInput[] = [
      ...(input.laborSubResources?.map((subRes) => ({
        resourceType: "labor",
        laborId: subRes.resourceId,
        quantity: new Decimal(subRes.quantity),
      })) || []),
      ...(input.materialSubResources?.map((subRes) => ({
        resourceType: "material",
        materialId: subRes.resourceId,
        quantity: new Decimal(subRes.quantity),
      })) || []),
    ];

    // Use nested write to atomically replace sub-resources
    updateData.subResources = {
      deleteMany: {},
      create: newSubResources,
    };
  }

  const equipment = await prisma.equipment.update({
    where: { id: equipmentId },
    data: updateData,
    include: {
      subResources: {
        include: {
          labor: true,
          material: true,
        },
      },
    },
  });

  const costs = computeEquipmentCosts(
    equipment.totalValue,
    equipment.depreciationTotal,
    equipment.subResources
  );

  return {
    ...equipment,
    costs,
  };
}

/**
 * Delete equipment and its sub-resources (cascade handled by Prisma)
 */
export async function deleteEquipment(
  prisma: PrismaClient,
  projectId: string,
  equipmentId: string
): Promise<void> {
  const existing = await prisma.equipment.findFirst({
    where: { id: equipmentId, projectId },
  });

  if (!existing) {
    throw new Error("Equipment not found");
  }

  await prisma.equipment.delete({
    where: { id: equipmentId },
  });
}

// Analysis helper types
export type AnalysisWithCosts = Prisma.AnalysisGetPayload<{
  include: {
    resources: {
      include: {
        labor: true;
        material: true;
        equipment: {
          include: {
            subResources: {
              include: {
                labor: true;
                material: true;
              };
            };
          };
        };
      };
    };
  };
}> & {
  costs: {
    directCost: number;
    depreciation: number;
    totalCost: number;
    unitRateDC: number;
    unitRateDP: number;
    unitRateTC: number;
  };
};

export type AnalysisResourceInput = {
  resourceType: "labor" | "material" | "equipment";
  resourceId: string;
  quantity: number;
};

export type CreateAnalysisInput = {
  code: string;
  name: string;
  unit: string;
  baseQuantity: number;
  resources?: AnalysisResourceInput[];
};

export type UpdateAnalysisInput = {
  code?: string;
  name?: string;
  unit?: string;
  baseQuantity?: number;
  resources?: AnalysisResourceInput[];
};

/**
 * Get analyses list with search and sort support
 */
export async function getAnalyses(
  prisma: PrismaClient,
  projectId: string,
  options?: {
    search?: string;
    sort?: "code" | "name";
  }
): Promise<AnalysisWithCosts[]> {
  const where: Prisma.AnalysisWhereInput = { projectId };

  const orderBy: Prisma.AnalysisOrderByWithRelationInput =
    options?.sort === "name" ? { name: "asc" } : { code: "asc" };

  let analyses = await prisma.analysis.findMany({
    where,
    include: {
      resources: {
        include: {
          labor: true,
          material: true,
          equipment: {
            include: {
              subResources: {
                include: {
                  labor: true,
                  material: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy,
  });

  // Case-insensitive search filter (SQLite doesn't support case-insensitive mode in Prisma)
  if (options?.search) {
    const searchLower = options.search.toLowerCase();
    analyses = analyses.filter(
      (a) =>
        a.code.toLowerCase().includes(searchLower) ||
        a.name.toLowerCase().includes(searchLower)
    );
  }

  return analyses.map((a) => {
    const costs = computeAnalysisCosts(a.baseQuantity, a.resources);
    return {
      ...a,
      costs,
    };
  });
}

/**
 * Get analysis by ID with computed costs
 */
export async function getAnalysisById(
  prisma: PrismaClient,
  projectId: string,
  analysisId: string
): Promise<AnalysisWithCosts | null> {
  const analysis = await prisma.analysis.findFirst({
    where: { id: analysisId, projectId },
    include: {
      resources: {
        include: {
          labor: true,
          material: true,
          equipment: {
            include: {
              subResources: {
                include: {
                  labor: true,
                  material: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!analysis) {
    return null;
  }

  const costs = computeAnalysisCosts(analysis.baseQuantity, analysis.resources);

  return {
    ...analysis,
    costs,
  };
}

/**
 * Create analysis with nested resources
 */
export async function createAnalysis(
  prisma: PrismaClient,
  projectId: string,
  input: CreateAnalysisInput
): Promise<AnalysisWithCosts> {
  // Validate that resources exist and belong to the project
  if (input.resources) {
    for (const res of input.resources) {
      switch (res.resourceType) {
        case "labor":
          const labor = await prisma.labor.findFirst({
            where: { id: res.resourceId, projectId },
          });
          if (!labor) {
            throw new Error(`Labor resource ${res.resourceId} not found`);
          }
          break;
        case "material":
          const material = await prisma.material.findFirst({
            where: { id: res.resourceId, projectId },
          });
          if (!material) {
            throw new Error(`Material resource ${res.resourceId} not found`);
          }
          break;
        case "equipment":
          const equipment = await prisma.equipment.findFirst({
            where: { id: res.resourceId, projectId },
          });
          if (!equipment) {
            throw new Error(`Equipment resource ${res.resourceId} not found`);
          }
          break;
      }
    }
  }

  const analysis = await prisma.analysis.create({
    data: {
      projectId,
      code: input.code.trim(),
      name: input.name.trim(),
      unit: input.unit.trim(),
      baseQuantity: new Decimal(input.baseQuantity),
      resources: {
        create: (input.resources || []).map((res) => ({
          resourceType: res.resourceType,
          laborId: res.resourceType === "labor" ? res.resourceId : null,
          materialId: res.resourceType === "material" ? res.resourceId : null,
          equipmentId: res.resourceType === "equipment" ? res.resourceId : null,
          quantity: new Decimal(res.quantity),
        })),
      },
    },
    include: {
      resources: {
        include: {
          labor: true,
          material: true,
          equipment: {
            include: {
              subResources: {
                include: {
                  labor: true,
                  material: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const costs = computeAnalysisCosts(analysis.baseQuantity, analysis.resources);

  return {
    ...analysis,
    costs,
  };
}

/**
 * Update analysis with atomic resource replacement
 */
export async function updateAnalysis(
  prisma: PrismaClient,
  projectId: string,
  analysisId: string,
  input: UpdateAnalysisInput
): Promise<AnalysisWithCosts> {
  // Verify analysis exists and belongs to project
  const existing = await prisma.analysis.findFirst({
    where: { id: analysisId, projectId },
  });

  if (!existing) {
    throw new Error("Analysis not found");
  }

  // Validate resources if provided
  if (input.resources) {
    for (const res of input.resources) {
      switch (res.resourceType) {
        case "labor":
          const labor = await prisma.labor.findFirst({
            where: { id: res.resourceId, projectId },
          });
          if (!labor) {
            throw new Error(`Labor resource ${res.resourceId} not found`);
          }
          break;
        case "material":
          const material = await prisma.material.findFirst({
            where: { id: res.resourceId, projectId },
          });
          if (!material) {
            throw new Error(`Material resource ${res.resourceId} not found`);
          }
          break;
        case "equipment":
          const equipment = await prisma.equipment.findFirst({
            where: { id: res.resourceId, projectId },
          });
          if (!equipment) {
            throw new Error(`Equipment resource ${res.resourceId} not found`);
          }
          break;
      }
    }
  }

  // Build update data
  const updateData: Prisma.AnalysisUpdateInput = {};

  if (input.code != null) {
    updateData.code = input.code.trim();
  }
  if (input.name != null) {
    updateData.name = input.name.trim();
  }
  if (input.unit != null) {
    updateData.unit = input.unit.trim();
  }
  if (input.baseQuantity != null) {
    updateData.baseQuantity = new Decimal(input.baseQuantity);
  }

  // Atomically replace resources if provided
  if (input.resources !== undefined) {
    // Use nested write to atomically replace resources
    updateData.resources = {
      deleteMany: {},
      create: input.resources.map((res) => ({
        resourceType: res.resourceType,
        laborId: res.resourceType === "labor" ? res.resourceId : null,
        materialId: res.resourceType === "material" ? res.resourceId : null,
        equipmentId: res.resourceType === "equipment" ? res.resourceId : null,
        quantity: new Decimal(res.quantity),
      })),
    };
  }

  const analysis = await prisma.analysis.update({
    where: { id: analysisId },
    data: updateData,
    include: {
      resources: {
        include: {
          labor: true,
          material: true,
          equipment: {
            include: {
              subResources: {
                include: {
                  labor: true,
                  material: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const costs = computeAnalysisCosts(analysis.baseQuantity, analysis.resources);

  return {
    ...analysis,
    costs,
  };
}

/**
 * Delete analysis and its resources (cascade handled by Prisma)
 */
export async function deleteAnalysis(
  prisma: PrismaClient,
  projectId: string,
  analysisId: string
): Promise<void> {
  const existing = await prisma.analysis.findFirst({
    where: { id: analysisId, projectId },
  });

  if (!existing) {
    throw new Error("Analysis not found");
  }

  await prisma.analysis.delete({
    where: { id: analysisId },
  });
}

// BoQ helper types and include
const boqAnalysisInclude = {
  boqAnalyses: {
    include: {
      analysis: {
        include: {
          resources: {
            include: {
              labor: true,
              material: true,
              equipment: {
                include: {
                  subResources: {
                    include: {
                      labor: true,
                      material: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

export type BoqItemWithCosts = Prisma.BoqItemGetPayload<{
  include: typeof boqAnalysisInclude;
}> & {
  costs: {
    unitRateDC: number;
    unitRateDP: number;
    unitRateTC: number;
    totalDC: number;
    totalDP: number;
    totalTC: number;
  };
};

export type CreateBoqItemInput = {
  code: string;
  name: string;
  unit: string;
  quantity: number;
  analyses?: { analysisId: string; coefficient: number }[];
};

export type UpdateBoqItemInput = {
  code?: string;
  name?: string;
  unit?: string;
  quantity?: number;
  analyses?: { analysisId: string; coefficient: number }[];
};

/**
 * Get BoQ items with search and sort, computed costs, and nested analyses
 */
export async function getBoqItems(
  prisma: PrismaClient,
  projectId: string,
  options?: {
    search?: string;
    sort?: "code" | "name";
  }
): Promise<BoqItemWithCosts[]> {
  const where: Prisma.BoqItemWhereInput = { projectId };
  const orderBy: Prisma.BoqItemOrderByWithRelationInput =
    options?.sort === "name" ? { name: "asc" } : { code: "asc" };

  let items = await prisma.boqItem.findMany({
    where,
    include: boqAnalysisInclude,
    orderBy,
  });

  if (options?.search) {
    const searchLower = options.search.toLowerCase();
    items = items.filter(
      (item) =>
        item.code.toLowerCase().includes(searchLower) ||
        item.name.toLowerCase().includes(searchLower)
    );
  }

  return items.map((item) => {
    const costs = computeBoqCosts(item.quantity, item.boqAnalyses);
    return {
      ...item,
      costs,
    };
  });
}

/**
 * Get BoQ item by ID with computed costs and nested analyses
 */
export async function getBoqItemById(
  prisma: PrismaClient,
  projectId: string,
  boqId: string
): Promise<BoqItemWithCosts | null> {
  const item = await prisma.boqItem.findFirst({
    where: { id: boqId, projectId },
    include: boqAnalysisInclude,
  });

  if (!item) {
    return null;
  }

  const costs = computeBoqCosts(item.quantity, item.boqAnalyses);
  return {
    ...item,
    costs,
  };
}

/**
 * Create BoQ item with analyses
 */
export async function createBoqItem(
  prisma: PrismaClient,
  projectId: string,
  input: CreateBoqItemInput
): Promise<BoqItemWithCosts> {
  // Validate analyses belong to the project
  if (input.analyses?.length) {
    for (const a of input.analyses) {
      const analysis = await prisma.analysis.findFirst({
        where: { id: a.analysisId, projectId },
      });
      if (!analysis) {
        throw new Error(`Analysis ${a.analysisId} not found or does not belong to project`);
      }
    }
  }

  const item = await prisma.boqItem.create({
    data: {
      projectId,
      code: input.code.trim(),
      name: input.name.trim(),
      unit: input.unit.trim(),
      quantity: new Decimal(input.quantity),
      boqAnalyses: {
        create: (input.analyses ?? []).map((a) => ({
          analysisId: a.analysisId,
          coefficient: new Decimal(a.coefficient),
        })),
      },
    },
    include: boqAnalysisInclude,
  });

  const costs = computeBoqCosts(item.quantity, item.boqAnalyses);
  return {
    ...item,
    costs,
  };
}

/**
 * Update BoQ item; replaces analyses list atomically
 */
export async function updateBoqItem(
  prisma: PrismaClient,
  projectId: string,
  boqId: string,
  input: UpdateBoqItemInput
): Promise<BoqItemWithCosts> {
  const existing = await prisma.boqItem.findFirst({
    where: { id: boqId, projectId },
  });

  if (!existing) {
    throw new Error("BoQ item not found");
  }

  // Validate analyses belong to the project if provided
  if (input.analyses !== undefined && input.analyses.length) {
    for (const a of input.analyses) {
      const analysis = await prisma.analysis.findFirst({
        where: { id: a.analysisId, projectId },
      });
      if (!analysis) {
        throw new Error(`Analysis ${a.analysisId} not found or does not belong to project`);
      }
    }
  }

  const updateData: Prisma.BoqItemUpdateInput = {};

  if (input.code != null) updateData.code = input.code.trim();
  if (input.name != null) updateData.name = input.name.trim();
  if (input.unit != null) updateData.unit = input.unit.trim();
  if (input.quantity != null) updateData.quantity = new Decimal(input.quantity);

  if (input.analyses !== undefined) {
    updateData.boqAnalyses = {
      deleteMany: {},
      create: input.analyses.map((a) => ({
        analysisId: a.analysisId,
        coefficient: new Decimal(a.coefficient),
      })),
    };
  }

  const item = await prisma.boqItem.update({
    where: { id: boqId },
    data: updateData,
    include: boqAnalysisInclude,
  });

  const costs = computeBoqCosts(item.quantity, item.boqAnalyses);
  return {
    ...item,
    costs,
  };
}

/**
 * Delete BoQ item and its analyses (cascade handled by Prisma)
 */
export async function deleteBoqItem(
  prisma: PrismaClient,
  projectId: string,
  boqId: string
): Promise<void> {
  const existing = await prisma.boqItem.findFirst({
    where: { id: boqId, projectId },
  });

  if (!existing) {
    throw new Error("BoQ item not found");
  }

  await prisma.boqItem.delete({
    where: { id: boqId },
  });
}
