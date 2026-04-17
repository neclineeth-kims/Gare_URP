"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Download } from "lucide-react";
import type { AnalysisWithCostsClient } from "@/types/analysis";
import { AnalysisResourcePicker } from "@/components/analysis-resource-picker";
import { exportAnalysisDetail } from "@/lib/excel";

// ── Types ──────────────────────────────────────────────────────────────────────

type Labor = { id: string; code: string; name: string; unit: string; rate: number };
type Material = { id: string; code: string; name: string; unit: string; rate: number };
type SubResourceForCost = {
  quantity: number;
  labor?: { rate: number } | null;
  material?: { rate: number } | null;
};
type Equipment = {
  id: string;
  code: string;
  name: string;
  unit: string;
  totalValue: number;
  depreciationTotal: number;
  subResources?: SubResourceForCost[];
};

type ResourceRow = {
  id: string;
  resourceType: "labor" | "material" | "equipment";
  resourceId: string;
  quantity: number;
  labor?: Labor | null;
  material?: Material | null;
  equipment?: Equipment | null;
};

type AnalysisDetailProps = {
  projectId: string;
  analysis: AnalysisWithCostsClient | null;
  isCreatingNew?: boolean;
  isSaving: boolean;
  onSave: (data: {
    id?: string;
    code: string;
    name: string;
    unit: string;
    base_quantity: number;
    resources?: Array<{
      resourceType: "labor" | "material" | "equipment";
      resourceId: string;
      quantity: number;
    }>;
  }) => void;
  onCancel: () => void;
  onDeleteClick?: (id: string) => void;
};

// ── Calculation helpers ────────────────────────────────────────────────────────

function calcRowCosts(r: ResourceRow): { direct: number; dep: number; total: number } {
  if (r.resourceType === "labor") {
    const direct = r.quantity * (r.labor?.rate ?? 0);
    return { direct, dep: 0, total: direct };
  }
  if (r.resourceType === "material") {
    const direct = r.quantity * (r.material?.rate ?? 0);
    return { direct, dep: 0, total: direct };
  }
  if (r.resourceType === "equipment" && r.equipment) {
    let edc = 0;
    for (const sr of r.equipment.subResources ?? []) {
      if (sr.labor?.rate) edc += sr.quantity * sr.labor.rate;
      if (sr.material?.rate) edc += sr.quantity * sr.material.rate;
    }
    const edp =
      r.equipment.depreciationTotal > 0
        ? r.equipment.totalValue / r.equipment.depreciationTotal
        : 0;
    const direct = r.quantity * edc;
    const dep = r.quantity * edp;
    return { direct, dep, total: direct + dep };
  }
  return { direct: 0, dep: 0, total: 0 };
}

function calcSummary(rows: ResourceRow[], bq: number) {
  let laborDir = 0, matDir = 0, eqDir = 0, eqDep = 0;
  for (const r of rows) {
    const { direct, dep } = calcRowCosts(r);
    if (r.resourceType === "labor")     laborDir += direct;
    if (r.resourceType === "material")  matDir   += direct;
    if (r.resourceType === "equipment") { eqDir += direct; eqDep += dep; }
  }
  const totalDir = laborDir + matDir + eqDir;
  const totalDep = eqDep;
  const totalTC  = totalDir + totalDep;
  const safe = bq || 1;
  return {
    dir: { labor: laborDir, material: matDir, equipment: eqDir,        total: totalDir, ur: totalDir / safe },
    dep: { labor: 0,        material: 0,      equipment: eqDep,        total: totalDep, ur: totalDep / safe },
    tot: { labor: laborDir, material: matDir, equipment: eqDir + eqDep, total: totalTC,  ur: totalTC  / safe },
  };
}

// ── Display helpers ────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = { labor: "L", material: "M", equipment: "E" };
const TYPE_COLOR: Record<string, string> = {
  labor:     "bg-blue-50  text-blue-800  dark:bg-blue-950/30",
  material:  "bg-green-50 text-green-800 dark:bg-green-950/30",
  equipment: "bg-amber-50 text-amber-800 dark:bg-amber-950/30",
};

