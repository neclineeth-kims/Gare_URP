/**
 * Excel import/export utilities using SheetJS (xlsx).
 * All functions run client-side — no server round-trip needed.
 */

// xlsx is a CommonJS package without an "exports" field, so we use require()
// to avoid moduleResolution:"bundler" issues while keeping full type safety.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require("xlsx") as typeof import("xlsx");
type XLSXWorkBook = ReturnType<typeof XLSX.utils.book_new>;
type XLSXWorkSheet = ReturnType<typeof XLSX.utils.json_to_sheet>;

// ── Types ─────────────────────────────────────────────────────────────────────

export type ImportRow = Record<string, unknown>;

export type LaborImportRow = {
  code: string;
  name: string;
  unit: string;
  rate: number;
  currencySlot: number;
  _error?: string;
};

export type MaterialImportRow = LaborImportRow; // same shape

// ── Parse uploaded file ───────────────────────────────────────────────────────

export function parseExcelFile(file: File): Promise<ImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<ImportRow>(ws, { defval: "" });
        resolve(rows);
      } catch {
        reject(new Error("Failed to read file. Make sure it is a valid .xlsx or .csv file."));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsBinaryString(file);
  });
}

// ── Normalise a raw row's keys (case-insensitive, trim spaces) ────────────────

function normalise(row: ImportRow): ImportRow {
  const out: ImportRow = {};
  for (const [k, v] of Object.entries(row)) {
    out[k.trim().toLowerCase().replace(/\s+/g, "_")] = v;
  }
  return out;
}

function str(v: unknown): string {
  return String(v ?? "").trim();
}
function num(v: unknown): number {
  return Number(String(v ?? "").replace(/,/g, "").trim());
}

// ── Validate labor / material rows ────────────────────────────────────────────

export function validateLaborRows(rows: ImportRow[]): LaborImportRow[] {
  return rows.map((raw) => {
    const r = normalise(raw);
    const code = str(r.code || r["labor_code"] || r["lc"]).toUpperCase().slice(0, 6);
    const name = str(r.name || r["description"] || r["labor_name"]);
    const unit = str(r.unit || r["uom"]) || "hr";
    const rate = num(r.rate || r["unit_rate"] || r["cost"]);
    const currencySlot = Math.min(5, Math.max(1, Math.round(num(r.currency_slot || r["slot"] || r["currency"])) || 1));

    const errors: string[] = [];
    if (!code) errors.push("Code required");
    if (!name) errors.push("Name required");
    if (isNaN(rate) || rate <= 0) errors.push("Rate must be > 0");

    return { code, name, unit, rate, currencySlot, _error: errors.join("; ") || undefined };
  });
}

export function validateMaterialRows(rows: ImportRow[]): MaterialImportRow[] {
  return rows.map((raw) => {
    const r = normalise(raw);
    const code = str(r.code || r["material_code"] || r["mc"]).toUpperCase().slice(0, 6);
    const name = str(r.name || r["description"] || r["material_name"]);
    const unit = str(r.unit || r["uom"]);
    const rate = num(r.rate || r["unit_rate"] || r["cost"]);
    const currencySlot = Math.min(5, Math.max(1, Math.round(num(r.currency_slot || r["slot"] || r["currency"])) || 1));

    const errors: string[] = [];
    if (!code) errors.push("Code required");
    if (!name) errors.push("Name required");
    if (!unit) errors.push("Unit required");
    if (isNaN(rate) || rate <= 0) errors.push("Rate must be > 0");

    return { code, name, unit, rate, currencySlot, _error: errors.join("; ") || undefined };
  });
}

// ── Download helpers ──────────────────────────────────────────────────────────

function saveWorkbook(wb: XLSXWorkBook, filename: string) {
  XLSX.writeFile(wb, filename);
}

function makeSheet(data: Record<string, unknown>[], cols?: string[]): XLSXWorkSheet {
  const ws = XLSX.utils.json_to_sheet(data, { header: cols });
  return ws;
}

// ── Export: Labor list ────────────────────────────────────────────────────────

