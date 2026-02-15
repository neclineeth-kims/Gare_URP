# Unit Rate Calculation Application — Complete Specification v2

> **Document version:** 2.0 — 2026-02-14
> **Purpose:** Production-ready spec for Cursor AI development

---

## 🤖 CURSOR AI — READ THIS FIRST

### Build Order (follow strictly)

1. **Phase 1 — Database & ORM**: Set up Prisma schema, migrations, seed script with test data
2. **Phase 2 — API layer**: CRUD endpoints for labor, materials, equipment, analysis, BoQ
3. **Phase 3 — Calculation engine**: Resource explosion algorithm (pure functions, fully tested)
4. **Phase 4 — UI shells**: Layout, navigation, CRUD pages
5. **Phase 5 — Analysis builder & BoQ manager**: Real-time cost calculation UI
6. **Phase 6 — Reports**: Resource explosion report, export
7. **Phase 7 — Import/Export**: Excel import, PDF/Excel export

### ⚠️ Critical Gotchas

1. **THE EDC RULE** — Equipment Direct Cost (EDC) = operator labor cost + fuel cost. When an analysis uses equipment, the equipment's labor and material costs get "exploded" into the Labor and Material totals. EDC is **NOT** a separate cost line — it's already counted inside Labor + Material. Only **Depreciation (EDP)** is added as a separate line item.

2. **Base quantity in analysis** — Each analysis item defines a `base_quantity` (e.g., "per 1000 cum"). All resource quantities are for that base. The unit rate = total cost / base_quantity.

3. **BoQ coefficients** — A BoQ item references analysis items with coefficients (e.g., 0.5 means 50% of the unit rate). The BoQ unit rate = Σ(coefficient × analysis_unit_rate). Total = unit_rate × quantity.

4. **Resource explosion aggregation** — When computing project-level resource summaries, you must trace from BoQ → Analysis → Resources → Equipment sub-resources, accumulating quantities. Equipment hours contribute their sub-resource quantities (labor hours, fuel liters) to the labor/material totals.

5. **Decimal precision** — Use `Decimal` (Prisma) / `numeric(18,6)` in Postgres for all monetary and quantity fields. Never use floating point.

### Validation Checkpoints

After each phase, run the test suite. The seed data and expected outputs in Section 10 are your ground truth. If the numbers don't match exactly, something is wrong.

### File Structure

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Dashboard
│   ├── projects/
│   │   └── [projectId]/
│   │       ├── page.tsx            # Project overview
│   │       ├── labor/page.tsx
│   │       ├── materials/page.tsx
│   │       ├── equipment/page.tsx
│   │       ├── analysis/page.tsx
│   │       ├── boq/page.tsx
│   │       └── reports/page.tsx
│   └── api/
│       └── v1/
│           ├── projects/route.ts
│           ├── labor/route.ts
│           ├── materials/route.ts
│           ├── equipment/route.ts
│           ├── analysis/route.ts
│           ├── boq/route.ts
│           └── reports/route.ts
├── lib/
│   ├── db.ts                       # Prisma client
│   ├── calculation-engine.ts       # Resource explosion (pure functions)
│   ├── validators.ts               # Zod schemas
│   └── types.ts                    # Shared TypeScript types
├── components/
│   ├── ui/                         # shadcn components
│   ├── data-table.tsx              # Reusable CRUD table
│   ├── resource-picker.tsx         # Reusable resource selector dialog
│   ├── cost-breakdown-card.tsx     # Shows DC/DP/TC breakdown
│   └── layout/
│       ├── sidebar.tsx
│       └── header.tsx
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts                     # Test data from Section 10
│   └── migrations/
└── __tests__/
    ├── calculation-engine.test.ts  # Unit tests for explosion algorithm
    └── api/                        # API integration tests
