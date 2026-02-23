import { NextRequest, NextResponse } from "next/server";
import { getPrismaForProject } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";

export const dynamic = "force-dynamic";

async function getCurrencies(prisma: {
  projectCurrency?: { findMany: (opts: unknown) => Promise<unknown[]> };
  $queryRaw?: (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>;
}, projectId: string) {
  if (prisma.projectCurrency) {
    const rows = await prisma.projectCurrency.findMany({
      where: { projectId },
      orderBy: { slot: "asc" },
    }) as { id: string; slot: number; code: string; name: string; multiplier: unknown }[];
    return rows.map((c) => ({
      id: c.id,
      slot: c.slot,
      code: c.code,
      name: c.name,
      multiplier: String(c.multiplier ?? 1),
    }));
  }
  // Raw SQL fallback when projectCurrency delegate is undefined (Next.js bundling quirk)
  const rows = (await (prisma as { $queryRaw: (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]> }).$queryRaw`
    SELECT id, slot, code, name, multiplier FROM project_currencies WHERE project_id = ${projectId} ORDER BY slot ASC
  `) as unknown;
  const typedRows = (Array.isArray(rows) ? rows : []) as { id: string; slot: number; code: string; name: string; multiplier: string }[];
  return typedRows.map((c) => ({
    id: c.id,
    slot: c.slot,
    code: c.code,
    name: c.name,
    multiplier: String(c.multiplier ?? 1),
  }));
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const prisma = getPrismaForProject(projectId);

    const data = await getCurrencies(prisma as Parameters<typeof getCurrencies>[0], projectId);

    return NextResponse.json({ data });
  } catch (e) {
    if (e instanceof Error && e.message.includes("not found")) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    throw e;
  }
}

type CurrencyUpdate = { slot: number; code: string; name: string; multiplier: number };

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const prisma = getPrismaForProject(projectId);
    const body = await req.json();

    const items = body as CurrencyUpdate[];
    if (!Array.isArray(items) || items.length !== 5) {
      return NextResponse.json(
        { error: "Must provide exactly 5 currency slots" },
        { status: 400 }
      );
    }

    for (const item of items) {
      if (item.slot < 1 || item.slot > 5) {
        return NextResponse.json(
          { error: `Invalid slot ${item.slot}; must be 1-5` },
          { status: 400 }
        );
      }
      if (!item.code || typeof item.code !== "string" || !item.code.trim()) {
        return NextResponse.json(
          { error: `Code required for slot ${item.slot}` },
          { status: 400 }
        );
      }
      if (!item.name || typeof item.name !== "string" || !item.name.trim()) {
        return NextResponse.json(
          { error: `Name required for slot ${item.slot}` },
          { status: 400 }
        );
      }
      const mult = Number(item.multiplier);
      if (isNaN(mult) || mult <= 0) {
        return NextResponse.json(
          { error: `Multiplier must be > 0 for slot ${item.slot}` },
          { status: 400 }
        );
      }
    }

    const sorted = [...items].sort((a, b) => a.slot - b.slot);

    for (const item of sorted) {
      await prisma.projectCurrency.upsert({
        where: {
          projectId_slot: { projectId, slot: item.slot },
        },
        create: {
          projectId,
          slot: item.slot,
          code: item.code.trim(),
          name: item.name.trim(),
          multiplier: new Decimal(item.multiplier),
        },
        update: {
          code: item.code.trim(),
          name: item.name.trim(),
          multiplier: new Decimal(item.multiplier),
        },
      });
    }

    const currencies = await prisma.projectCurrency.findMany({
      where: { projectId },
      orderBy: { slot: "asc" },
    });

    return NextResponse.json({
      data: currencies.map((c) => ({
        id: c.id,
        slot: c.slot,
        code: c.code,
        name: c.name,
        multiplier: c.multiplier.toString(),
      })),
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("not found")) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update currencies" },
      { status: 500 }
    );
  }
}

/** POST: Set main currency. Body: { slot: number }. Swaps slot N with slot 1 (code, name, multiplier). Multipliers stay constant. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body = await req.json();
    const targetSlot = Number(body?.slot);

    if (!Number.isInteger(targetSlot) || targetSlot < 1 || targetSlot > 5) {
      return NextResponse.json(
        { error: "slot must be 1–5" },
        { status: 400 }
      );
    }
    if (targetSlot === 1) {
      return NextResponse.json({ error: "Slot 1 is already main" }, { status: 400 });
    }

    const prisma = getPrismaForProject(projectId);
    const rows = await getCurrencies(prisma as Parameters<typeof getCurrencies>[0], projectId);

    if (rows.length !== 5) {
      return NextResponse.json({ error: "Need exactly 5 currency slots" }, { status: 400 });
    }

    const bySlot = Object.fromEntries(rows.map((r) => [r.slot, r]));
    const main = bySlot[1];
    const target = bySlot[targetSlot];
    if (!main || !target) {
      return NextResponse.json({ error: "Currency data incomplete" }, { status: 400 });
    }

    // Swap only slot 1 and targetSlot — exchange code, name, multiplier (no recalculation)
    const updates: { slot: number; code: string; name: string; multiplier: number }[] = [
      { slot: 1, code: target.code, name: target.name, multiplier: Number(target.multiplier) || 1 },
      { slot: targetSlot, code: main.code, name: main.name, multiplier: Number(main.multiplier) || 1 },
    ];

    for (const item of updates) {
      if (prisma.projectCurrency) {
        await prisma.projectCurrency.upsert({
          where: { projectId_slot: { projectId, slot: item.slot } },
          create: {
            projectId,
            slot: item.slot,
            code: item.code,
            name: item.name,
            multiplier: new Decimal(item.multiplier),
          },
          update: {
            code: item.code,
            name: item.name,
            multiplier: new Decimal(item.multiplier),
          },
        });
      } else {
        await (prisma as { $executeRaw: (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown> }).$executeRaw`
          UPDATE project_currencies SET code = ${item.code}, name = ${item.name}, multiplier = ${item.multiplier} WHERE project_id = ${projectId} AND slot = ${item.slot}
        `;
      }
    }

    const data = await getCurrencies(prisma as Parameters<typeof getCurrencies>[0], projectId);
    return NextResponse.json({ data });
  } catch (e) {
    if (e instanceof Error && e.message.includes("not found")) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to set main currency" },
      { status: 500 }
    );
  }
}