export function exportLabor(
  rows: { code: string; name: string; unit: string; rate: string; currencySlot: number }[],
  filename = "labor.xlsx"
) {
  const data = rows.map((r) => ({
    Code: r.code,
    Name: r.name,
    Unit: r.unit,
    Rate: Number(r.rate),
    "Currency Slot": r.currencySlot,
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, makeSheet(data), "Labor");
  saveWorkbook(wb, filename);
}

// ── Export: Materials list ────────────────────────────────────────────────────

export function exportMaterials(
  rows: { code: string; name: string; unit: string; rate: string; currencySlot: number }[],
  filename = "materials.xlsx"
) {
  const data = rows.map((r) => ({
    Code: r.code,
    Name: r.name,
    Unit: r.unit,
    Rate: Number(r.rate),
    "Currency Slot": r.currencySlot,
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, makeSheet(data), "Materials");
  saveWorkbook(wb, filename);
}

// ── Download: Labor import template ──────────────────────────────────────────

export function downloadLaborTemplate() {
  const data = [{ Code: "LAB001", Name: "Skilled Worker", Unit: "hr", Rate: 10.0, "Currency Slot": 1 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, makeSheet(data), "Labor");
  saveWorkbook(wb, "labor_template.xlsx");
}

// ── Download: Materials import template ──────────────────────────────────────

export function downloadMaterialTemplate() {
  const data = [{ Code: "MAT001", Name: "Cement", Unit: "ton", Rate: 80.0, "Currency Slot": 1 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, makeSheet(data), "Materials");
  saveWorkbook(wb, "materials_template.xlsx");
}

// ── Equipment import types ────────────────────────────────────────────────────

export type EquipmentSheetRow = {
  code: string;
  name: string;
  unit: string;
  totalValue: number;
  depreciationTotal: number;
  _error?: string;
};

export type SubResourceSheetRow = {
  equipmentCode: string;
  resourceType: "labor" | "material";
  resourceCode: string;
  quantity: number;
  _error?: string;
};

export type EquipmentImportData = {
  equipment: EquipmentSheetRow[];
  subResources: SubResourceSheetRow[];
};

// ── Parse equipment 2-sheet file ──────────────────────────────────────────────

export function parseEquipmentFile(file: File): Promise<EquipmentImportData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "binary" });

        // Sheet 1: Equipment
        const eqSheet = wb.Sheets[wb.SheetNames[0]];
        const eqRaw = XLSX.utils.sheet_to_json<ImportRow>(eqSheet, { defval: "" });
        const equipment: EquipmentSheetRow[] = eqRaw.map((raw) => {
          const r = normalise(raw);
          const code = str(r.code || r["equipment_code"] || r["eq_code"]).toUpperCase().slice(0, 10);
          const name = str(r.name || r["description"] || r["equipment_name"]);
          const unit = str(r.unit || r["uom"]) || "hr";
          const totalValue = num(r.total_value || r["totalvalue"] || r["value"]);
          const depreciationTotal = num(r.depreciation_total || r["depreciation"] || r["depr_total"] || r["depr"]);

          const errors: string[] = [];
          if (!code) errors.push("Code required");
          if (!name) errors.push("Name required");
          if (isNaN(totalValue) || totalValue < 0) errors.push("Total Value must be ≥ 0");
          if (isNaN(depreciationTotal) || depreciationTotal < 0) errors.push("Depreciation Total must be ≥ 0");

          return { code, name, unit, totalValue, depreciationTotal, _error: errors.join("; ") || undefined };
        });

        // Sheet 2: Sub-Resources (optional — may be absent)
        let subResources: SubResourceSheetRow[] = [];
        if (wb.SheetNames.length >= 2) {
          const srSheet = wb.Sheets[wb.SheetNames[1]];
          const srRaw = XLSX.utils.sheet_to_json<ImportRow>(srSheet, { defval: "" });
          subResources = srRaw.map((raw) => {
            const r = normalise(raw);
            const equipmentCode = str(r.equipment_code || r["eq_code"] || r["equipmentcode"]).toUpperCase();
            const rawType = str(r.type || r["resource_type"] || r["resourcetype"]).toLowerCase();
            const resourceCode = str(r.resource_code || r["resourcecode"] || r["code"]).toUpperCase();
            const quantity = num(r.quantity || r["qty"]);

            const errors: string[] = [];
            if (!equipmentCode) errors.push("Equipment Code required");
            if (rawType !== "labor" && rawType !== "material") errors.push('Type must be "labor" or "material"');
            if (!resourceCode) errors.push("Resource Code required");
            if (isNaN(quantity) || quantity <= 0) errors.push("Quantity must be > 0");

            return {
              equipmentCode,
              resourceType: rawType === "labor" ? "labor" : "material",
              resourceCode,
              quantity,
              _error: errors.join("; ") || undefined,
            };
          });
        }

        if (equipment.length === 0) {
          reject(new Error("No equipment rows found in Sheet 1."));
          return;
        }
        resolve({ equipment, subResources });
      } catch {
        reject(new Error("Failed to read file. Make sure it is a valid .xlsx or .csv file."));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsBinaryString(file);
  });
}

// ── Export: Equipment list (2-sheet) ──────────────────────────────────────────

type EquipmentExportRow = {
  id: string;
  code: string;
  name: string;
  unit: string;
  totalValue: number;
  depreciationTotal: number;
  subResources: Array<{
    resourceType: string;
    quantity: number;
    labor: { code: string } | null;
    material: { code: string } | null;
  }>;
};

export function exportEquipment(rows: EquipmentExportRow[], filename = "equipment.xlsx") {
  const eqData = rows.map((r) => ({
    Code: r.code,
    Name: r.name,
    Unit: r.unit,
    "Total Value": r.totalValue,
    "Depreciation Total": r.depreciationTotal,
  }));

  const srData: Record<string, unknown>[] = [];
  for (const eq of rows) {
    for (const sr of eq.subResources) {
      const resourceCode = sr.resourceType === "labor" ? sr.labor?.code : sr.material?.code;
      if (!resourceCode) continue;
      srData.push({
        "Equipment Code": eq.code,
        Type: sr.resourceType,
        "Resource Code": resourceCode,
        Quantity: sr.quantity,
      });
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, makeSheet(eqData, ["Code", "Name", "Unit", "Total Value", "Depreciation Total"]), "Equipment");
  XLSX.utils.book_append_sheet(wb, makeSheet(srData, ["Equipment Code", "Type", "Resource Code", "Quantity"]), "Sub-Resources");
  saveWorkbook(wb, filename);
}

// ── Parse analysis 2-sheet file ───────────────────────────────────────────────

export type AnalysisSheetRow = {
  code: string;
  name: string;
  unit: string;
  baseQuantity: number;
  _error?: string;
};

export type AnalysisResourceSheetRow = {
  analysisCode: string;
  resourceType: "labor" | "material" | "equipment";
  resourceCode: string;
  quantity: number;
  _error?: string;
};

export type AnalysisImportData = {
  analyses: AnalysisSheetRow[];
  resources: AnalysisResourceSheetRow[];
};

export function parseAnalysisFile(file: File): Promise<AnalysisImportData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "binary" });
        // Sheet 1: Analyses
        const sheetName1 = wb.SheetNames[0];
        const anRaw = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName1]);
        const analyses: AnalysisSheetRow[] = anRaw.map((r) => {
          const errors: string[] = [];
          const code = str(r.code || r["Code"] || r["analysis_code"]).toUpperCase().slice(0, 20);
          const name = str(r.name || r["Name"] || r["description"]);
          const unit = str(r.unit || r["Unit"]);
          const baseQuantity = num(r.baseQuantity ?? r["base_quantity"] ?? r["Base Quantity"] ?? r["baseqty"] ?? 1);
          if (!code) errors.push("Code required");
          if (!name) errors.push("Name required");
          return { code, name, unit: unit || "unit", baseQuantity, _error: errors.join("; ") || undefined };
        });
        // Sheet 2: Resources
        const sheetName2 = wb.SheetNames[1];
        const resources: AnalysisResourceSheetRow[] = [];
        if (sheetName2) {
          const resRaw = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName2]);
          resRaw.forEach((r) => {
            const errors: string[] = [];
            const analysisCode = str(r.analysis_code || r["Analysis Code"] || r["analysiscode"] || r["analysisCode"]).toUpperCase();
            const rawType = str(r.type || r["Type"] || r["resourceType"] || r["resource_type"]).toLowerCase();
            const resourceType = (["labor", "material", "equipment"].includes(rawType) ? rawType : "") as "labor" | "material" | "equipment";
            const resourceCode = str(r.resource_code || r["Resource Code"] || r["resourceCode"]).toUpperCase();
            const quantity = num(r.quantity || r["Quantity"] || 0);
            if (!analysisCode) errors.push("Analysis Code required");
            if (!resourceType) errors.push("Type must be labor, material, or equipment");
            if (!resourceCode) errors.push("Resource Code required");
            if (quantity <= 0) errors.push("Quantity must be > 0");
            resources.push({ analysisCode, resourceType, resourceCode, quantity, _error: errors.join("; ") || undefined });
          });
        }
        if (analyses.length === 0) { reject(new Error("No analysis rows found in Sheet 1.")); return; }
        resolve({ analyses, resources });
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsBinaryString(file);
  });
}

