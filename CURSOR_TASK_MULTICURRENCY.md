# CURSOR TASK: Multi-Currency Support

## Branch: `nevos-changes`

## Overview
Add multi-currency support so that labor and materials can be entered in different currencies, while all calculations use a single "main currency" (local currency). Each project gets 5 currency slots. Slot 1 is always the local/main currency with multiplier=1.

## Excel Reference Logic
```
Currency Table:
No | Curr | Multiplier | SC/Mul
1  | SOM  | 1          | 0.25    (1/4)
2  | EUR  | 4          | 1.00    (4/4) ← Study Currency
3  | USD  | 3          | 0.75    (3/4)
4  | RON  | 5          | 1.25    (5/4)
5  | HUF  | 6          | 1.50    (6/4)

Conversion formula: convertedRate = originalRate × (slotMultiplier / mainCurrencyMultiplier)
Since main currency multiplier is always 1: convertedRate = originalRate × slotMultiplier

Example: Skilled Laborer, currency=3 (USD), originalRate=3
→ convertedRate = 3 × 3 = 9 (in SOM, the main currency)

Example: Semi-skilled Laborer, currency=2 (EUR), originalRate=8
→ convertedRate = 8 × 4 = 32 (in SOM)
```

---

## STEP 1: Prisma Schema Changes

File: `prisma/schema.prisma`

### Add ProjectCurrency model (NEW)
```prisma
model ProjectCurrency {
  id         String  @id @default(uuid())
  projectId  String  @map("project_id")
  project    Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  slot       Int     // 1-5, slot 1 = main/local currency
  code       String  // e.g. "SOM", "EUR", "USD"
  name       String  // e.g. "Somoni", "Euro"
  multiplier Decimal @default(1) // exchange rate vs main. Slot 1 always = 1
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  @@unique([projectId, slot])
  @@map("project_currencies")
}
```

### Modify Project model
Add relation:
```prisma
model Project {
  // ... existing fields ...
  currencies  ProjectCurrency[]
  // ... rest unchanged ...
}
```

### Modify Labor model
Add `currencySlot` field:
```prisma
model Labor {
  // ... existing fields ...
  currencySlot Int @default(1) @map("currency_slot") // 1-5, references ProjectCurrency.slot
  // ... rest unchanged ...
}
```

### Modify Material model
Add `currencySlot` field:
```prisma
model Material {
  // ... existing fields ...
  currencySlot Int @default(1) @map("currency_slot") // 1-5, references ProjectCurrency.slot
  // ... rest unchanged ...
}
```

### Keep existing Currency model
Don't delete it — it's used for backward compatibility. The new ProjectCurrency is per-project.

---

## STEP 2: Seed Template Update

File: `prisma/seed-template.ts`

After creating the base currency, also create 5 default ProjectCurrency slots. But since ProjectCurrency is per-project (not template-level), this should happen when a NEW project is created instead.

---

## STEP 3: Project Creation — Auto-create 5 Currency Slots

File: `src/app/api/projects/route.ts`

After creating the project, create 5 default ProjectCurrency rows:
```typescript
// After project creation:
await projectPrisma.projectCurrency.createMany({
  data: [
    { projectId: project.id, slot: 1, code: "LOCAL", name: "Local Currency", multiplier: 1 },
    { projectId: project.id, slot: 2, code: "CUR2", name: "Currency 2", multiplier: 1 },
    { projectId: project.id, slot: 3, code: "CUR3", name: "Currency 3", multiplier: 1 },
    { projectId: project.id, slot: 4, code: "CUR4", name: "Currency 4", multiplier: 1 },
    { projectId: project.id, slot: 5, code: "CUR5", name: "Currency 5", multiplier: 1 },
  ],
});
```

Also: after project creation, redirect to `/projects/${id}/currencies` instead of `/projects/${id}`.

---

## STEP 4: Currency Setup Page (NEW)

### API Route (NEW)
File: `src/app/api/v1/projects/[projectId]/currencies/route.ts`