```

---

## 1. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript (strict mode) |
| Database | PostgreSQL 15+ (SQLite acceptable for MVP) |
| ORM | Prisma 5+ |
| Styling | Tailwind CSS 3 + shadcn/ui |
| Forms | React Hook Form + Zod |
| Tables | TanStack Table v8 |
| Export | xlsx (SheetJS) for Excel, @react-pdf/renderer or jspdf for PDF |
| Import | xlsx (SheetJS) for Excel parsing |
| Testing | Vitest + Prisma test utils |

**Standalone app** — not integrated into cpro. This is the production version.

---

## 2. Database Schema

### 2.1 `currencies`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | uuid | PK, default gen | |
| code | varchar(3) | UNIQUE, NOT NULL | ISO 4217 (USD, TRY, EUR) |
| name | varchar(100) | NOT NULL | Display name |
| symbol | varchar(5) | NOT NULL | e.g. $, ₺, € |
| exchange_rate | numeric(18,6) | NOT NULL, default 1 | Rate relative to base currency |
| is_base | boolean | NOT NULL, default false | Only one row should be true |
| created_at | timestamptz | default now() | |
| updated_at | timestamptz | auto-update | |

### 2.2 `projects`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | uuid | PK | |
| name | varchar(255) | NOT NULL | |
| description | text | | |
| currency_id | uuid | FK → currencies.id, NOT NULL | Project base currency |
| status | varchar(20) | NOT NULL, default 'active' | active / archived |
| created_at | timestamptz | default now() | |
| updated_at | timestamptz | auto-update | |

### 2.3 `labor`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | uuid | PK | |
| project_id | uuid | FK → projects.id, NOT NULL, ON DELETE CASCADE | |
| code | varchar(20) | NOT NULL | e.g. "1001" |
| name | varchar(255) | NOT NULL | e.g. "Unskilled Laborer" |
| unit | varchar(20) | NOT NULL | e.g. "hr" |
| rate | numeric(18,6) | NOT NULL | Cost per unit |
| created_at | timestamptz | | |
| updated_at | timestamptz | | |

**Unique:** (project_id, code)

### 2.4 `materials`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | uuid | PK | |
| project_id | uuid | FK → projects.id, NOT NULL, ON DELETE CASCADE | |
| code | varchar(20) | NOT NULL | e.g. "2001" |
| name | varchar(255) | NOT NULL | |
| unit | varchar(20) | NOT NULL | e.g. "lt", "ton" |
| rate | numeric(18,6) | NOT NULL | Cost per unit |
| created_at | timestamptz | | |
| updated_at | timestamptz | | |

**Unique:** (project_id, code)

### 2.5 `equipment`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | uuid | PK | |
| project_id | uuid | FK → projects.id, NOT NULL, ON DELETE CASCADE | |
| code | varchar(20) | NOT NULL | e.g. "6001" |
| name | varchar(255) | NOT NULL | |
| unit | varchar(20) | NOT NULL | e.g. "hr" |
| total_value | numeric(18,6) | NOT NULL | Purchase/replacement value |
| depreciation_total | numeric(18,6) | NOT NULL | Total useful life in equipment-units (e.g. 20,000 hours) |
| created_at | timestamptz | | |
| updated_at | timestamptz | | |

**Unique:** (project_id, code)

**Computed (not stored):**
- `depreciation_per_unit` = total_value / depreciation_total
- `direct_cost_per_unit` = Σ(sub-resource quantity × sub-resource rate)
- `total_cost_per_unit` = direct_cost_per_unit + depreciation_per_unit

### 2.6 `equipment_resources`

Junction table: what labor and materials each equipment consumes per unit (hour).

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | uuid | PK | |
| equipment_id | uuid | FK → equipment.id, NOT NULL, ON DELETE CASCADE | |
| resource_type | varchar(10) | NOT NULL, CHECK IN ('labor','material') | |
| resource_id | uuid | NOT NULL | FK to labor.id or materials.id (application-enforced) |
| quantity | numeric(18,6) | NOT NULL | Quantity per equipment unit |
| created_at | timestamptz | | |

**Unique:** (equipment_id, resource_type, resource_id)

> **Note:** `resource_id` references either `labor.id` or `materials.id` depending on `resource_type`. Enforce via application logic or a trigger. Do NOT use polymorphic FK in Prisma — use two nullable FK columns if preferred:

Alternative Prisma-friendly design:

| Column | Type | Constraints |
|--------|------|------------|
| id | uuid | PK |
| equipment_id | uuid | FK → equipment.id |
| labor_id | uuid | FK → labor.id, NULLABLE |
| material_id | uuid | FK → materials.id, NULLABLE |
| quantity | numeric(18,6) | NOT NULL |

**Check constraint:** exactly one of (labor_id, material_id) must be non-null.

### 2.7 `analysis`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | uuid | PK | |
| project_id | uuid | FK → projects.id, NOT NULL, ON DELETE CASCADE | |
| code | varchar(20) | NOT NULL | e.g. "7001" |
| name | varchar(255) | NOT NULL | e.g. "Excavation" |
| unit | varchar(20) | NOT NULL | Output unit, e.g. "cum" |
| base_quantity | numeric(18,6) | NOT NULL | Quantity the resource amounts are defined for (e.g. 1000) |
| created_at | timestamptz | | |
| updated_at | timestamptz | | |

**Unique:** (project_id, code)

**Computed:**
- `direct_cost` = Σ(resource costs) — with equipment exploded into labor+material
- `depreciation` = Σ(equipment hours × equipment depreciation_per_unit)
- `total_cost` = direct_cost + depreciation
- `unit_rate_dc` = direct_cost / base_quantity
- `unit_rate_dp` = depreciation / base_quantity
- `unit_rate_tc` = total_cost / base_quantity

### 2.8 `analysis_resources`

Junction table: what resources each analysis uses.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | uuid | PK | |
| analysis_id | uuid | FK → analysis.id, NOT NULL, ON DELETE CASCADE | |
| resource_type | varchar(10) | NOT NULL, CHECK IN ('labor','material','equipment') | |
| labor_id | uuid | FK → labor.id, NULLABLE | |
| material_id | uuid | FK → materials.id, NULLABLE | |
| equipment_id | uuid | FK → equipment.id, NULLABLE | |
| quantity | numeric(18,6) | NOT NULL | Quantity used (in resource units) |
| created_at | timestamptz | | |

**Check:** exactly one of (labor_id, material_id, equipment_id) must be non-null, matching resource_type.

### 2.9 `boq_items`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | uuid | PK | |
| project_id | uuid | FK → projects.id, NOT NULL, ON DELETE CASCADE | |
| code | varchar(20) | NOT NULL | e.g. "9001" |
| name | varchar(255) | NOT NULL | |
| unit | varchar(20) | NOT NULL | e.g. "cum" |
| quantity | numeric(18,6) | NOT NULL | Total project quantity |
| created_at | timestamptz | | |
| updated_at | timestamptz | | |

**Unique:** (project_id, code)

### 2.10 `boq_analysis`

Junction table: which analysis items compose a BoQ item.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | uuid | PK | |
| boq_item_id | uuid | FK → boq_items.id, NOT NULL, ON DELETE CASCADE | |
| analysis_id | uuid | FK → analysis.id, NOT NULL | |
| coefficient | numeric(18,6) | NOT NULL | e.g. 0.5 for 50% |
| created_at | timestamptz | | |

**Unique:** (boq_item_id, analysis_id)

---

## 3. Resource Explosion Algorithm

### 3.1 Core Concepts

```
TERMINOLOGY:
  EDC = Equipment Direct Cost (operator labor + fuel per hour)
  EDP = Equipment Depreciation Per unit (total_value / depreciation_total)
  ETC = Equipment Total Cost = EDC + EDP

  ADC = Analysis Direct Cost (all labor + material costs, with equipment exploded)
  ADP = Analysis Depreciation (equipment depreciation only)
  ATC = Analysis Total Cost = ADC + ADP

  BDC = BoQ Direct Cost
  BDP = BoQ Depreciation
  BTC = BoQ Total Cost
