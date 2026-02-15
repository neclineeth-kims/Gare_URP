"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Package, Wrench } from "lucide-react";

type Labor = { id: string; code: string; name: string; unit: string; rate: string };
type Material = { id: string; code: string; name: string; unit: string; rate: string };
type Equipment = { id: string; code: string; name: string; unit: string; etc: string };

type AnalysisResourcePickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  existingLaborIds: string[];
  existingMaterialIds: string[];
  existingEquipmentIds: string[];
  onSelectLabor: (labor: Labor, quantity: number) => void;
  onSelectMaterial: (material: Material, quantity: number) => void;
  onSelectEquipment: (equipment: Equipment, quantity: number) => void;
};

export function AnalysisResourcePicker({
  open,
  onOpenChange,
  projectId,
  existingLaborIds,
  existingMaterialIds,
  existingEquipmentIds,
  onSelectLabor,
  onSelectMaterial,
  onSelectEquipment,
}: AnalysisResourcePickerProps) {
  const [labor, setLabor] = useState<Labor[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [laborSearch, setLaborSearch] = useState("");
  const [materialSearch, setMaterialSearch] = useState("");
  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [selectedLaborId, setSelectedLaborId] = useState<string | null>(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("1");

  useEffect(() => {
    if (open && projectId) {
      Promise.all([
        fetch(`/api/v1/projects/${projectId}/labor`).then((r) => r.json()),
        fetch(`/api/v1/projects/${projectId}/materials`).then((r) => r.json()),
        fetch(`/api/v1/projects/${projectId}/equipment`).then((r) => r.json()),
      ]).then(([labRes, matRes, eqRes]) => {
        setLabor(
          (labRes.data || []).map((l: Labor & { rate: unknown }) => ({
            ...l,
            rate: String(l.rate ?? ""),
          }))
        );
        setMaterials(
          (matRes.data || []).map((m: Material & { rate: unknown }) => ({
            ...m,
            rate: String(m.rate ?? ""),
          }))
        );
        setEquipment(
          (eqRes.data || []).map((e: Equipment) => ({
            ...e,
            etc: e.etc ?? "",
          }))
        );
      });
      setLaborSearch("");
      setMaterialSearch("");
      setEquipmentSearch("");
      setSelectedLaborId(null);
      setSelectedMaterialId(null);
      setSelectedEquipmentId(null);
      setQuantity("1");
    }
  }, [open, projectId]);

  const filteredLabor = labor.filter(
    (l) =>
      !existingLaborIds.includes(l.id) &&
      (laborSearch === "" ||
        l.code.toLowerCase().includes(laborSearch.toLowerCase()) ||
        l.name.toLowerCase().includes(laborSearch.toLowerCase()))
  );
  const filteredMaterials = materials.filter(
    (m) =>
      !existingMaterialIds.includes(m.id) &&
      (materialSearch === "" ||
        m.code.toLowerCase().includes(materialSearch.toLowerCase()) ||
        m.name.toLowerCase().includes(materialSearch.toLowerCase()))
  );
  const filteredEquipment = equipment.filter(
    (e) =>
      !existingEquipmentIds.includes(e.id) &&
      (equipmentSearch === "" ||
        e.code.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
        e.name.toLowerCase().includes(equipmentSearch.toLowerCase()))
  );

  const handleAddLabor = () => {
    const item = labor.find((l) => l.id === selectedLaborId);
    if (item && quantity && Number(quantity) > 0) {
      onSelectLabor(item, Number(quantity));
      onOpenChange(false);
    }
  };

  const handleAddMaterial = () => {
    const item = materials.find((m) => m.id === selectedMaterialId);
    if (item && quantity && Number(quantity) > 0) {
      onSelectMaterial(item, Number(quantity));
      onOpenChange(false);
    }
  };

  const handleAddEquipment = () => {
    const item = equipment.find((e) => e.id === selectedEquipmentId);
    if (item && quantity && Number(quantity) > 0) {
      onSelectEquipment(item, Number(quantity));
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Resource</DialogTitle>
          <DialogDescription>
            Labor, materials, or equipment used for this analysis. Costs update in real-time.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="labor">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="labor" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Labor
            </TabsTrigger>
            <TabsTrigger value="material" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Materials
            </TabsTrigger>
            <TabsTrigger value="equipment" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Equipment
            </TabsTrigger>
          </TabsList>
          <TabsContent value="labor">
            <div className="space-y-4 pt-4">
              <Input
                placeholder="Search labor..."
                value={laborSearch}
                onChange={(e) => setLaborSearch(e.target.value)}
              />
              <div className="max-h-48 overflow-y-auto rounded-md border">
                {filteredLabor.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">
                    {existingLaborIds.length > 0 && laborSearch === ""
                      ? "All labor items already added."
                      : "No labor items found."}
                  </p>
                ) : (
                  <div className="divide-y">
                    {filteredLabor.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => setSelectedLaborId(l.id)}
                        className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-accent ${
                          selectedLaborId === l.id ? "bg-accent" : ""
                        }`}
                      >
                        <span>
                          <span className="font-mono font-medium">{l.code}</span> — {l.name}
                        </span>
                        <span className="text-muted-foreground">
                          {l.rate}/{l.unit}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <label className="text-sm font-medium">Quantity</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.001"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button
                  onClick={handleAddLabor}
                  disabled={!selectedLaborId || !quantity || Number(quantity) <= 0}
                  className="mt-6"
                >
                  Add Labor
                </Button>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="material">
            <div className="space-y-4 pt-4">
              <Input
                placeholder="Search materials..."
                value={materialSearch}
                onChange={(e) => setMaterialSearch(e.target.value)}
              />
              <div className="max-h-48 overflow-y-auto rounded-md border">
                {filteredMaterials.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">
                    {existingMaterialIds.length > 0 && materialSearch === ""
                      ? "All materials already added."
                      : "No materials found."}
                  </p>
                ) : (
                  <div className="divide-y">
                    {filteredMaterials.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMaterialId(m.id)}
                        className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-accent ${
                          selectedMaterialId === m.id ? "bg-accent" : ""
                        }`}
                      >
                        <span>
                          <span className="font-mono font-medium">{m.code}</span> — {m.name}
                        </span>
                        <span className="text-muted-foreground">
                          {m.rate}/{m.unit}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <label className="text-sm font-medium">Quantity</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.001"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button
                  onClick={handleAddMaterial}
                  disabled={!selectedMaterialId || !quantity || Number(quantity) <= 0}
                  className="mt-6"
                >
                  Add Material
                </Button>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="equipment">
            <div className="space-y-4 pt-4">
              <Input
                placeholder="Search equipment..."
                value={equipmentSearch}
                onChange={(e) => setEquipmentSearch(e.target.value)}
              />
              <div className="max-h-48 overflow-y-auto rounded-md border">
                {filteredEquipment.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">
                    {existingEquipmentIds.length > 0 && equipmentSearch === ""
                      ? "All equipment already added."
                      : "No equipment found."}
                  </p>
                ) : (
                  <div className="divide-y">
                    {filteredEquipment.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => setSelectedEquipmentId(e.id)}
                        className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-accent ${
                          selectedEquipmentId === e.id ? "bg-accent" : ""
                        }`}
                      >
                        <span>
                          <span className="font-mono font-medium">{e.code}</span> — {e.name}
                        </span>
                        <span className="text-muted-foreground">ETC: {e.etc}/{e.unit}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <label className="text-sm font-medium">Quantity (hours)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.001"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button
                  onClick={handleAddEquipment}
                  disabled={!selectedEquipmentId || !quantity || Number(quantity) <= 0}
                  className="mt-6"
                >
                  Add Equipment
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
