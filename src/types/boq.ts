// Client-side BoQ types (serialized, no Decimal)

export type BoqItemWithCosts = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  unit: string;
  quantity: number;
  costs: {
    unitRateDC: number;
    unitRateDP: number;
    unitRateTC: number;
    totalDC: number;
    totalDP: number;
    totalTC: number;
  };
  boqAnalyses: Array<{
    id: string;
    analysisId: string;
    coefficient: number;
    analysis: {
      id: string;
      code: string;
      name: string;
      unit: string;
      unitRateDC: number;
      unitRateDP: number;
      unitRateTC: number;
    };
  }>;
};