```

### 3.2 Algorithm — Equipment Cost Calculation

```typescript
function computeEquipmentCosts(equipment: Equipment, subResources: EquipmentResource[]): EquipmentCosts {
  let edc = 0; // direct cost per equipment-unit
  for (const res of subResources) {
    if (res.resource_type === 'labor') {
      edc += res.quantity * res.labor.rate;
    } else if (res.resource_type === 'material') {
      edc += res.quantity * res.material.rate;
    }
  }
  const edp = equipment.total_value / equipment.depreciation_total;
  return { edc, edp, etc: edc + edp };
}
```

### 3.3 Algorithm — Analysis Cost Calculation

```typescript
function computeAnalysisCosts(analysis: Analysis, resources: AnalysisResource[]): AnalysisCosts {
  let directCost = 0;
  let depreciation = 0;

  for (const res of resources) {
    switch (res.resource_type) {
      case 'labor':
        directCost += res.quantity * res.labor.rate;
        break;
      case 'material':
        directCost += res.quantity * res.material.rate;
        break;
      case 'equipment': {
        const eqCosts = computeEquipmentCosts(res.equipment, res.equipment.subResources);
        // Equipment's direct cost (labor+fuel) goes into directCost
        directCost += res.quantity * eqCosts.edc;
        // Only depreciation is separate
        depreciation += res.quantity * eqCosts.edp;
        break;
      }
    }
  }

  return {
    directCost,
    depreciation,
    totalCost: directCost + depreciation,
    unitRateDC: directCost / analysis.base_quantity,
    unitRateDP: depreciation / analysis.base_quantity,
    unitRateTC: (directCost + depreciation) / analysis.base_quantity,
  };
}
```

### 3.4 Algorithm — BoQ Cost Calculation

```typescript
function computeBoqCosts(boqItem: BoqItem, boqAnalyses: BoqAnalysis[]): BoqCosts {
  let unitRateDC = 0;
  let unitRateDP = 0;

  for (const ba of boqAnalyses) {
    const analysisCosts = computeAnalysisCosts(ba.analysis, ba.analysis.resources);
    unitRateDC += ba.coefficient * analysisCosts.unitRateDC;
    unitRateDP += ba.coefficient * analysisCosts.unitRateDP;
  }

  return {
    unitRateDC,
    unitRateDP,
    unitRateTC: unitRateDC + unitRateDP,
    totalDC: unitRateDC * boqItem.quantity,
    totalDP: unitRateDP * boqItem.quantity,
    totalTC: (unitRateDC + unitRateDP) * boqItem.quantity,
  };
}
```

### 3.5 Algorithm — Project Resource Explosion (Aggregation)

This traces from BoQ items down to base resources, accumulating total quantities needed across the entire project.

```typescript
interface ResourceAccumulator {
  labor: Map<string, { resource: Labor; totalQty: number }>;
  materials: Map<string, { resource: Material; totalQty: number }>;
  equipment: Map<string, { resource: Equipment; totalHours: number }>;
}

function explodeProject(project: Project): ResourceAccumulator {
  const acc: ResourceAccumulator = {
    labor: new Map(),
    materials: new Map(),
    equipment: new Map(),
  };

  for (const boqItem of project.boqItems) {
    for (const ba of boqItem.boqAnalyses) {
      // How many "base units" of this analysis does this BoQ item need?
      const analysisBaseUnits = ba.coefficient * boqItem.quantity / ba.analysis.base_quantity;
      // e.g., coeff=0.5, qty=1,000,000, base=1000 → 500 base units

      for (const res of ba.analysis.resources) {
        const totalResourceQty = res.quantity * analysisBaseUnits;

        switch (res.resource_type) {
          case 'labor':
            addToMap(acc.labor, res.labor.id, res.labor, totalResourceQty);
            break;
          case 'material':
            addToMap(acc.materials, res.material.id, res.material, totalResourceQty);
            break;
          case 'equipment': {
            addToMap(acc.equipment, res.equipment.id, res.equipment, totalResourceQty);
            // Explode equipment sub-resources
            for (const subRes of res.equipment.subResources) {
              const subQty = subRes.quantity * totalResourceQty;
              if (subRes.resource_type === 'labor') {
                addToMap(acc.labor, subRes.labor.id, subRes.labor, subQty);
              } else {
                addToMap(acc.materials, subRes.material.id, subRes.material, subQty);
              }
            }
            break;
          }
        }
      }
    }
  }

  return acc;
}

