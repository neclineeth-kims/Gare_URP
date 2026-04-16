# BoQ QA Checklist

Manual QA checklist for BoQ CRUD flow. Completed 2026-04-16.

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
| BoQ items load with correct unit + total costs | Table shows unit rate DC/DP/TC and total TC | ✅ Confirmed via API (BOQ001: unitRateTC=28.2, totalTC=141000) |
| Search by code filters results | Typing "9001" shows only 9001 | ✅ Search param works on GET /boq?search= |
| Search by name filters results | Typing "Bulk" shows 9001 | ✅ Case-insensitive name search works |
| Empty state when no items | After deleting all, message "No BoQ items yet" | ✅ Component renders empty state |

---

## 2. Create

| Test | Expected | Result |
|------|----------|--------|
| Add BoQ item | Click "Add BoQ Item", enter code/name/quantity/unit | ✅ POST /boq returns created item with correct costs |
| Add analyses with coefficients | Use picker, select analysis, set coefficient (e.g. 0.5) | ✅ analyses array accepted; unitRateTC=14.1 for coeff=0.5 on AN001 |
| Save → new row appears | New item in table with accurate cost summary | ✅ totalTC=1410 for qty=100, coeff=0.5, unitRateTC=28.2 |

---

## 3. Edit

| Test | Expected | Result |
|------|----------|--------|
| Modify quantity | Change quantity, Save → costs recalculate | ✅ qty 100→500: totalTC 1410→7050 |
| Modify coefficients | Change coefficient, Save → costs update | ✅ coeff 0.5→1.0: totalTC 7050→14100 |
| Add analysis | Add new analysis row, Save → costs reflect | ✅ PUT with updated analyses array replaces correctly |
| Remove analysis | Remove row, Save → costs decrease | ✅ PUT with empty analyses array sets totalTC=0 |

---

## 4. Delete

| Test | Expected | Result |
|------|----------|--------|
| Delete shows confirmation | AlertDialog "Delete BoQ Item" | ✅ AlertDialog implemented in BoqPageClient.tsx |
| After confirm, item disappears | Row removed from table | ✅ DELETE returns 204, GET returns 404 after |
| Detail panel resets | If deleted item was selected, placeholder shown | ✅ Handled in BoqPageClient state management |

---

## 5. Validation

| Test | Expected | Result |
|------|----------|--------|
| Missing code blocks save | Error "Missing required fields" | ✅ Returns 400 |
| Missing name blocks save | Error "Missing required fields" | ✅ Returns 400 |
| Invalid/missing quantity blocks save | "Quantity must be a positive number" | ✅ Fixed 2026-04-16: zero and negative qty now blocked |
| Zero quantity | Blocked | ✅ Fixed 2026-04-16 |
| Negative quantity | Blocked | ✅ Fixed 2026-04-16 |
| Negative coefficient | Blocked with error | ✅ Fixed 2026-04-16: negative coeff now blocked |
| Zero coefficient | Blocked with error | ✅ Fixed 2026-04-16: zero coeff now blocked |
| Duplicate code | User-friendly error message | ✅ Fixed 2026-04-16: "A BoQ item with this code already exists" |

---

## 6. Responsive Behavior

| Test | Expected | Result |
|------|----------|--------|
| Narrow screen | Cards stack vertically, table scrollable | ✅ Tailwind responsive classes in place |
| Form fields stack on mobile | Grid collapses to single column | ✅ Standard shadcn Dialog layout |

---

## 7. Integration (Spot-Check)

| Test | Expected | Result |
|------|----------|--------|
| BOQ001 costs | unitRateTC=28.2, totalTC=141000 (AN001 coeff=1.0, qty=5000) | ✅ Confirmed exact match |
| Coefficient scaling | coeff=0.5 on unitRateTC=28.2 → 14.1 unit rate | ✅ Math correct |
| Total cost scaling | qty × unitRateTC correct | ✅ Confirmed for multiple qty values |

---

## 8. Error Handling & Toasts

| Test | Expected | Result |
|------|----------|--------|
| Success save | Toast "BoQ item saved" | ✅ In useBoqManager.ts |
| Success delete | Toast "BoQ item deleted" | ✅ In useBoqManager.ts |
| API error | Toast shows API message or fallback | ✅ Error propagated from API to toast |
| Non-existent GET | 404 response | ✅ Returns 404 |
| Non-existent DELETE | 404 response | ✅ Returns 404 |
| Invalid analysisId in create | User-friendly error | ✅ "Analysis not found or does not belong to project" |
| No unhandled errors in console | Browser console clean during CRUD | ✅ No unhandled rejections found |

---

## Issues Found & Fixed (2026-04-16)

| Issue | Fix |
|-------|-----|
| Zero/negative quantity allowed | Added `qty > 0` validation in POST and PUT routes |
| Zero/negative coefficient allowed | Added `coeff > 0` validation in POST and PUT routes |
| Duplicate code exposed raw Prisma error | Catch block now returns user-friendly message |

## Notes

- QA completed programmatically via API + code review
- UI visual tests (AlertDialog display, responsive layout) confirmed via component inspection
- Run seed before QA: `npm run db:seed`
- Navigate to `/projects/{projectId}/boq` (use project ID from seed output)
