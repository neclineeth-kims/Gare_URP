/**
 * Resource Explosion Algorithm — SPEC.md Section 3
 * Rule #1: EDC = operator labor + fuel. EDC is IN Labor+Material totals; only EDP is separate.
 */

import type { Decimal } from "@prisma/client/runtime/library";

type SubResource = {
  quantity: Decimal;
  laborId: string | null;
  materialId: string | null;
  labor?: { id?: string; code?: string; name?: string; unit?: string; rate: Decimal } | null;
  material?: { id?: string; code?: string; name?: string; unit?: string; rate: Decimal } | null;
};

export interface EquipmentCosts {
  edc: number;
  edp: number;
  etc: number;
}

/**
 * Compute EDC, EDP, ETC per equipment unit (SPEC Section 3.2)
 * EDC = direct cost (operator labor + fuel per unit)
 * EDP = depreciation per unit (total_value / depreciation_total)
 * ETC = EDC + EDP
 */
export function computeEquipmentCosts(
  totalValue: Decimal,
  depreciationTotal: Decimal,
  subResources: SubResource[]
): EquipmentCosts {
  let edc = 0;
  for (const sr of subResources) {
    if (sr.laborId && sr.labor?.rate) {
      edc += Number(sr.quantity) * Number(sr.labor.rate);
    }
    if (sr.materialId && sr.material?.rate) {
      edc += Number(sr.quantity) * Number(sr.material.rate);
    }
  }
  const edp = Number(totalValue) / Number(depreciationTotal);
  return { edc, edp, etc: edc + edp };
}

export interface AnalysisCosts {
  directCost: number;
  depreciation: number;
  totalCost: number;
  unitRateDC: number;
  unitRateDP: number;
  unitRateTC: number;
}

type AnalysisResourceRow = {
  resourceType: string;
  quantity: Decimal;
  labor?: { rate: Decimal } | null;
  material?: { rate: Decimal } | null;
  equipment?: {
    totalValue: Decimal;
    depreciationTotal: Decimal;
    subResources: SubResource[];
  } | null;
};

/**
 * Compute ADC, ADP, ATC for analysis (SPEC Section 3.3)
 * ADC = labor + material + equipment EDC (direct cost)
 * ADP = equipment depreciation only
 * ATC = ADC + ADP
 */
export function computeAnalysisCosts(
  baseQuantity: Decimal,
  resources: AnalysisResourceRow[]
): AnalysisCosts {
  let directCost = 0;
  let depreciation = 0;

  for (const res of resources) {
    switch (res.resourceType) {
      case "labor":
        if (res.labor?.rate) {
          directCost += Number(res.quantity) * Number(res.labor.rate);
        }
        break;
      case "material":
        if (res.material?.rate) {
          directCost += Number(res.quantity) * Number(res.material.rate);
        }
        break;
      case "equipment":
        if (res.equipment) {
          const eqCosts = computeEquipmentCosts(
            res.equipment.totalValue,
            res.equipment.depreciationTotal,
            res.equipment.subResources
          );
          const qty = Number(res.quantity);
          directCost += qty * eqCosts.edc;
          depreciation += qty * eqCosts.edp;
        }
        break;
    }
  }

  const totalCost = directCost + depreciation;
  const base = Number(baseQuantity) || 1;
  return {
    directCost,
    depreciation,
    totalCost,
    unitRateDC: directCost / base,
    unitRateDP: depreciation / base,
    unitRateTC: totalCost / base,
  };
}

export interface BoqCosts {
  unitRateDC: number;
  unitRateDP: number;
  unitRateTC: number;
  totalDC: number;
  totalDP: number;
  totalTC: number;
}

type BoqAnalysisRow = {
  coefficient: Decimal;
  analysis: {
    baseQuantity: Decimal;
    resources: AnalysisResourceRow[];
  };
};

/**
 * Compute BDC, BDP, BTC for BoQ item (SPEC Section 3.4)
 * Unit rate = weighted sum of (coefficient × analysis unit rate)
 * Total = unit rate × quantity
 */