// Helper
function addToMap(map, id, resource, qty) {
  const existing = map.get(id);
  if (existing) existing.totalQty += qty;
  else map.set(id, { resource, totalQty: qty });
}
```

### 3.6 Circular Reference Detection

Before computing, validate that no circular references exist:
- Equipment cannot reference itself as a sub-resource
- Analysis cannot reference equipment that references the analysis (not possible in this schema, but guard anyway)

```typescript
function validateNoCircularRefs(project: Project): string[] {
  const errors: string[] = [];
  // Equipment sub-resources can only be labor or material — no nesting
  // Analysis resources can be labor, material, or equipment — no analysis-to-analysis
  // BoQ references analysis — no BoQ-to-BoQ
  // The schema inherently prevents cycles. But validate data integrity:
  for (const eq of project.equipment) {
    for (const sub of eq.subResources) {
      if (sub.resource_type !== 'labor' && sub.resource_type !== 'material') {
        errors.push(`Equipment ${eq.code} has invalid sub-resource type: ${sub.resource_type}`);
      }
    }
  }
  return errors;
}
```

---

## 4. API Routes

All routes prefixed with `/api/v1`. All return JSON. Standard responses:
- Success: `{ data: T }`
- Error: `{ error: string, details?: any }`
- List: `{ data: T[], count: number }`

### Projects

| Method | Path | Description |
|--------|------|-------------|
| GET | /projects | List all projects |
| POST | /projects | Create project |
| GET | /projects/:id | Get project detail |
| PUT | /projects/:id | Update project |
| DELETE | /projects/:id | Delete project (cascade) |

### Labor (scoped to project)

| Method | Path | Description |
|--------|------|-------------|
| GET | /projects/:pid/labor | List labor items |
| POST | /projects/:pid/labor | Create labor item |
| GET | /projects/:pid/labor/:id | Get single |
| PUT | /projects/:pid/labor/:id | Update |
| DELETE | /projects/:pid/labor/:id | Delete |

### Materials (same pattern)

| Method | Path | Description |
|--------|------|-------------|
| GET | /projects/:pid/materials | List |
| POST | /projects/:pid/materials | Create |
| GET | /projects/:pid/materials/:id | Get |
| PUT | /projects/:pid/materials/:id | Update |
| DELETE | /projects/:pid/materials/:id | Delete |

### Equipment

| Method | Path | Description |
|--------|------|-------------|
| GET | /projects/:pid/equipment | List (includes computed costs) |
| POST | /projects/:pid/equipment | Create |
| GET | /projects/:pid/equipment/:id | Get (includes sub-resources & costs) |
| PUT | /projects/:pid/equipment/:id | Update |
| DELETE | /projects/:pid/equipment/:id | Delete |

### Equipment Resources (sub-resources)

| Method | Path | Description |
|--------|------|-------------|
| GET | /projects/:pid/equipment/:eid/resources | List sub-resources |
| POST | /projects/:pid/equipment/:eid/resources | Add sub-resource |
| PUT | /projects/:pid/equipment/:eid/resources/:id | Update quantity |
| DELETE | /projects/:pid/equipment/:eid/resources/:id | Remove |

### Analysis

| Method | Path | Description |
|--------|------|-------------|
| GET | /projects/:pid/analysis | List (includes computed costs) |
| POST | /projects/:pid/analysis | Create |
| GET | /projects/:pid/analysis/:id | Get (includes resources & costs) |
| PUT | /projects/:pid/analysis/:id | Update |
| DELETE | /projects/:pid/analysis/:id | Delete |

### Analysis Resources

| Method | Path | Description |
|--------|------|-------------|
| GET | /projects/:pid/analysis/:aid/resources | List |
| POST | /projects/:pid/analysis/:aid/resources | Add resource |
| PUT | /projects/:pid/analysis/:aid/resources/:id | Update |
| DELETE | /projects/:pid/analysis/:aid/resources/:id | Remove |

### BoQ Items

| Method | Path | Description |
|--------|------|-------------|
| GET | /projects/:pid/boq | List (includes computed costs) |
| POST | /projects/:pid/boq | Create |
| GET | /projects/:pid/boq/:id | Get (includes analysis refs & costs) |
| PUT | /projects/:pid/boq/:id | Update |
| DELETE | /projects/:pid/boq/:id | Delete |

### BoQ Analysis (composition)

| Method | Path | Description |
|--------|------|-------------|
| GET | /projects/:pid/boq/:bid/analysis | List analysis refs |
| POST | /projects/:pid/boq/:bid/analysis | Add analysis ref |
| PUT | /projects/:pid/boq/:bid/analysis/:id | Update coefficient |
| DELETE | /projects/:pid/boq/:bid/analysis/:id | Remove |

### Reports

| Method | Path | Description |
|--------|------|-------------|
| GET | /projects/:pid/reports/resource-explosion | Full resource explosion summary |
| GET | /projects/:pid/reports/resource-explosion?format=excel | Download as Excel |
| GET | /projects/:pid/reports/resource-explosion?format=pdf | Download as PDF |
| GET | /projects/:pid/reports/boq-summary | BoQ cost summary |

### Import/Export

| Method | Path | Description |
|--------|------|-------------|
| POST | /projects/:pid/import/excel | Upload Excel file, bulk import resources |
| GET | /projects/:pid/export/excel | Export all project data as Excel |

### Currencies

| Method | Path | Description |
|--------|------|-------------|
| GET | /currencies | List |
| POST | /currencies | Create |
| PUT | /currencies/:id | Update |
| DELETE | /currencies/:id | Delete |

---

## 5. Zod Validation Schemas

```typescript
import { z } from 'zod';

export const LaborSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(255),
  unit: z.string().min(1).max(20),
  rate: z.number().positive(),
});

export const MaterialSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(255),
  unit: z.string().min(1).max(20),
  rate: z.number().positive(),
});

export const EquipmentSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(255),
  unit: z.string().min(1).max(20),
  total_value: z.number().positive(),
  depreciation_total: z.number().positive(),
});

export const EquipmentResourceSchema = z.object({
  resource_type: z.enum(['labor', 'material']),
  labor_id: z.string().uuid().nullable().optional(),
  material_id: z.string().uuid().nullable().optional(),
  quantity: z.number().positive(),
}).refine(data => {
  if (data.resource_type === 'labor') return !!data.labor_id && !data.material_id;
  if (data.resource_type === 'material') return !!data.material_id && !data.labor_id;
  return false;
});

export const AnalysisSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(255),
  unit: z.string().min(1).max(20),
  base_quantity: z.number().positive(),
});

export const AnalysisResourceSchema = z.object({
  resource_type: z.enum(['labor', 'material', 'equipment']),
  labor_id: z.string().uuid().nullable().optional(),
  material_id: z.string().uuid().nullable().optional(),
  equipment_id: z.string().uuid().nullable().optional(),
  quantity: z.number().positive(),
});

export const BoqItemSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(255),
  unit: z.string().min(1).max(20),
  quantity: z.number().positive(),
});

