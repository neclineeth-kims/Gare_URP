"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Wrench } from "lucide-react";

type Equipment = {
  id: string;
  code: string;
  name: string;
  unit: string;
  totalValue: string;
  depreciationTotal: string;
  edc: string;
  edp: string;
  etc: string;
};

export default function EquipmentPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/v1/projects/${projectId}/equipment`)
      .then((res) => res.json())
      .then((json) => {
        if (json.data) setEquipment(json.data);
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Equipment</h2>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : equipment.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
          <Wrench className="mb-2 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">No equipment yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Click a row to manage sub-resources (operator labor + fuel).
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead className="text-right">Depr. Total</TableHead>
                <TableHead className="text-right">EDC/hr</TableHead>
                <TableHead className="text-right">EDP/hr</TableHead>
                <TableHead className="text-right">ETC/hr</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipment.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer hover:bg-accent/50"
                  onClick={() => router.push(`/projects/${projectId}/equipment/${item.id}`)}
                >
                  <TableCell className="font-mono">{item.code}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell className="text-right font-mono">
                    {Number(item.totalValue).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {Number(item.depreciationTotal).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono">{item.edc}</TableCell>
                  <TableCell className="text-right font-mono">{item.edp}</TableCell>
                  <TableCell className="text-right font-mono font-medium">{item.etc}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