// ── Export: Analysis list (2-sheet) ───────────────────────────────────────────

type AnalysisExportRow = {
  code: string;
  name: string;
  unit: string;
  baseQuantity: number;
  resources: Array<{ resourceType: string; resourceCode: string; quantity: number }>;
};

export function exportAnalysis(rows: AnalysisExportRow[], filename = "analysis.xlsx") {
  const wb = XLSX.utils.book_new();
  const anData = rows.map((a) => ({
    Code: a.code, Name: a.name, Unit: a.unit, "Base Quantity": a.baseQuantity,
  }));
  const resData = rows.flatMap((a) =>
    a.resources.map((r) => ({
      "Analysis Code": a.code,
      Type: r.resourceType,
      "Resource Code": r.resourceCode,
      Quantity: r.quantity,
    }))
  );
  XLSX.utils.book_append_sheet(wb, makeSheet(anData, ["Code", "Name", "Unit", "Base Quantity"]), "Analyses");
  XLSX.utils.book_append_sheet(wb, makeSheet(resData, ["Analysis Code", "Type", "Resource Code", "Quantity"]), "Resources");
  saveWorkbook(wb, filename);
}

// ── Download: Analysis import template ────────────────────────────────────────

export function downloadAnalysisTemplate() {
  const wb = XLSX.utils.book_new();
  const anData = [
    { Code: "AN001", Name: "Concrete Foundation", Unit: "m3", "Base Quantity": 1 },
    { Code: "AN002", Name: "Brickwork", Unit: "m2", "Base Quantity": 1 },
  ];
  const resData = [
    { "Analysis Code": "AN001", Type: "labor", "Resource Code": "LAB001", Quantity: 2.5 },
    { "Analysis Code": "AN001", Type: "material", "Resource Code": "MAT001", Quantity: 0.3 },
    { "Analysis Code": "AN001", Type: "equipment", "Resource Code": "EQ001", Quantity: 0.5 },
    { "Analysis Code": "AN002", Type: "labor", "Resource Code": "LAB001", Quantity: 1.2 },
  ];
  XLSX.utils.book_append_sheet(wb, makeSheet(anData, ["Code", "Name", "Unit", "Base Quantity"]), "Analyses");
  XLSX.utils.book_append_sheet(wb, makeSheet(resData, ["Analysis Code", "Type", "Resource Code", "Quantity"]), "Resources");
  saveWorkbook(wb, "analysis_template.xlsx");
}