export const BoqAnalysisSchema = z.object({
  analysis_id: z.string().uuid(),
  coefficient: z.number().positive().max(1), // typically 0-1, but could be >1
});
```

---

## 6. UI Wireframe Descriptions

### 6.1 Dashboard (`/`)

- Project list as cards (name, status, date, currency)
- "New Project" button → modal with name, description, currency picker
- Each card links to `/projects/[id]`
- Summary stats: total projects, total BoQ value across projects

### 6.2 Project Overview (`/projects/[id]`)

- Sidebar navigation: Labor | Materials | Equipment | Analysis | BoQ | Reports
- Main area: project name, description, quick stats:
  - Count of labor / materials / equipment / analysis / BoQ items
  - Total project cost (BTC sum)
- Edit project name/description inline

### 6.3 Labor Page (`/projects/[id]/labor`)

- Data table with columns: Code, Name, Unit, Rate, Actions (edit/delete)
- Sortable by any column
- Inline editing (click cell to edit) OR edit modal
- "Add Labor" button → form: code, name, unit, rate
- Bulk import button (Excel)
- Delete with confirmation

### 6.4 Materials Page (`/projects/[id]/materials`)

Same layout as Labor: Code, Name, Unit, Rate, Actions.

### 6.5 Equipment Page (`/projects/[id]/equipment`)

- Data table: Code, Name, Unit, Total Value, Depr Total, EDC/hr, EDP/hr, ETC/hr, Actions
- EDC, EDP, ETC columns are computed and displayed as read-only
- Click row → expands or navigates to equipment detail

**Equipment Detail / Resource Breakdown Editor:**
- Top: equipment info (code, name, total_value, depreciation_total)
- Computed summary card: EDC = X, EDP = Y, ETC = Z
- Sub-resources table: Type (Labor/Material), Resource (dropdown), Quantity, Cost (computed)
- "Add Resource" button → picker dialog showing available labor + materials
- Real-time recalculation of EDC/EDP/ETC as resources are added/removed/changed

### 6.6 Analysis Builder (`/projects/[id]/analysis`)

- List view: Code, Name, Unit, Base Qty, ADC/unit, ADP/unit, ATC/unit, Actions

**Analysis Detail / Builder:**
- Top: analysis info (code, name, unit, base_quantity)
- Cost breakdown card: shows ADC, ADP, ATC (total and per-unit) — updates in real-time
- Resources table:
  - Type (Labor/Material/Equipment)
  - Resource (name + code)
  - Quantity
  - Unit Cost (rate or EDC for equipment)
  - Total Cost (qty × rate)
  - Depreciation (only for equipment rows: qty × EDP)
- "Add Resource" button → tabbed picker dialog:
  - Tab 1: Labor (searchable list)
  - Tab 2: Materials (searchable list)
  - Tab 3: Equipment (searchable list, shows ETC for each)
- Totals row at bottom

### 6.7 BoQ Manager (`/projects/[id]/boq`)

- List view: Code, Name, Unit, Quantity, BDC/unit, BDP/unit, BTC/unit, Total Cost, Actions
- Grand totals row at bottom

**BoQ Detail:**
- Top: BoQ item info (code, name, unit, quantity)
- Cost breakdown card: BDC, BDP, BTC (per-unit and total)
- Analysis composition table:
  - Analysis (code + name)
  - Coefficient
  - ADC/unit, ADP/unit, ATC/unit (from analysis)
  - Weighted DC, Weighted DP, Weighted TC (coefficient × analysis unit rates)
- "Add Analysis" button → picker showing available analysis items
- Coefficient input (numeric, typically 0-1)
- Note/warning if coefficients don't sum to 1.0 (informational, not blocking)

### 6.8 Resource Explosion Report (`/projects/[id]/reports`)

- Full-page report view with print-friendly layout
- Sections:
  1. **Labor Summary**: resource name, total hours, rate, total cost
  2. **Material Summary**: resource name, total qty, unit, rate, total cost
  3. **Equipment Summary**: resource name, total hours, depreciation/hr, total depreciation
  4. **Cost Summary**:
     - Total Labor Cost
     - Total Material Cost
     - **Total Direct Cost** (= Labor + Material, includes equipment operator costs)
     - Total Depreciation
     - **Grand Total**
  5. **BoQ Summary**: each BoQ item with DC, DP, TC
- Export buttons: Excel, PDF
- Expandable detail: click any BoQ item to see its analysis breakdown, click analysis to see resource breakdown

---

## 7. Import/Export

### 7.1 Excel Import

**Format:** Single Excel workbook with named sheets:

| Sheet Name | Columns |
|-----------|---------|
| Labor | Code, Name, Unit, Rate |
| Materials | Code, Name, Unit, Rate |
| Equipment | Code, Name, Unit, Total Value, Depreciation Total |
| Equipment Resources | Equipment Code, Resource Type (labor/material), Resource Code, Quantity |
| Analysis | Code, Name, Unit, Base Quantity |
| Analysis Resources | Analysis Code, Resource Type, Resource Code, Quantity |
| BoQ | Code, Name, Unit, Quantity |
| BoQ Analysis | BoQ Code, Analysis Code, Coefficient |

**Import logic:**
1. Parse all sheets
2. Validate all codes exist before importing junctions
3. Import in order: Labor → Materials → Equipment → Equipment Resources → Analysis → Analysis Resources → BoQ → BoQ Analysis
4. Return import summary: rows imported per sheet, errors

**UI:** Drop zone or file input on each page (imports just that resource type) + full project import on project settings page.

### 7.2 Excel Export

Same format as import. One workbook with all sheets populated from current project data.

### 7.3 PDF Export

Report format matching the Resource Explosion Report UI. Include:
- Project header (name, date, currency)
- All summary tables
- Page breaks between sections

---

## 8. Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Currency {
  id           String    @id @default(uuid())
  code         String    @unique @db.VarChar(3)
  name         String    @db.VarChar(100)
  symbol       String    @db.VarChar(5)
  exchangeRate Decimal   @default(1) @map("exchange_rate") @db.Decimal(18, 6)
  isBase       Boolean   @default(false) @map("is_base")
  projects     Project[]
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  @@map("currencies")
}

model Project {
  id          String      @id @default(uuid())
  name        String      @db.VarChar(255)
  description String?     @db.Text
  currencyId  String      @map("currency_id")
  currency    Currency    @relation(fields: [currencyId], references: [id])
  status      String      @default("active") @db.VarChar(20)
  labor       Labor[]
  materials   Material[]
  equipment   Equipment[]
  analysis    Analysis[]
  boqItems    BoqItem[]
  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @updatedAt @map("updated_at")

  @@map("projects")
}

model Labor {
  id                  String              @id @default(uuid())
  projectId           String              @map("project_id")
  project             Project             @relation(fields: [projectId], references: [id], onDelete: Cascade)
  code                String              @db.VarChar(20)
  name                String              @db.VarChar(255)
  unit                String              @db.VarChar(20)
  rate                Decimal             @db.Decimal(18, 6)
  equipmentResources  EquipmentResource[]
  analysisResources   AnalysisResource[]
  createdAt           DateTime            @default(now()) @map("created_at")
  updatedAt           DateTime            @updatedAt @map("updated_at")

  @@unique([projectId, code])
  @@map("labor")
}

model Material {
  id                  String              @id @default(uuid())
  projectId           String              @map("project_id")
  project             Project             @relation(fields: [projectId], references: [id], onDelete: Cascade)
  code                String              @db.VarChar(20)
  name                String              @db.VarChar(255)
  unit                String              @db.VarChar(20)
  rate                Decimal             @db.Decimal(18, 6)
  equipmentResources  EquipmentResource[]
  analysisResources   AnalysisResource[]
  createdAt           DateTime            @default(now()) @map("created_at")
  updatedAt           DateTime            @updatedAt @map("updated_at")

  @@unique([projectId, code])
  @@map("materials")
}

model Equipment {
  id                 String              @id @default(uuid())
  projectId          String              @map("project_id")
  project            Project             @relation(fields: [projectId], references: [id], onDelete: Cascade)
  code               String              @db.VarChar(20)
  name               String              @db.VarChar(255)
  unit               String              @db.VarChar(20)
  totalValue         Decimal             @map("total_value") @db.Decimal(18, 6)
  depreciationTotal  Decimal             @map("depreciation_total") @db.Decimal(18, 6)
  subResources       EquipmentResource[]
  analysisResources  AnalysisResource[]
  createdAt          DateTime            @default(now()) @map("created_at")
  updatedAt          DateTime            @updatedAt @map("updated_at")

  @@unique([projectId, code])
  @@map("equipment")
}

model EquipmentResource {
  id           String    @id @default(uuid())
  equipmentId  String    @map("equipment_id")
  equipment    Equipment @relation(fields: [equipmentId], references: [id], onDelete: Cascade)
  resourceType String    @map("resource_type") @db.VarChar(10)
  laborId      String?   @map("labor_id")
  labor        Labor?    @relation(fields: [laborId], references: [id])
  materialId   String?   @map("material_id")
  material     Material? @relation(fields: [materialId], references: [id])
  quantity     Decimal   @db.Decimal(18, 6)
  createdAt    DateTime  @default(now()) @map("created_at")

  @@unique([equipmentId, resourceType, laborId, materialId])
  @@map("equipment_resources")
}

model Analysis {
  id            String             @id @default(uuid())
  projectId     String             @map("project_id")
  project       Project            @relation(fields: [projectId], references: [id], onDelete: Cascade)
  code          String             @db.VarChar(20)
  name          String             @db.VarChar(255)
  unit          String             @db.VarChar(20)
  baseQuantity  Decimal            @map("base_quantity") @db.Decimal(18, 6)
  resources     AnalysisResource[]
  boqAnalyses   BoqAnalysis[]
  createdAt     DateTime           @default(now()) @map("created_at")
  updatedAt     DateTime           @updatedAt @map("updated_at")

  @@unique([projectId, code])
  @@map("analysis")
}

model AnalysisResource {
  id           String     @id @default(uuid())
  analysisId   String     @map("analysis_id")
  analysis     Analysis   @relation(fields: [analysisId], references: [id], onDelete: Cascade)
  resourceType String     @map("resource_type") @db.VarChar(10)
  laborId      String?    @map("labor_id")
  labor        Labor?     @relation(fields: [laborId], references: [id])
  materialId   String?    @map("material_id")
  material     Material?  @relation(fields: [materialId], references: [id])
  equipmentId  String?    @map("equipment_id")
  equipment    Equipment? @relation(fields: [equipmentId], references: [id])
  quantity     Decimal    @db.Decimal(18, 6)
  createdAt    DateTime   @default(now()) @map("created_at")

  @@map("analysis_resources")
}

model BoqItem {
  id          String        @id @default(uuid())
  projectId   String        @map("project_id")
  project     Project       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  code        String        @db.VarChar(20)
  name        String        @db.VarChar(255)
  unit        String        @db.VarChar(20)
  quantity    Decimal       @db.Decimal(18, 6)
  boqAnalyses BoqAnalysis[]
  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")

  @@unique([projectId, code])
  @@map("boq_items")
}

model BoqAnalysis {
  id          String   @id @default(uuid())
  boqItemId   String   @map("boq_item_id")
  boqItem     BoqItem  @relation(fields: [boqItemId], references: [id], onDelete: Cascade)
  analysisId  String   @map("analysis_id")
  analysis    Analysis @relation(fields: [analysisId], references: [id])
  coefficient Decimal  @db.Decimal(18, 6)
  createdAt   DateTime @default(now()) @map("created_at")

  @@unique([boqItemId, analysisId])
  @@map("boq_analysis")
}
```

