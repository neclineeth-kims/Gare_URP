# BoQ QA Checklist

Manual QA checklist for BoQ CRUD flow. Document results after testing.

## Expected Seed Data (After `npm run db:seed`)

| BoQ Code | Name                       | Qty      | Analyses        | Expected BTC/unit (approx) |
|----------|----------------------------|----------|-----------------|----------------------------|
| 9001     | Excavation in Bulk         | 1,000,000| 7001 (0.5), 7002 (0.5) | 2.713 |
| 9002     | Excavation - Standard Only | 50,000   | 7001 (1.0)      | 2.186                      |

**Reference (SPEC 10.4):** BoQ 9001 total TC = 2,713,000 (unit rate 2.713 × 1,000,000).

---

## 1. List & Search

| Test | Expected | Result |
|------|----------|--------|
| BoQ items load with correct unit + total costs | Table shows unit rate DC/DP/TC and total TC | ☐ |
| Search by code filters results | Typing "9001" shows only 9001 | ☐ |
| Search by name filters results | Typing "Bulk" shows 9001 | ☐ |
| Empty state when no items | After deleting all, message "No BoQ items yet" | ☐ |

---

## 2. Create

| Test | Expected | Result |
|------|----------|--------|
| Add BoQ item | Click "Add BoQ Item", enter code/name/quantity/unit | ☐ |
| Add analyses with coefficients | Use picker, select analysis, set coefficient (e.g. 0.5) | ☐ |
| Save → new row appears | New item in table with accurate cost summary | ☐ |

---

## 3. Edit

| Test | Expected | Result |
|------|----------|--------|
| Modify quantity | Change quantity, Save → costs recalculate | ☐ |
| Modify coefficients | Change coefficient, Save → costs update | ☐ |
| Add analysis | Add new analysis row, Save → costs reflect | ☐ |
| Remove analysis | Remove row, Save → costs decrease | ☐ |

---

## 4. Delete

| Test | Expected | Result |
|------|----------|--------|
| Delete shows confirmation | AlertDialog "Are you sure..." | ☐ |
| After confirm, item disappears | Row removed from table | ☐ |
| Detail panel resets | If deleted item was selected, placeholder shown | ☐ |

---

## 5. Validation

| Test | Expected | Result |
|------|----------|--------|
| Missing code blocks save | Inline error "Code is required" | ☐ |
| Missing name blocks save | Inline error "Name is required" | ☐ |
| Invalid quantity blocks save | "Quantity must be a positive number" | ☐ |
| Negative coefficient | Coefficient input accepts; save uses value (or add validation) | ☐ |

---

## 6. Responsive Behavior

| Test | Expected | Result |
|------|----------|--------|
| Narrow screen | Cards stack vertically, table scrollable | ☐ |
| Form fields stack on mobile | Grid collapses to single column | ☐ |

---

## 7. Integration (Spot-Check)

| Test | Expected | Result |
|------|----------|--------|
| BoQ 9001 costs | Total TC ≈ 2,713,000 (unit 2.713 × 1M) | ☐ |
| BoQ 9002 costs | Unit rate TC ≈ 2.186 (analysis 7001 only) | ☐ |

---

## 8. Error Handling & Toasts

| Test | Expected | Result |
|------|----------|--------|
| Success save | Toast "BoQ item saved" | ☐ |
| Success delete | Toast "BoQ item deleted" | ☐ |
| API error | Toast shows API message or fallback | ☐ |
| No unhandled errors in console | Browser console clean during CRUD | ☐ |

---

## Notes

- Run seed before QA: `npm run db:seed`
- Navigate to `/projects/{projectId}/boq` (use project ID from seed output)
