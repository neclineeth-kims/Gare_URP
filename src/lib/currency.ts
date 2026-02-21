import type { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

/** Common currency code → symbol for display */
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  US$: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CNY: "¥",
  INR: "₹",
  RUB: "₽",
  SOM: "SM", // Tajikistani Somoni
  RON: "lei", // Romanian Leu
  HUF: "Ft", // Hungarian Forint
  LOCAL: "—", // Placeholder until configured
};

/**
 * Get main currency display for a project (slot 1).
 * Returns { symbol, code } or null if not found. Default: US$
 */
export async function getMainCurrencyDisplay(
  prisma: PrismaClient,
  projectId: string
): Promise<{ symbol: string; code: string } | null> {
  try {
    if (prisma.projectCurrency) {
      const main = await prisma.projectCurrency.findFirst({
        where: { projectId, slot: 1 },
      });
      if (main) {
        const code = main.code?.trim() || "USD";
        const symbol = CURRENCY_SYMBOLS[code.toUpperCase()] ?? code;
        return { symbol, code };
      }
    } else {
      const rows = (await (prisma as { $queryRaw: (s: TemplateStringsArray, ...v: unknown[]) => Promise<unknown[]> }).$queryRaw`
        SELECT code FROM project_currencies WHERE project_id = ${projectId} AND slot = 1 LIMIT 1
      `) as { code: string }[];
      if (rows[0]?.code) {
        const code = rows[0].code.trim();
        const symbol = CURRENCY_SYMBOLS[code.toUpperCase()] ?? code;
        return { symbol, code };
      }
    }
  } catch {
    // Fall through to default
  }
  return null;
}

/**
 * Get currency slot → effective multiplier map for a project.
 * Effective multiplier = baseMultiplier / mainCurrencyBaseMultiplier (SC/Mul).
 * Used to convert rates to main currency: convertedRate = originalRate × effectiveMultiplier
 */
export async function getCurrencyMultipliers(
  prisma: PrismaClient,
  projectId: string
): Promise<Map<number, number>> {
  const currencies = await prisma.projectCurrency.findMany({
    where: { projectId },
    orderBy: { slot: "asc" },
  });
  const main = currencies.find((c) => c.slot === 1);
  const mainMult = main ? Number(main.multiplier) : 1;
  const map = new Map<number, number>();
  for (const c of currencies) {
    const baseMult = Number(c.multiplier);
    map.set(c.slot, mainMult > 0 ? baseMult / mainMult : baseMult);
  }
  return map;
}

/**
 * Convert a rate from its original currency to main currency.
 * convertedRate = originalRate × effectiveMultiplier (SC/Mul)
 */
export function convertRate(
  rate: number,
  currencySlot: number,
  multipliers: Map<number, number>
): number {
  const multiplier = multipliers.get(currencySlot) ?? 1;
  return rate * multiplier;
}

/**
 * Apply rate conversion to labor/material in sub-resources (for equipment).
 */
export function applyConversionToSubResources<T extends { labor?: { rate: unknown; currencySlot?: number } | null; material?: { rate: unknown; currencySlot?: number } | null }>(
  subResources: T[],
  multipliers: Map<number, number>
): T[] {
  return subResources.map((sr) => ({
    ...sr,
    labor: sr.labor
      ? {
          ...sr.labor,
          rate: new Decimal(convertRate(Number(sr.labor.rate), sr.labor.currencySlot ?? 1, multipliers)),
        }
      : null,
    material: sr.material
      ? {
          ...sr.material,
          rate: new Decimal(convertRate(Number(sr.material.rate), sr.material.currencySlot ?? 1, multipliers)),
        }
      : null,
  })) as T[];
}

/**
 * Apply rate conversion to analysis resources (labor, material, equipment.subResources).
 */
export function applyConversionToAnalysisResources<T extends {
  resourceType: string;
  labor?: { rate: unknown; currencySlot?: number } | null;
  material?: { rate: unknown; currencySlot?: number } | null;
  equipment?: { subResources: Array<{ labor?: { rate: unknown; currencySlot?: number } | null; material?: { rate: unknown; currencySlot?: number } | null }> } | null;
}>(
  resources: T[],
  multipliers: Map<number, number>
): T[] {
  return resources.map((res) => {
    const converted: T = { ...res } as T;
    if (res.labor) {
      (converted as T & { labor: { rate: Decimal; currencySlot?: number } }).labor = {
        ...res.labor,
        rate: new Decimal(convertRate(Number(res.labor.rate), res.labor.currencySlot ?? 1, multipliers)),
      };
    }
    if (res.material) {
      (converted as T & { material: { rate: Decimal; currencySlot?: number } }).material = {
        ...res.material,
        rate: new Decimal(convertRate(Number(res.material.rate), res.material.currencySlot ?? 1, multipliers)),
      };
    }
    if (res.equipment?.subResources) {
      (converted as T & { equipment: { subResources: unknown[] } }).equipment = {
        ...res.equipment,
        subResources: applyConversionToSubResources(res.equipment.subResources, multipliers),
      };
    }
    return converted;
  });
}

/**
 * Apply rate conversion to boqAnalyses (each analysis.resources).
 */
export function applyConversionToBoqAnalyses<T extends {
  analysis: { resources: Parameters<typeof applyConversionToAnalysisResources>[0] };
}>(
  boqAnalyses: T[],
  multipliers: Map<number, number>
): T[] {
  return boqAnalyses.map((ba) => ({
    ...ba,
    analysis: {
      ...ba.analysis,
      resources: applyConversionToAnalysisResources(ba.analysis.resources, multipliers),
    },
  }));
}