**GET**: Return all 5 ProjectCurrency rows for this project, ordered by slot.
**PUT**: Accept array of 5 currency objects `[{slot, code, name, multiplier}]`. Upsert all 5. Validate:
- Slot 1 multiplier must always be 1
- All multipliers must be > 0
- Codes must be non-empty strings

### Page (NEW)
File: `src/app/projects/[projectId]/currencies/page.tsx`

UI: A table/form with 5 rows:
```
| Slot | Code    | Name           | Multiplier |
|------|---------|----------------|------------|
| 1    | [SOM]   | [Somoni]       | 1 (locked) |
| 2    | [EUR]   | [Euro]         | [4]        |
| 3    | [USD]   | [US Dollar]    | [3]        |
| 4    | [RON]   | [Romanian Leu] | [5]        |
| 5    | [HUF]   | [Forint]       | [6]        |
```

- All fields editable except Slot 1 multiplier (always 1, disabled)
- "Save" button at bottom
- Help text: "Slot 1 is your main/local currency. Set multipliers as: how many units of Slot 1 currency equals 1 unit of that currency. Example: if 1 EUR = 4 SOM, set EUR multiplier to 4."

### Add to Sidebar
File: `src/components/layout/sidebar.tsx`

Add "Currencies" link with a coins/banknote icon, positioned FIRST (before Labor).

### Add to Project Overview
File: `src/app/projects/[projectId]/page.tsx`

Add Currencies card to the stats grid (show count of configured currencies where code != default).

---

## STEP 5: Labor Page Changes

File: `src/app/projects/[projectId]/labor/page.tsx`

### Type change
```typescript
type Labor = {
  id: string;
  code: string;
  name: string;
  unit: string;
  rate: string;
  currencySlot: number;
};
```

### Form change
Add `currencySlot` to form state (default: 1).
Add a dropdown/select in the dialog:
```
Currency: [1 - SOM ▼]  (dropdown showing slot number + code)
```
Fetch currencies on mount: `GET /api/v1/projects/${projectId}/currencies`

### Rate field label
Change label from "Rate" to "Rate (original currency)"

### Table change
Add columns:
```
| Code | Name | Unit | Currency | Original Rate | Rate (Main) | Actions |
```

Where "Rate (Main)" = `originalRate × multiplier` (compute client-side using fetched currencies).

### API change
File: `src/app/api/v1/projects/[projectId]/labor/route.ts`

**POST**: Accept `currencySlot` in body (default 1, validate 1-5).
**GET**: Include `currencySlot` in response.

File: `src/app/api/v1/projects/[projectId]/labor/[id]/route.ts`

**PUT**: Accept and update `currencySlot`.

---

## STEP 6: Materials Page Changes

File: `src/app/projects/[projectId]/materials/page.tsx`

Exact same changes as Labor:
- Add `currencySlot` to type, form, dropdown
- Add Currency and Rate (Main) columns to table
- Fetch currencies on mount

File: `src/app/api/v1/projects/[projectId]/materials/route.ts`
File: `src/app/api/v1/projects/[projectId]/materials/[id]/route.ts`

Same API changes as Labor routes.

---

## STEP 7: Calculation Engine Changes

File: `src/lib/calculations.ts`

### Key change
The `rate` field on Labor and Material currently stores the value in whatever currency was entered. The calculations must use the **converted rate** (in main currency).

**Option A (recommended):** Compute converted rate at the API/query level and pass it through. Add a computed field when fetching labor/materials:

In every API that fetches labor/materials for calculations (equipment resources, analysis resources, reports), join with ProjectCurrency and compute:
```
convertedRate = rate × projectCurrency.multiplier (where projectCurrency.slot = labor.currencySlot)
```

Pass `convertedRate` as the `rate` into the calculation functions. This way `calculations.ts` doesn't need to know about currencies at all.