function fmt(n: number): string {
  return n === 0 ? "—" : n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtUR(n: number): string { return n.toFixed(3); }

function getCode(r: ResourceRow) { return r.labor?.code ?? r.material?.code ?? r.equipment?.code ?? ""; }
function getUnit(r: ResourceRow) { return r.labor?.unit ?? r.material?.unit ?? r.equipment?.unit ?? ""; }
function getName(r: ResourceRow) { return r.labor?.name ?? r.material?.name ?? r.equipment?.name ?? ""; }

// ── Component ──────────────────────────────────────────────────────────────────

export default function AnalysisDetail({
  projectId,
  analysis,
  isCreatingNew = false,
  isSaving,
  onSave,
  onCancel,
  onDeleteClick,
}: AnalysisDetailProps) {
  const [code, setCode]               = useState("");
  const [name, setName]               = useState("");
  const [unit, setUnit]               = useState("cum");
  const [baseQuantity, setBaseQuantity] = useState("1000");
  const [laborResources,     setLaborResources]     = useState<ResourceRow[]>([]);
  const [materialResources,  setMaterialResources]  = useState<ResourceRow[]>([]);
  const [equipmentResources, setEquipmentResources] = useState<ResourceRow[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [errors, setErrors] = useState<{
    code?: string; name?: string; unit?: string; baseQuantity?: string;
  }>({});
  const codeInputRef = useRef<HTMLInputElement>(null);

  // ── Load / reset when analysis changes ──────────────────────────────────────
  useEffect(() => {
    setErrors({});
    if (analysis) {
      setCode(analysis.code);
      setName(analysis.name);
      setUnit(analysis.unit || "cum");
      setBaseQuantity(analysis.baseQuantity.toString());

      setLaborResources(
        analysis.resources
          .filter((r) => r.resourceType === "labor" && r.labor)
          .map((r) => ({
            id: r.id,
            resourceType: "labor" as const,
            resourceId: r.labor!.id,
            quantity: r.quantity,
            labor: { id: r.labor!.id, code: r.labor!.code, name: r.labor!.name, unit: r.labor!.unit, rate: r.labor!.rate },
            material: null,
            equipment: null,
          }))
      );

      setMaterialResources(
        analysis.resources
          .filter((r) => r.resourceType === "material" && r.material)
          .map((r) => ({
            id: r.id,
            resourceType: "material" as const,
            resourceId: r.material!.id,
            quantity: r.quantity,
            labor: null,
            material: { id: r.material!.id, code: r.material!.code, name: r.material!.name, unit: r.material!.unit, rate: r.material!.rate },
            equipment: null,
          }))
      );

      setEquipmentResources(
        analysis.resources
          .filter((r) => r.resourceType === "equipment" && r.equipment)
          .map((r) => ({
            id: r.id,
            resourceType: "equipment" as const,
            resourceId: r.equipment!.id,
            quantity: r.quantity,
            labor: null,
            material: null,
            equipment: {
              id: r.equipment!.id,
              code: r.equipment!.code,
              name: r.equipment!.name,
              unit: r.equipment!.unit,
              totalValue: r.equipment!.totalValue,
              depreciationTotal: r.equipment!.depreciationTotal,
              subResources: (r.equipment!.subResources ?? []).map((sr) => ({
                quantity: typeof sr.quantity === "number" ? sr.quantity : parseFloat(String(sr.quantity)),
                labor:    sr.labor    ? { rate: typeof sr.labor.rate    === "number" ? sr.labor.rate    : parseFloat(String(sr.labor.rate))    } : null,
                material: sr.material ? { rate: typeof sr.material.rate === "number" ? sr.material.rate : parseFloat(String(sr.material.rate)) } : null,
              })),
            },
          }))
      );
    } else {
      setCode(""); setName(""); setUnit("cum"); setBaseQuantity("1000");
      setLaborResources([]); setMaterialResources([]); setEquipmentResources([]);
      if (isCreatingNew) setTimeout(() => codeInputRef.current?.focus(), 100);
    }
  }, [analysis, isCreatingNew]);

  // ── Combined rows & summary ──────────────────────────────────────────────────
  const allRows = useMemo(
    () => [...laborResources, ...materialResources, ...equipmentResources],
    [laborResources, materialResources, equipmentResources]
  );
  const bqNum   = useMemo(() => parseFloat(baseQuantity) || 1, [baseQuantity]);
  const summary = useMemo(() => calcSummary(allRows, bqNum), [allRows, bqNum]);

  // ── Quantity update ──────────────────────────────────────────────────────────
  const handleUpdateQty = useCallback(
    (id: string, type: ResourceRow["resourceType"], val: string) => {
      const n   = parseFloat(val);
      const qty = isNaN(n) || n < 0 ? 0 : n;
      const up  = (prev: ResourceRow[]) => prev.map((r) => r.id === id ? { ...r, quantity: qty } : r);
      if (type === "labor")     setLaborResources(up);
      else if (type === "material")  setMaterialResources(up);
      else                           setEquipmentResources(up);
    },
    []
  );

  // ── Remove resource ──────────────────────────────────────────────────────────
  const handleRemove = useCallback(
    (id: string, type: ResourceRow["resourceType"]) => {
      if (type === "labor")     setLaborResources((p)     => p.filter((r) => r.id !== id));
      else if (type === "material")  setMaterialResources((p)  => p.filter((r) => r.id !== id));
      else                           setEquipmentResources((p) => p.filter((r) => r.id !== id));
    },
    []
  );

  // ── Add resource via picker ──────────────────────────────────────────────────
  const handleSelectLabor = useCallback(
    (labor: { id: string; code: string; name: string; unit: string; rate: string | number }, quantity: number) => {
      const rateNum = typeof labor.rate === "string" ? Number(labor.rate) : labor.rate;
      setLaborResources((prev) => [
        ...prev,
        { id: `temp-${Date.now()}-${Math.random()}`, resourceType: "labor", resourceId: labor.id,
          quantity, labor: { ...labor, rate: rateNum }, material: null, equipment: null },
      ]);
      setPickerOpen(false);
    },
    []
  );

  const handleSelectMaterial = useCallback(
    (material: { id: string; code: string; name: string; unit: string; rate: string | number }, quantity: number) => {
      const rateNum = typeof material.rate === "string" ? Number(material.rate) : material.rate;
      setMaterialResources((prev) => [
        ...prev,
        { id: `temp-${Date.now()}-${Math.random()}`, resourceType: "material", resourceId: material.id,
          quantity, labor: null, material: { ...material, rate: rateNum }, equipment: null },
      ]);
      setPickerOpen(false);
    },
    []
  );

  const handleSelectEquipment = useCallback(
    (equipment: { id: string; code: string; name: string; unit: string }, quantity: number) => {
      fetch(`/api/v1/projects/${projectId}/equipment/${equipment.id}`)
        .then((r) => r.json())
        .then((json) => {
          if (!json.data) return;
          const eq = json.data;
          const subResources: SubResourceForCost[] = (eq.subResources ?? []).map(
            (sr: { quantity: number | string; labor?: { rate: number | string } | null; material?: { rate: number | string } | null }) => ({
              quantity: typeof sr.quantity === "number" ? sr.quantity : parseFloat(String(sr.quantity)),
              labor:    sr.labor    ? { rate: typeof sr.labor.rate    === "number" ? sr.labor.rate    : parseFloat(String(sr.labor.rate))    } : null,
              material: sr.material ? { rate: typeof sr.material.rate === "number" ? sr.material.rate : parseFloat(String(sr.material.rate)) } : null,
            })
          );
          setEquipmentResources((prev) => [
            ...prev,
            {
              id: `temp-${Date.now()}-${Math.random()}`,
              resourceType: "equipment", resourceId: equipment.id, quantity,
              labor: null, material: null,
              equipment: {
                id: eq.id, code: eq.code, name: eq.name, unit: eq.unit,
                totalValue:        typeof eq.totalValue        === "string" ? parseFloat(eq.totalValue)        : eq.totalValue,
                depreciationTotal: typeof eq.depreciationTotal === "string" ? parseFloat(eq.depreciationTotal) : eq.depreciationTotal,
                subResources,
              },
            },
          ]);
          setPickerOpen(false);
        })
        .catch((err) => console.error("Failed to fetch equipment details:", err));
    },
    [projectId]
  );

  // ── Validate & save ──────────────────────────────────────────────────────────
  const validateForm = (): boolean => {
    const e: typeof errors = {};
    if (!code.trim()) e.code = "Required";
    if (!name.trim()) e.name = "Required";
    if (!unit.trim()) e.unit = "Required";
    if (!baseQuantity) {
      e.baseQuantity = "Required";
    } else {
      const n = parseFloat(baseQuantity);
      if (isNaN(n) || n <= 0) e.baseQuantity = "Must be > 0";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;
    onSave({
      id: analysis?.id,
      code: code.trim(), name: name.trim(), unit: unit.trim(),
      base_quantity: parseFloat(baseQuantity),
      resources: [
        ...laborResources.map((r)     => ({ resourceType: "labor"     as const, resourceId: r.resourceId, quantity: r.quantity })),
        ...materialResources.map((r)  => ({ resourceType: "material"  as const, resourceId: r.resourceId, quantity: r.quantity })),
        ...equipmentResources.map((r) => ({ resourceType: "equipment" as const, resourceId: r.resourceId, quantity: r.quantity })),
      ],
    });
  };

  // ── Export single analysis ───────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    exportAnalysisDetail({
      code:         code.trim()  || (analysis?.code  ?? ""),
      name:         name.trim()  || (analysis?.name  ?? ""),
      unit:         unit.trim()  || (analysis?.unit  ?? ""),
      baseQuantity: parseFloat(baseQuantity) || 1,
      resources: allRows.map((r) => {
        const { direct, dep, total } = calcRowCosts(r);
        return { type: r.resourceType, code: getCode(r), unit: getUnit(r), name: getName(r),
                 quantity: r.quantity, direct, dep, total };
      }),
      summary,
    });
  }, [allRows, code, name, unit, baseQuantity, summary, analysis]);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pb-4">

        {/* ── Header fields ── */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Code</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Unit</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Name</th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Base Quantity</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {/* CODE */}
                <td className="px-4 py-3">
                  <input
                    ref={codeInputRef}
                    value={code}
                    onChange={(e) => { setCode(e.target.value.toUpperCase()); if (errors.code) setErrors((p) => ({ ...p, code: undefined })); }}
                    placeholder="EXC001"
                    maxLength={20}
                    className={`w-28 rounded border bg-yellow-50 border-yellow-400 px-2 py-1 font-mono font-semibold uppercase text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400 dark:bg-yellow-950/30${errors.code ? " border-destructive" : ""}`}
                  />
                  {errors.code && <p className="text-xs text-destructive mt-1">{errors.code}</p>}
                </td>
                {/* UNIT */}
                <td className="px-4 py-3">
                  <input
                    value={unit}
                    onChange={(e) => { setUnit(e.target.value); if (errors.unit) setErrors((p) => ({ ...p, unit: undefined })); }}
                    placeholder="cum"
                    className={`w-20 rounded border bg-yellow-50 border-yellow-400 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400 dark:bg-yellow-950/30${errors.unit ? " border-destructive" : ""}`}
                  />
                  {errors.unit && <p className="text-xs text-destructive mt-1">{errors.unit}</p>}
                </td>
                {/* NAME */}
                <td className="px-4 py-3">
                  <input
                    value={name}
                    onChange={(e) => { setName(e.target.value); if (errors.name) setErrors((p) => ({ ...p, name: undefined })); }}
                    placeholder="Analysis name"
                    className={`w-full min-w-48 rounded border bg-yellow-50 border-yellow-400 px-2 py-1 font-medium text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400 dark:bg-yellow-950/30${errors.name ? " border-destructive" : ""}`}
                  />
                  {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
                </td>
                {/* BASE QUANTITY */}
                <td className="px-4 py-3 text-right">
                  <input
                    type="number"
                    value={baseQuantity}
                    onChange={(e) => { setBaseQuantity(e.target.value); if (errors.baseQuantity) setErrors((p) => ({ ...p, baseQuantity: undefined })); }}
                    placeholder="1000"
                    min="0.001"
                    step="0.01"
                    className={`w-32 rounded border bg-yellow-50 border-yellow-400 px-2 py-1 text-right font-mono font-semibold text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400 dark:bg-yellow-950/30${errors.baseQuantity ? " border-destructive" : ""}`}
                  />
                  {errors.baseQuantity && <p className="text-xs text-destructive mt-1 text-right">{errors.baseQuantity}</p>}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Resource table ── */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {/* type badge */}
                <th className="px-3 py-2 w-8"></th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Code</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Unit</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Name</th>
                {/* yellow = user input */}
                <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-yellow-700 bg-yellow-50/80 dark:bg-yellow-950/20">
                  Quantity
                </th>
                {/* blue = calculated */}
                <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-blue-700 bg-blue-50/80 dark:bg-blue-950/20">Direct</th>
                <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-blue-700 bg-blue-50/80 dark:bg-blue-950/20">Dep</th>
                <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-blue-700 bg-blue-50/80 dark:bg-blue-950/20">Total</th>
                {/* delete */}
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {allRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-sm text-muted-foreground">
                    No resources yet — click &ldquo;+ Add resource&rdquo; below to add labor, material or equipment.
                  </td>
                </tr>
              ) : (
                allRows.map((r, i) => {
                  const { direct, dep, total } = calcRowCosts(r);
                  return (
                    <tr key={r.id} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                      <td className="px-3 py-2">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${TYPE_COLOR[r.resourceType]}`}>
                          {TYPE_LABEL[r.resourceType]}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono font-medium text-xs">{getCode(r)}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{getUnit(r)}</td>
                      <td className="px-3 py-2">{getName(r)}</td>
                      {/* QUANTITY — yellow */}
                      <td className="px-3 py-1.5 bg-yellow-50/60 dark:bg-yellow-950/10">
                        <input
                          type="number"
                          value={r.quantity}
                          min={0}
                          step="0.01"
                          onChange={(e) => handleUpdateQty(r.id, r.resourceType, e.target.value)}
                          className="w-24 rounded border border-yellow-300 bg-yellow-50 px-2 py-0.5 text-right font-mono text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400 dark:bg-yellow-950/30"
                        />
                      </td>
                      {/* DIRECT / DEP / TOTAL — blue */}
                      <td className="px-3 py-2 text-right font-mono text-sm bg-blue-50/40 dark:bg-blue-950/10 text-blue-900 dark:text-blue-200">
                        {fmt(direct)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-sm bg-blue-50/40 dark:bg-blue-950/10 text-blue-900 dark:text-blue-200">
                        {fmt(dep)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-sm bg-blue-50/40 dark:bg-blue-950/10 text-blue-900 dark:text-blue-200">
                        {fmt(total)}
                      </td>
                      <td className="px-3 py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(r.id, r.resourceType)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          aria-label={`Remove ${getCode(r)}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
              {/* Add resource */}
              <tr className="border-t">
                <td colSpan={9} className="px-3 py-2">
                  <button
                    onClick={() => setPickerOpen(true)}
                    className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add resource
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Summary grid ── */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 w-14"></th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wide text-blue-700">Labor</th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wide text-green-700">Material</th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wide text-amber-700">Equipment</th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Total</th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground border-l">Unit Rate</th>
              </tr>
            </thead>
            <tbody>
              {([
                { label: "DIR", row: summary.dir },
                { label: "DEP", row: summary.dep },
              ] as const).map(({ label, row }) => (
                <tr key={label} className="border-b">
                  <td className="px-4 py-2 text-xs font-semibold text-muted-foreground">{label}</td>
                  <td className="px-4 py-2 text-right font-mono text-sm">{fmt(row.labor)}</td>
                  <td className="px-4 py-2 text-right font-mono text-sm">{fmt(row.material)}</td>
                  <td className="px-4 py-2 text-right font-mono text-sm">{fmt(row.equipment)}</td>
                  <td className="px-4 py-2 text-right font-mono font-semibold text-sm">{fmt(row.total)}</td>
                  <td className="px-4 py-2 text-right font-mono font-semibold text-sm text-primary border-l">{fmtUR(row.ur)}</td>
                </tr>
              ))}
              {/* TOTAL row */}
              <tr className="bg-muted/40 font-bold">
                <td className="px-4 py-2.5 text-xs font-bold">TOTAL</td>
                <td className="px-4 py-2.5 text-right font-mono font-semibold text-sm">{fmt(summary.tot.labor)}</td>
                <td className="px-4 py-2.5 text-right font-mono font-semibold text-sm">{fmt(summary.tot.material)}</td>
                <td className="px-4 py-2.5 text-right font-mono font-semibold text-sm">{fmt(summary.tot.equipment)}</td>
                <td className="px-4 py-2.5 text-right font-mono font-bold text-sm">{fmt(summary.tot.total)}</td>
                <td className="px-4 py-2.5 text-right font-mono font-bold text-base text-primary border-l">{fmtUR(summary.tot.ur)}</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>{/* end scrollable */}

      {/* ── Resource picker ── */}
      <AnalysisResourcePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        projectId={projectId}
        existingLaborIds={laborResources.map((r) => r.resourceId)}
        existingMaterialIds={materialResources.map((r) => r.resourceId)}
        existingEquipmentIds={equipmentResources.map((r) => r.resourceId)}
        onSelectLabor={handleSelectLabor}
        onSelectMaterial={handleSelectMaterial}
        onSelectEquipment={handleSelectEquipment}
      />

      {/* ── Footer ── */}
      <div className="flex-shrink-0 border-t bg-card pt-3 pb-1 flex items-center justify-between gap-4">
        <span className="text-xs text-muted-foreground">
          Changes are saved only when you click &quot;{analysis ? "Update Analysis" : "Create Analysis"}&quot;
        </span>
        <div className="flex gap-2">
          {/* Delete — secondary destructive */}
          {analysis && onDeleteClick && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDeleteClick(analysis.id)}
              disabled={isSaving}
              className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete
            </Button>
          )}
          {/* Export — only when there are resources */}
          {allRows.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleExport} disabled={isSaving}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export
            </Button>
          )}
          <Button variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving…
              </>
            ) : analysis ? "Update Analysis" : "Create Analysis"}
          </Button>
        </div>
      </div>

    </div>
  );
}
