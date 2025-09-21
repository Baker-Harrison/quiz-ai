import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  try {
    // Ensure POPP exists and assign any ungrouped objectives to it
    const popp = await prisma.group.upsert({
      where: { name: "POPP" },
      update: {},
      create: { name: "POPP" },
    });

    await prisma.objective.updateMany({
      where: { groupId: null },
      data: { groupId: popp.id },
    });

    const groups = await prisma.group.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(groups);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to list groups";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const createSchema = z.object({ name: z.string().min(1).max(100) });

export async function POST(req: NextRequest) {
  try {
    const { name } = createSchema.parse(await req.json());
    const created = await prisma.group.create({ data: { name } });
    return NextResponse.json(created, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof ZodError) return NextResponse.json({ error: e.errors }, { status: 400 });
    if (typeof e === "object" && e !== null && "code" in e && (e as { code: unknown }).code === "P2002") {
      return NextResponse.json({ error: "Group name must be unique" }, { status: 409 });
    }
    const message = e instanceof Error ? e.message : "Failed to create group";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