export function computeBoqCosts(
  quantity: Decimal,
  boqAnalyses: BoqAnalysisRow[]
): BoqCosts {
  let unitRateDC = 0;
  let unitRateDP = 0;

  for (const ba of boqAnalyses) {
    const analysisCosts = computeAnalysisCosts(ba.analysis.baseQuantity, ba.analysis.resources);
    const coeff = Number(ba.coefficient);
    unitRateDC += coeff * analysisCosts.unitRateDC;
    unitRateDP += coeff * analysisCosts.unitRateDP;
  }

  const qty = Number(quantity);
  return {
    unitRateDC,
    unitRateDP,
    unitRateTC: unitRateDC + unitRateDP,
    totalDC: unitRateDC * qty,
    totalDP: unitRateDP * qty,
    totalTC: (unitRateDC + unitRateDP) * qty,
  };
}

export interface ExplosionLabor {
  resource: { id: string; code: string; name: string; unit: string; rate: Decimal };
  totalQty: number;
}

export interface ExplosionMaterial {
  resource: { id: string; code: string; name: string; unit: string; rate: Decimal };
  totalQty: number;
}

export interface ExplosionEquipment {
  resource: { id: string; code: string; name: string; unit: string };
  totalHours: number;
  deprPerUnit: number;
  totalDepreciation: number;
}

export interface ResourceExplosion {
  labor: ExplosionLabor[];
  materials: ExplosionMaterial[];
  equipment: ExplosionEquipment[];
  totalLaborCost: number;
  totalMaterialCost: number;
  totalDirectCost: number;
  totalDepreciation: number;
  grandTotal: number;
  boqSummary: { code: string; name: string; totalDC: number; totalDP: number; totalTC: number }[];
}

type ExplosionAnalysisResource = {
  resourceType: string;
  quantity: Decimal;
  labor?: { id: string; rate: Decimal } | null;
  material?: { id: string; rate: Decimal } | null;
  equipment?: {
    id: string;
    code: string;
    name: string;
    unit: string;
    totalValue: Decimal;
    depreciationTotal: Decimal;
    subResources: SubResource[];
  } | null;
};

type ExplosionBoqAnalysis = {
  coefficient: Decimal;
  analysis: {
    baseQuantity: Decimal;
    resources: ExplosionAnalysisResource[];
  };
};

type ExplosionBoqItem = {
  code: string;
  name: string;
  quantity: Decimal;
  boqAnalyses: ExplosionBoqAnalysis[];
};

function addToLaborMap(
  map: Map<string, ExplosionLabor>,
  id: string,
  resource: { id: string; code: string; name: string; unit: string; rate: Decimal },
  qty: number
) {
  const existing = map.get(id);
  if (existing) {
    existing.totalQty += qty;
  } else {
    map.set(id, { resource, totalQty: qty });
  }
}

function addToMaterialMap(
  map: Map<string, ExplosionMaterial>,
  id: string,
  resource: { id: string; code: string; name: string; unit: string; rate: Decimal },
  qty: number
) {
  const existing = map.get(id);
  if (existing) {
    existing.totalQty += qty;
  } else {
    map.set(id, { resource, totalQty: qty });
  }
}

function addToEquipmentMap(
  map: Map<string, { resource: { id: string; code: string; name: string; unit: string }; totalHours: number; deprPerUnit: number }>,
  id: string,
  resource: { id: string; code: string; name: string; unit: string },
  hours: number,
  deprPerUnit: number
) {
  const existing = map.get(id);
  if (existing) {
    existing.totalHours += hours;
  } else {
    map.set(id, { resource, totalHours: hours, deprPerUnit });
  }
}

/**
 * Project Resource Explosion (SPEC Section 3.5)
 * Traces BoQ → Analysis → Resources → Equipment sub-resources.
 * Aggregates labor, materials, equipment hours (for depreciation).
 * Rule #1: EDC is in labor+material; only depreciation is separate.
 */
