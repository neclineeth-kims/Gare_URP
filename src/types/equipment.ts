// Client-side equipment types (serialized, no Decimal objects)

export type EquipmentWithCostsClient = {
  id: string;
  projectId: string;
  code: string;
  name: string;
  unit: string;
  totalValue: number;
  depreciationTotal: number;
  createdAt: string;
  updatedAt: string;
  costs: {
    edc: number;
    edp: number;
    etc: number;
  };
  subResources: Array<{
    id: string;
    equipmentId: string;
    resourceType: string;
    laborId: string | null;
    materialId: string | null;
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
};