---

## 9. Environment & Setup

```bash
# .env
DATABASE_URL="postgresql://user:password@localhost:5432/unitrate?schema=public"

# For SQLite MVP:
# DATABASE_URL="file:./dev.db"
```

```bash
npx create-next-app@latest unit-rate-app --typescript --tailwind --app --src-dir
cd unit-rate-app
npx prisma init
npx shadcn-ui@latest init
npm install @prisma/client zod react-hook-form @hookform/resolvers xlsx jspdf
npm install -D prisma vitest @tanstack/react-table
```

---

## 10. Complete Test Data & Expected Outputs

This section is the **single source of truth** for validation. Seed your database with this data and verify all computed outputs match exactly.

### 10.1 Seed Data

```typescript
// prisma/seed.ts

const SEED_DATA = {
  currency: { code: 'USD', name: 'US Dollar', symbol: '$', exchangeRate: 1, isBase: true },

  project: { name: 'Test Project Alpha', description: 'Validation project', status: 'active' },

  labor: [
    { code: '1001', name: 'Unskilled Laborer', unit: 'hr', rate: 6 },
    { code: '1002', name: 'Semi-skilled Laborer', unit: 'hr', rate: 8 },
    { code: '1003', name: 'Skilled Laborer', unit: 'hr', rate: 10 },
  ],

  materials: [
    { code: '2001', name: 'Diesel', unit: 'lt', rate: 4.55 },
    { code: '2002', name: 'Benzine', unit: 'lt', rate: 5 },
    { code: '2003', name: 'Cement', unit: 'ton', rate: 100 },
  ],

  equipment: [
    {
      code: '6001', name: 'Bulldozer', unit: 'hr',
      totalValue: 500000, depreciationTotal: 20000,
      subResources: [
        { type: 'labor', code: '1003', quantity: 1 },    // 1 hr Skilled Labor
        { type: 'material', code: '2001', quantity: 40 }, // 40 lt Diesel
      ],
    },
    {
      code: '6002', name: 'Roller', unit: 'hr',
      totalValue: 250000, depreciationTotal: 25000,
      subResources: [
        { type: 'labor', code: '1003', quantity: 1 },    // 1 hr Skilled Labor
        { type: 'material', code: '2001', quantity: 20 }, // 20 lt Diesel
      ],
    },
  ],

  analysis: [
    {
      code: '7001', name: 'Excavation', unit: 'cum', baseQuantity: 1000,
      resources: [
        { type: 'labor', code: '1002', quantity: 2 },       // 2 hrs Semi-skilled
        { type: 'equipment', code: '6001', quantity: 10 },   // 10 hrs Bulldozer
      ],
    },
    {
      code: '7002', name: 'Soft Excavation', unit: 'cum', baseQuantity: 10000,
      resources: [
        { type: 'labor', code: '1003', quantity: 20 },      // 20 hrs Skilled
        { type: 'equipment', code: '6002', quantity: 200 },  // 200 hrs Roller
        { type: 'material', code: '2003', quantity: 100 },   // 100 tons Cement
      ],
    },
  ],

  boqItems: [
    {
      code: '9001', name: 'Excavation in Bulk', unit: 'cum', quantity: 1000000,
      analyses: [
        { code: '7001', coefficient: 0.5 },
        { code: '7002', coefficient: 0.5 },
      ],
    },
  ],
};
```

