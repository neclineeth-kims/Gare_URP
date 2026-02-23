import { getPrismaForProject, getEquipmentList } from "@/lib/db";
import EquipmentPageClient from "@/components/equipment/EquipmentPageClient";
import type { Metadata } from "next";
import type { EquipmentWithCostsClient } from "@/types/equipment";

export const metadata: Metadata = {
  title: "Equipment",
};

export default async function EquipmentPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const prisma = await getPrismaForProject(projectId);
  const initialEquipment = await getEquipmentList(prisma, projectId);

  // Convert Decimal objects to numbers for client component serialization
  const serializedEquipment: EquipmentWithCostsClient[] = initialEquipment.map((eq) => ({
    ...eq,
    totalValue: Number(eq.totalValue),
    depreciationTotal: Number(eq.depreciationTotal),
    createdAt: eq.createdAt.toISOString(),
    updatedAt: eq.updatedAt.toISOString(),
    subResources: eq.subResources.map((sr) => ({
      ...sr,
      quantity: Number(sr.quantity),
      createdAt: sr.createdAt.toISOString(),
      labor: sr.labor
        ? {
            ...sr.labor,
            rate: Number(sr.labor.rate),
            createdAt: sr.labor.createdAt.toISOString(),
            updatedAt: sr.labor.updatedAt.toISOString(),
          }
        : null,
      material: sr.material
        ? {
            ...sr.material,
            rate: Number(sr.material.rate),
            createdAt: sr.material.createdAt.toISOString(),
            updatedAt: sr.material.updatedAt.toISOString(),
          }
        : null,
    })),
  }));

  return <EquipmentPageClient projectId={projectId} initialEquipment={serializedEquipment} />;
}
