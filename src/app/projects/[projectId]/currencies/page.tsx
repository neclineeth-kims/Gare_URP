"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Star } from "lucide-react";

type CurrencyRow = {
  id: string;
  slot: number;
  code: string;
  name: string;
  multiplier: string;
};

const DEFAULT_ROWS: Omit<CurrencyRow, "id">[] = [
  { slot: 1, code: "LOCAL", name: "Local Currency", multiplier: "1" },
  { slot: 2, code: "CUR2", name: "Currency 2", multiplier: "1" },
  { slot: 3, code: "CUR3", name: "Currency 3", multiplier: "1" },
  { slot: 4, code: "CUR4", name: "Currency 4", multiplier: "1" },
  { slot: 5, code: "CUR5", name: "Currency 5", multiplier: "1" },
];

export default function CurrenciesPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [rows, setRows] = useState<CurrencyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingMain, setSettingMain] = useState<number | null>(null);

  const mainMultiplier = rows[0] ? Number(rows[0].multiplier) || 1 : 1;

  const fetchCurrencies = async () => {
    const res = await fetch(`/api/v1/projects/${projectId}/currencies`);
    const json = await res.json();
    if (res.ok && json.data?.length) {
      setRows(
        json.data.map((c: CurrencyRow) => ({
          ...c,
          multiplier: String(c.multiplier ?? 1),
        }))
      );
    } else {
      setRows(
        DEFAULT_ROWS.map((r, i) => ({
          ...r,
          id: `temp-${i}`,
          multiplier: r.multiplier,
        }))
      );
    }
  };

  useEffect(() => {
    fetchCurrencies().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const updateRow = (idx: number, field: keyof CurrencyRow, value: string | number) => {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = rows.map((r) => ({
        slot: r.slot,
        code: r.code.trim(),
        name: r.name.trim(),
        multiplier: Number(r.multiplier) || 1,
      }));

      const res = await fetch(`/api/v1/projects/${projectId}/currencies`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (res.ok) {
        toast.success("Currencies saved");
        fetchCurrencies();
      } else {
        toast.error(json.error || "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSetMain = async (slot: number) => {
    if (slot === 1) return;
    setSettingMain(slot);
    try {
      // Save any unsaved edits first so they are not lost when we swap
      const payload = rows.map((r) => ({
        slot: r.slot,
        code: r.code.trim(),
        name: r.name.trim(),
        multiplier: Number(r.multiplier) || 1,
      }));

      const putRes = await fetch(`/api/v1/projects/${projectId}/currencies`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!putRes.ok) {
        const putJson = await putRes.json();
        toast.error(putJson.error || "Save failed");
        return;
      }

      const res = await fetch(`/api/v1/projects/${projectId}/currencies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot }),
      });
      const json = await res.json();
      if (res.ok) {
        setRows(
          json.data.map((c: CurrencyRow) => ({
            ...c,
            multiplier: String(c.multiplier ?? 1),
          }))
        );
        const newMain = json.data.find((c: CurrencyRow) => c.slot === 1);
        toast.success(`${newMain?.code ?? "Currency"} is now the main currency`);
      } else {
        toast.error(json.error || "Failed to set main currency");
      }
    } catch {
      toast.error("Failed to set main currency");
    } finally {
      setSettingMain(null);
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading currencies...</p>;
  }

  if (rows.length === 0) {
    return <p className="text-muted-foreground">No currencies configured.</p>;
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Currencies</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Set the base multiplier for each currency (reference rates). When you choose a
          main currency, SC/Mul is calculated as Multiplier ÷ Main Multiplier. All
          calculations use SC/Mul. Example: SOM=1, EUR=4, USD=3. If EUR is main:
          SC/Mul = 1/4, 1, 3/4 respectively.
        </p>
      </div>

      <form onSubmit={handleSave}>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Slot</TableHead>
                <TableHead className="w-24">Main</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-32">Multiplier</TableHead>
                <TableHead className="w-28">SC/Mul</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono">{row.slot}</TableCell>
                  <TableCell>
                    {row.slot === 1 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        Main
                      </span>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetMain(row.slot)}
                        disabled={saving || settingMain !== null}
                      >
                        {settingMain === row.slot ? "Setting…" : "Set as main"}
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <Input
                      value={row.code}
                      onChange={(e) => updateRow(idx, "code", e.target.value)}
                      placeholder="e.g. SOM"
                      required
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={row.name}
                      onChange={(e) => updateRow(idx, "name", e.target.value)}
                      placeholder="e.g. Somoni"
                      required
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      value={row.multiplier}
                      onChange={(e) => updateRow(idx, "multiplier", e.target.value)}
                      className="font-mono"
                    />
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground">
                    {(mainMultiplier > 0
                      ? (Number(row.multiplier) || 1) / mainMultiplier
                      : "-"
                    ).toFixed(4)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </div>
  );
}