### 10.2 Expected Equipment Costs

| Equipment | Code | EDC/hr | EDP/hr | ETC/hr | Calculation |
|-----------|------|--------|--------|--------|-------------|
| Bulldozer | 6001 | 192.00 | 25.00 | 217.00 | EDC=(1×10)+(40×4.55)=10+182=192; EDP=500000/20000=25 |
| Roller | 6002 | 101.00 | 10.00 | 111.00 | EDC=(1×10)+(20×4.55)=10+91=101; EDP=250000/25000=10 |

### 10.3 Expected Analysis Costs

**7001 Excavation** (base_quantity = 1000 cum):

| Resource | Type | Qty | Unit Rate | Cost | Depreciation |
|----------|------|-----|-----------|------|-------------|
| Semi-skilled (1002) | labor | 2 | 8 | 16 | 0 |
| Bulldozer (6001) | equipment | 10 | EDC:192 | 1,920 | 10×25=250 |
| **Totals** | | | | **1,936** | **250** |

- ADC = 1,936 → unit rate: 1,936/1000 = **1.936/cum**
- ADP = 250 → unit rate: 250/1000 = **0.25/cum**
- ATC = 2,186 → unit rate: 2,186/1000 = **2.186/cum**

**7002 Soft Excavation** (base_quantity = 10000 cum):

| Resource | Type | Qty | Unit Rate | Cost | Depreciation |
|----------|------|-----|-----------|------|-------------|
| Skilled (1003) | labor | 20 | 10 | 200 | 0 |
| Roller (6002) | equipment | 200 | EDC:101 | 20,200 | 200×10=2,000 |
| Cement (2003) | material | 100 | 100 | 10,000 | 0 |
| **Totals** | | | | **30,400** | **2,000** |

- ADC = 30,200 → unit rate: 30,200/10000 = **3.02/cum**
- ADP = 2,000 → unit rate: 2,000/10000 = **0.2/cum**
- ATC = 32,200 → unit rate: 32,200/10000 = **3.22/cum**

> **Wait — check the ADC calculation:**
> Labor: 20×10 = 200
> Equipment DC: 200×101 = 20,200
> Material: 100×100 = 10,000
> ADC = 200 + 20,200 + 10,000 = **30,400**
> Unit rate DC = 30,400/10,000 = **3.04/cum**
>
> **DISCREPANCY ALERT:** The original Excel shows ADC = 3.02/cum. Let me re-derive:
> The Excel formula: ADC = (20×10 + 200×101 + 100×100)/10000
> = (200 + 20,200 + 10,000)/10,000
> = 30,400/10,000
> = 3.04
>
> **The original spec says 3.02 but the correct answer is 3.04.** This appears to be a rounding error in the original document. The value 3.02 would require ADC = 30,200, which would mean equipment DC of 20,000 (i.e., 200×100=20,000). But 200 hrs × 101/hr = 20,200.
>
> **CORRECTION:** Use **3.04/cum** as the correct ADC unit rate for Analysis 7002.

**Corrected 7002:**
- ADC = 30,400 → unit rate: **3.04/cum**
- ADP = 2,000 → unit rate: **0.2/cum**
- ATC = 32,400 → unit rate: **3.24/cum**

### 10.4 Expected BoQ Costs

**9001 Excavation in Bulk** (1,000,000 cum):

| Analysis | Coeff | ADC/cum | ADP/cum | ATC/cum | Weighted DC | Weighted DP | Weighted TC |
|----------|-------|---------|---------|---------|-------------|-------------|-------------|
| 7001 | 0.5 | 1.936 | 0.25 | 2.186 | 0.968 | 0.125 | 1.093 |
| 7002 | 0.5 | 3.04 | 0.2 | 3.24 | 1.52 | 0.1 | 1.62 |
| **Totals** | | | | | **2.488** | **0.225** | **2.713** |

- BDC = 2.488 × 1,000,000 = **2,488,000**
- BDP = 0.225 × 1,000,000 = **225,000**
- BTC = 2.713 × 1,000,000 = **2,713,000**

### 10.5 Expected Resource Explosion

Tracing BoQ 9001 (1,000,000 cum) down to base resources:

**From Analysis 7001 (coeff 0.5):**
- Analysis base units needed: 0.5 × 1,000,000 / 1,000 = 500
- Semi-skilled (1002): 2 × 500 = 1,000 hrs
- Bulldozer (6001): 10 × 500 = 5,000 hrs
  - → Skilled (1003): 1 × 5,000 = 5,000 hrs
  - → Diesel (2001): 40 × 5,000 = 200,000 lt

