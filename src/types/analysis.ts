// Client-side analysis types (serialized, no Decimal objects)

export type AnalysisWithCostsClient = {
  id: string;
  projectId: string;
  code: string;
  name: string;
  unit: string;
  baseQuantity: number;
  createdAt: string;
  updatedAt: string;
  costs: {
    directCost: number;
    depreciation: number;
    totalCost: number;
    unitRateDC: number;
    unitRateDP: number;
    unitRateTC: number;
  };
  resources: Array<{
    id: string;
    analysisId: string;
    resourceType: string;
    laborId: string | null;
    materialId: string | null;
    equipmentId: string | null;
    quantity: number;
    createdAt: string;
    labor: {
      id: string;
      code: string;
      name: string;
      unit: string;
      rate: number;
      createdAt: string;
      updatedAt: string;
    } | null;
    material: {
      id: string;
      code: string;
      name: string;
      unit: string;
      rate: number;
      createdAt: string;
      updatedAt: string;
    } | null;
    equipment: {
      id: string;
      code: string;
      name: string;
      unit: string;
      totalValue: number;
      depreciationTotal: number;
      createdAt: string;
      updatedAt: string;
      subResources: Array<{
        id: string;
        resourceType: string;
        quantity: number;
        createdAt: string;
        labor: {
          id: string;
          code: string;
          name: string;
          unit: string;
          rate: number;
          createdAt: string;
          updatedAt: string;
        } | null;
        material: {
          id: string;
          code: string;
          name: string;
          unit: string;
          rate: number;
          createdAt: string;
          updatedAt: string;
        } | null;
      }>;
    } | null;
  }>;
};