export function explodeProject(
  boqItems: ExplosionBoqItem[]
): ResourceExplosion {
  const laborMap = new Map<string, ExplosionLabor>();
  const materialMap = new Map<string, ExplosionMaterial>();
  const equipmentMap = new Map<
    string,
    { resource: { id: string; code: string; name: string; unit: string }; totalHours: number; deprPerUnit: number }
  >();

  const boqSummary: { code: string; name: string; totalDC: number; totalDP: number; totalTC: number }[] = [];

  for (const boqItem of boqItems) {
    const costs = computeBoqCosts(boqItem.quantity, boqItem.boqAnalyses);
    boqSummary.push({
      code: boqItem.code,
      name: boqItem.name,
      totalDC: costs.totalDC,
      totalDP: costs.totalDP,
      totalTC: costs.totalTC,
    });

    for (const ba of boqItem.boqAnalyses) {
      const analysisBaseUnits =
        Number(ba.coefficient) * Number(boqItem.quantity) / Number(ba.analysis.baseQuantity);

      for (const res of ba.analysis.resources) {
        const totalResourceQty = Number(res.quantity) * analysisBaseUnits;

        switch (res.resourceType) {
          case "labor":
            if (res.labor) {
              addToLaborMap(laborMap, res.labor.id, res.labor as ExplosionLabor["resource"], totalResourceQty);
            }
            break;
          case "material":
            if (res.material) {
              addToMaterialMap(materialMap, res.material.id, res.material as ExplosionMaterial["resource"], totalResourceQty);
            }
            break;
          case "equipment":
            if (res.equipment) {
              const eqCosts = computeEquipmentCosts(
                res.equipment.totalValue,
                res.equipment.depreciationTotal,
                res.equipment.subResources
              );
              addToEquipmentMap(
                equipmentMap,
                res.equipment.id,
                { id: res.equipment.id, code: res.equipment.code, name: res.equipment.name, unit: res.equipment.unit },
                totalResourceQty,
                eqCosts.edp
              );
              for (const subRes of res.equipment.subResources) {
                const subQty = Number(subRes.quantity) * totalResourceQty;
                if (subRes.laborId && subRes.labor && subRes.labor.id) {
                  addToLaborMap(laborMap, subRes.laborId, subRes.labor as ExplosionLabor["resource"], subQty);
                }
                if (subRes.materialId && subRes.material && subRes.material.id) {
                  addToMaterialMap(materialMap, subRes.materialId, subRes.material as ExplosionMaterial["resource"], subQty);
                }
              }
            }
            break;
        }
      }
    }
  }

  // Build labor array with costs
  const labor = Array.from(laborMap.values());
  const totalLaborCost = labor.reduce((s, l) => s + l.totalQty * Number(l.resource.rate), 0);

  // Build materials array with costs
  const materials = Array.from(materialMap.values());
  const totalMaterialCost = materials.reduce((s, m) => s + m.totalQty * Number(m.resource.rate), 0);

  // Build equipment array - need to merge with full equipment data for code/name/unit
  // For now we stored deprPerUnit; totalDepreciation = totalHours * deprPerUnit
  const equipment: ExplosionEquipment[] = Array.from(equipmentMap.values()).map((e) => ({
    resource: e.resource,
    totalHours: e.totalHours,
    deprPerUnit: e.deprPerUnit,
    totalDepreciation: e.totalHours * e.deprPerUnit,
  }));

  const totalDepreciation = equipment.reduce((s, e) => s + e.totalDepreciation, 0);
  const totalDirectCost = totalLaborCost + totalMaterialCost;
  const grandTotal = totalDirectCost + totalDepreciation;

  return {
    labor,
    materials,
    equipment,
    totalLaborCost,
    totalMaterialCost,
    totalDirectCost,
    totalDepreciation,
    grandTotal,
    boqSummary,
  };
}