// ── Download: Equipment import template ───────────────────────────────────────

export function downloadEquipmentTemplate() {
  const eqData = [
    { Code: "EQ001", Name: "Excavator", Unit: "hr", "Total Value": 500000, "Depreciation Total": 50000 },
    { Code: "EQ002", Name: "Concrete Mixer", Unit: "hr", "Total Value": 80000, "Depreciation Total": 8000 },
  ];
  const srData = [
    { "Equipment Code": "EQ001", Type: "labor", "Resource Code": "LAB001", Quantity: 1 },
    { "Equipment Code": "EQ001", Type: "material", "Resource Code": "MAT001", Quantity: 0.5 },
    { "Equipment Code": "EQ002", Type: "labor", "Resource Code": "LAB001", Quantity: 0.5 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, makeSheet(eqData, ["Code", "Name", "Unit", "Total Value", "Depreciation Total"]), "Equipment");
  XLSX.utils.book_append_sheet(wb, makeSheet(srData, ["Equipment Code", "Type", "Resource Code", "Quantity"]), "Sub-Resources");
  saveWorkbook(wb, "equipment_template.xlsx");
}

// ── Export: Full Reports workbook ─────────────────────────────────────────────

type ReportData = {
  labor: { resource: { code: string; name: string; unit: string; rate: string }; totalQty: number }[];
  materials: { resource: { code: string; name: string; unit: string; rate: string }; totalQty: number }[];
  equipment: { resource: { code: string; name: string; unit: string }; totalHours: number; deprPerUnit: number; totalDepreciation: number }[];
  totalLaborCost: number;
  totalMaterialCost: number;
  totalDirectCost: number;
  totalDepreciation: number;
  grandTotal: number;
  boqSummary: { code: string; name: string; totalDC: number; totalDP: number; totalTC: number }[];
};

export function exportReport(data: ReportData, projectName = "Project", filename?: string) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: BoQ Summary
  const boqData = data.boqSummary.map((b) => ({
    Code: b.code,
    "BoQ Item": b.name,
    "Total DC": b.totalDC,
    "Total Depreciation": b.totalDP,
    "Total Cost": b.totalTC,
  }));
  boqData.push({ Code: "", "BoQ Item": "GRAND TOTAL", "Total DC": data.totalDirectCost, "Total Depreciation": data.totalDepreciation, "Total Cost": data.grandTotal });
  XLSX.utils.book_append_sheet(wb, makeSheet(boqData), "BoQ Summary");

  // Sheet 2: Labor Summary
  const laborData = data.labor.map((l) => ({
    Code: l.resource.code,
    Name: l.resource.name,
    Unit: l.resource.unit,
    Rate: Number(l.resource.rate),
    "Total Qty": l.totalQty,
    "Total Cost": l.totalQty * Number(l.resource.rate),
  }));
  laborData.push({ Code: "", Name: "TOTAL", Unit: "", Rate: 0, "Total Qty": 0, "Total Cost": data.totalLaborCost });
  XLSX.utils.book_append_sheet(wb, makeSheet(laborData), "Labor Summary");

  // Sheet 3: Material Summary
  const matData = data.materials.map((m) => ({
    Code: m.resource.code,
    Name: m.resource.name,
    Unit: m.resource.unit,
    Rate: Number(m.resource.rate),
    "Total Qty": m.totalQty,
    "Total Cost": m.totalQty * Number(m.resource.rate),
  }));
  matData.push({ Code: "", Name: "TOTAL", Unit: "", Rate: 0, "Total Qty": 0, "Total Cost": data.totalMaterialCost });
  XLSX.utils.book_append_sheet(wb, makeSheet(matData), "Material Summary");

  // Sheet 4: Equipment Summary
  const eqData = data.equipment.map((e) => ({
    Code: e.resource.code,
    Name: e.resource.name,
    Unit: e.resource.unit,
    "Total Hours": e.totalHours,
    "Depr/hr": e.deprPerUnit,
    "Total Depreciation": e.totalDepreciation,
  }));
  eqData.push({ Code: "", Name: "TOTAL", Unit: "", "Total Hours": 0, "Depr/hr": 0, "Total Depreciation": data.totalDepreciation });
  XLSX.utils.book_append_sheet(wb, makeSheet(eqData), "Equipment Summary");

  // Sheet 5: Cost Summary
  const costData = [
    { Item: "Total Labor Cost", Amount: data.totalLaborCost },
    { Item: "Total Material Cost", Amount: data.totalMaterialCost },
    { Item: "Total Direct Cost", Amount: data.totalDirectCost },
    { Item: "Total Depreciation", Amount: data.totalDepreciation },
    { Item: "Grand Total", Amount: data.grandTotal },
  ];
  XLSX.utils.book_append_sheet(wb, makeSheet(costData), "Cost Summary");

  saveWorkbook(wb, filename ?? `${projectName.replace(/[^a-z0-9]/gi, "_")}_report.xlsx`);
}
