/**
 * Central Zod schemas for all API routes.
 * Import the schema you need and call .safeParse(body) in your route handler.
 */
import { z } from "zod";
import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

const code = z
  .string({ error: "Code is required" })
  .trim()
  .min(1, "Code is required")
  .max(6, "Code must be 6 characters or fewer");

const name = z
  .string({ error: "Name is required" })
  .trim()
  .min(1, "Name is required")
  .max(200, "Name must be 200 characters or fewer");

const unit = z
  .string({ error: "Unit is required" })
  .trim()
  .min(1, "Unit is required")
  .max(20, "Unit must be 20 characters or fewer");

const positiveNumber = z
  .number({ error: "Must be a number" })
  .positive("Must be a positive number");

const nonNegativeNumber = z
  .number({ error: "Must be a number" })
  .min(0, "Must be zero or greater");

const currencySlot = z
  .number({ error: "Currency slot must be a number" })
  .int("Currency slot must be an integer")
  .min(1, "Currency slot must be between 1 and 5")
  .max(5, "Currency slot must be between 1 and 5")
  .default(1);

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export const ProjectCreateSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(200, "Name too long"),
  description: z.string().trim().max(1000).optional(),
});

export const ProjectUpdateSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(200, "Name too long"),
});

// ---------------------------------------------------------------------------
// Labor
// ---------------------------------------------------------------------------

export const LaborCreateSchema = z.object({
  code,
  name,
  unit,
  rate: positiveNumber,
  currencySlot: currencySlot.optional(),
});

export const LaborUpdateSchema = z.object({
  code: code.optional(),
  name: name.optional(),
  unit: unit.optional(),
  rate: positiveNumber.optional(),
  currencySlot: currencySlot.optional(),
});

// ---------------------------------------------------------------------------
// Materials (identical shape to Labor)
// ---------------------------------------------------------------------------

export const MaterialCreateSchema = LaborCreateSchema;
export const MaterialUpdateSchema = LaborUpdateSchema;

// ---------------------------------------------------------------------------
// Equipment
// ---------------------------------------------------------------------------

const SubResourceSchema = z.object({
  resourceId: z.string().min(1, "Resource ID is required"),
  quantity: positiveNumber,
});

export const EquipmentCreateSchema = z.object({
  code,
  name,
  unit,
  total_value: nonNegativeNumber,
  depreciation_total: nonNegativeNumber,
  laborSubResources: z.array(SubResourceSchema).optional(),
  materialSubResources: z.array(SubResourceSchema).optional(),
});

export const EquipmentUpdateSchema = z.object({
  code: code.optional(),
  name: name.optional(),
  unit: unit.optional(),
  total_value: nonNegativeNumber.optional(),
  depreciation_total: nonNegativeNumber.optional(),
  laborSubResources: z.array(SubResourceSchema).optional(),
  materialSubResources: z.array(SubResourceSchema).optional(),
});

export const EquipmentResourceCreateSchema = z
  .object({
    resource_type: z.enum(["labor", "material"], {
      error: "resource_type must be 'labor' or 'material'",
    }),
    labor_id: z.string().optional(),
    material_id: z.string().optional(),
    quantity: positiveNumber,
  })
  .refine(
    (d) =>
      (d.resource_type === "labor" && !!d.labor_id) ||
      (d.resource_type === "material" && !!d.material_id),
    {
      message: "labor_id is required when resource_type is 'labor'; material_id when 'material'",
    }
  );

export const EquipmentResourceUpdateSchema = z.object({
  quantity: positiveNumber,
});

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

const AnalysisResourceItemSchema = z.object({
  resourceType: z.enum(["labor", "material", "equipment"], {
    error: "resourceType must be 'labor', 'material' or 'equipment'",
  }),
  resourceId: z.string().min(1, "resourceId is required"),
  quantity: positiveNumber,
});

export const AnalysisCreateSchema = z.object({
  code,
  name,
  unit,
  base_quantity: positiveNumber,
  resources: z.array(AnalysisResourceItemSchema).optional(),
});

export const AnalysisUpdateSchema = z.object({
  code: code.optional(),
  name: name.optional(),
  unit: unit.optional(),
  base_quantity: positiveNumber.optional(),
  resources: z.array(AnalysisResourceItemSchema).optional(),
});

export const AnalysisResourceCreateSchema = z
  .object({
    resource_type: z.enum(["labor", "material", "equipment"], {
      error: "resource_type must be 'labor', 'material' or 'equipment'",
    }),
    labor_id: z.string().optional(),
    material_id: z.string().optional(),
    equipment_id: z.string().optional(),
    quantity: positiveNumber,
  })
  .refine(
    (d) =>
      (d.resource_type === "labor" && !!d.labor_id) ||
      (d.resource_type === "material" && !!d.material_id) ||
      (d.resource_type === "equipment" && !!d.equipment_id),
    {
      message:
        "Provide labor_id, material_id, or equipment_id matching the resource_type",
    }
  );

export const AnalysisResourceUpdateSchema = z.object({
  quantity: positiveNumber,
});

// ---------------------------------------------------------------------------
// BoQ
// ---------------------------------------------------------------------------

const BoqAnalysisItemSchema = z.object({
  analysisId: z.string().min(1, "analysisId is required"),
  coefficient: positiveNumber,
});

export const BoqCreateSchema = z.object({
  code,
  name,
  unit,
  quantity: positiveNumber,
  analyses: z.array(BoqAnalysisItemSchema).optional(),
});

export const BoqUpdateSchema = z.object({
  code: code.optional(),
  name: name.optional(),
  unit: unit.optional(),
  quantity: positiveNumber.optional(),
  analyses: z.array(BoqAnalysisItemSchema).optional(),
});

// boq/[id]/analysis sub-route (snake_case to match existing API contract)
export const BoqAnalysisCreateSchema = z.object({
  analysis_id: z.string().min(1, "analysis_id is required"),
  coefficient: positiveNumber,
});

export const BoqAnalysisUpdateSchema = z.object({
  coefficient: positiveNumber,
});

// ---------------------------------------------------------------------------
// Currencies
// ---------------------------------------------------------------------------

const CurrencySlotSchema = z.object({
  slot: z
    .number()
    .int()
    .min(1, "Slot must be between 1 and 5")
    .max(5, "Slot must be between 1 and 5"),
  code: z.string().trim().min(1, "Currency code is required").max(10),
  name: z.string().trim().min(1, "Currency name is required").max(100),
  multiplier: positiveNumber,
});

export const CurrenciesUpdateSchema = z
  .array(CurrencySlotSchema)
  .min(1, "At least one currency slot is required")
  .max(5, "Maximum 5 currency slots allowed");

export const CurrencySwapSchema = z.object({
  slot: z
    .number()
    .int()
    .min(2, "Slot must be between 2 and 5 (slot 1 is already main)")
    .max(5, "Slot must be between 2 and 5"),
});

// ---------------------------------------------------------------------------
// Helper: parse body or return 400 response
// ---------------------------------------------------------------------------

type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

export function parseBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): ParseResult<T> {
  const result = schema.safeParse(body);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  const message = result.error.issues
    .map((e) => e.message)
    .join("; ");
  return {
    ok: false,
    response: NextResponse.json({ error: message }, { status: 400 }),
  };
}