**Where this matters:**
1. `src/app/api/v1/projects/[projectId]/equipment/[id]/route.ts` — when fetching equipment with sub-resources (labor/material rates)
2. `src/app/api/v1/projects/[projectId]/analysis/[id]/route.ts` — when fetching analysis with resources
3. `src/app/api/v1/projects/[projectId]/reports/resource-explosion/route.ts` — full project explosion
4. Any component that displays labor/material rates in calculation context

**Implementation approach:**
Create a utility function:
```typescript
// src/lib/currency.ts (NEW)
export async function getCurrencyMultipliers(
  prisma: PrismaClient,
  projectId: string
): Promise<Map<number, number>> {
  const currencies = await prisma.projectCurrency.findMany({
    where: { projectId },
  });
  const map = new Map<number, number>();
  for (const c of currencies) {
    map.set(c.slot, Number(c.multiplier));
  }
  return map;
}

export function convertRate(rate: number, currencySlot: number, multipliers: Map<number, number>): number {
  const multiplier = multipliers.get(currencySlot) ?? 1;
  return rate * multiplier;
}
```

Then in each API route that returns data for calculations, apply conversion before passing to calculation functions.

---

## STEP 8: NO Changes Needed

These files need NO changes (they consume already-converted rates):
- Equipment page/API (all equipment values are in main currency)
- Analysis page/API (consumes converted labor/material/equipment rates)
- BoQ page/API (consumes analysis unit rates)
- `computeEquipmentCosts()`, `computeAnalysisCosts()`, `computeBoqCosts()`, `explodeProject()` — these all work with rates that should already be in main currency

---

## STEP 9: Migration for Existing Data

Since we're using SQLite with Prisma, after schema change:
```bash
DATABASE_URL="file:./data/unitrate_main/unitrate.db" npx prisma db push
```

For existing projects, you'll need to either:
- Recreate them (simplest)
- Or run a migration script that adds `currency_slot = 1` to existing labor/materials and creates 5 default ProjectCurrency rows

---

## File Change Summary

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add ProjectCurrency model, add currencySlot to Labor & Material |
| `src/app/api/projects/route.ts` | Create 5 default currencies on project creation |
| `src/app/api/v1/projects/[projectId]/currencies/route.ts` | **NEW** — GET/PUT currencies |
| `src/app/projects/[projectId]/currencies/page.tsx` | **NEW** — Currency setup UI |
| `src/app/projects/[projectId]/labor/page.tsx` | Add currency dropdown, show converted rate |
| `src/app/projects/[projectId]/materials/page.tsx` | Add currency dropdown, show converted rate |
| `src/app/api/v1/projects/[projectId]/labor/route.ts` | Accept/return currencySlot |
| `src/app/api/v1/projects/[projectId]/labor/[id]/route.ts` | Accept/update currencySlot |
| `src/app/api/v1/projects/[projectId]/materials/route.ts` | Accept/return currencySlot |
| `src/app/api/v1/projects/[projectId]/materials/[id]/route.ts` | Accept/update currencySlot |
| `src/lib/currency.ts` | **NEW** — Currency conversion utilities |
| `src/components/layout/sidebar.tsx` | Add Currencies nav link |
| `src/app/projects/[projectId]/page.tsx` | Add Currencies stat card |
| `src/app/api/v1/projects/[projectId]/equipment/[id]/route.ts` | Apply rate conversion when fetching sub-resources |
| `src/app/api/v1/projects/[projectId]/analysis/[id]/route.ts` | Apply rate conversion when fetching resources |
| `src/app/api/v1/projects/[projectId]/reports/resource-explosion/route.ts` | Apply rate conversion |

## Order of Implementation
1. Schema (`schema.prisma`) + push
2. `src/lib/currency.ts` (utility)
3. Currency API route
4. Currency page
5. Sidebar + overview updates
6. Project creation (auto-create currencies)
7. Labor API + page updates
8. Material API + page updates
9. Rate conversion in equipment/analysis/report APIs
10. Test end-to-end