**From Analysis 7002 (coeff 0.5):**
- Analysis base units needed: 0.5 × 1,000,000 / 10,000 = 50
- Skilled (1003): 20 × 50 = 1,000 hrs
- Roller (6002): 200 × 50 = 10,000 hrs
  - → Skilled (1003): 1 × 10,000 = 10,000 hrs
  - → Diesel (2001): 20 × 10,000 = 200,000 lt
- Cement (2003): 100 × 50 = 5,000 tons

**Aggregated Resource Summary:**

| Resource | Code | Total Qty | Unit | Rate | Value |
|----------|------|-----------|------|------|-------|
| Semi-skilled Laborer | 1002 | 1,000 | hr | 8 | 8,000 |
| Skilled Laborer | 1003 | 16,000 | hr | 10 | 160,000 |
| Diesel | 2001 | 400,000 | lt | 4.55 | 1,820,000 |
| Cement | 2003 | 5,000 | ton | 100 | 500,000 |

Skilled Labor breakdown: 5,000 (from bulldozer via 7001) + 1,000 (direct in 7002) + 10,000 (from roller via 7002) = **16,000 hrs** ✓

Diesel breakdown: 200,000 (from bulldozer via 7001) + 200,000 (from roller via 7002) = **400,000 lt** ✓

**Equipment hours (for depreciation):**

| Equipment | Code | Total Hrs | Depr/hr | Total Depreciation |
|-----------|------|-----------|---------|--------------------|
| Bulldozer | 6001 | 5,000 | 25 | 125,000 |
| Roller | 6002 | 10,000 | 10 | 100,000 |

**Final Summary:**

| Category | Value |
|----------|-------|
| Total Labor Cost | 8,000 + 160,000 = **168,000** |
| Total Material Cost | 1,820,000 + 500,000 = **2,320,000** |
| **Total Direct Cost** | **2,488,000** |
| Total Depreciation | 125,000 + 100,000 = **225,000** |
| **Grand Total** | **2,713,000** |

### 10.6 Validation Assertions (for test suite)

```typescript
// __tests__/calculation-engine.test.ts

describe('Equipment Costs', () => {
  test('Bulldozer 6001', () => {
    expect(bulldozerCosts.edc).toBe(192);
    expect(bulldozerCosts.edp).toBe(25);
    expect(bulldozerCosts.etc).toBe(217);
  });
  test('Roller 6002', () => {
    expect(rollerCosts.edc).toBe(101);
    expect(rollerCosts.edp).toBe(10);
    expect(rollerCosts.etc).toBe(111);
  });
});

describe('Analysis Costs', () => {
  test('7001 Excavation', () => {
    expect(analysis7001.directCost).toBe(1936);
    expect(analysis7001.depreciation).toBe(250);
    expect(analysis7001.unitRateDC).toBeCloseTo(1.936, 6);
    expect(analysis7001.unitRateDP).toBeCloseTo(0.25, 6);
    expect(analysis7001.unitRateTC).toBeCloseTo(2.186, 6);
  });
  test('7002 Soft Excavation', () => {
    expect(analysis7002.directCost).toBe(30400);
    expect(analysis7002.depreciation).toBe(2000);
    expect(analysis7002.unitRateDC).toBeCloseTo(3.04, 6);
    expect(analysis7002.unitRateDP).toBeCloseTo(0.2, 6);
    expect(analysis7002.unitRateTC).toBeCloseTo(3.24, 6);
  });
});

describe('BoQ Costs', () => {
  test('9001 Excavation in Bulk', () => {
    expect(boq9001.totalDC).toBe(2488000);
    expect(boq9001.totalDP).toBe(225000);
    expect(boq9001.totalTC).toBe(2713000);
  });
});

describe('Resource Explosion', () => {
  test('Project totals', () => {
    const explosion = explodeProject(project);
    expect(explosion.labor.get('1002').totalQty).toBe(1000);
    expect(explosion.labor.get('1003').totalQty).toBe(16000);
    expect(explosion.materials.get('2001').totalQty).toBe(400000);
    expect(explosion.materials.get('2003').totalQty).toBe(5000);
    expect(explosion.equipment.get('6001').totalHours).toBe(5000);
    expect(explosion.equipment.get('6002').totalHours).toBe(10000);

    const totalDC = 168000 + 2320000;
    expect(totalDC).toBe(2488000);
    const totalDP = 125000 + 100000;
    expect(totalDP).toBe(225000);
    expect(totalDC + totalDP).toBe(2713000);
  });
});
```

---

## 11. Additional Edge Cases to Handle

1. **Equipment with no sub-resources**: EDC = 0, only depreciation applies. Valid scenario (e.g., hand tools with depreciation but no fuel/operator).

2. **Analysis with only materials**: No equipment → depreciation = 0. Simple sum of material costs.

3. **Analysis with only labor**: Same — depreciation = 0.

4. **BoQ with single analysis at coefficient 1.0**: Unit rate = analysis unit rate exactly.

5. **BoQ with coefficients summing to > 1.0 or < 1.0**: Allow it — it's valid (e.g., overlapping methods or partial coverage). Show a warning in the UI but don't block.

6. **Zero quantity resources**: Reject in validation (Zod enforces positive).

7. **Deleting a labor/material that's referenced**: Prisma will enforce FK constraints. Show a user-friendly error: "Cannot delete — used by Equipment X, Analysis Y."

8. **Changing a rate after analysis is built**: All computed values are derived in real-time — no stale cache. Changing a labor rate immediately affects all equipment, analysis, and BoQ costs that reference it.

9. **Multiple BoQ items in a project**: Resource explosion aggregates across ALL BoQ items.

10. **Currency conversion**: If multi-currency is enabled, all rates stored in project currency. Exchange rates apply only for display/reporting in alternative currencies.

---

## 12. Non-Functional Requirements

- **Performance**: Resource explosion for a project with 1000 BoQ items should complete in < 2 seconds
- **Precision**: All monetary calculations use `Decimal` type, never floating point
- **Responsive UI**: Works on tablet and desktop (1024px+). Mobile not required for MVP.
- **No authentication for MVP**: Single-user. Add auth later if needed.
- **Data safety**: Soft-delete for projects (status = 'archived'). Hard-delete for resources with FK protection.

---

*End of specification. This document is self-contained — Cursor should be able to build the complete application from this spec without additional questions.*
