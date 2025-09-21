import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z, ZodError } from "zod";

const createSchema = z.object({ text: z.string().min(1).max(1000), groupId: z.number().int().optional() });

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const groupIdParam = searchParams.get("groupId");
    const where = groupIdParam ? { groupId: Number(groupIdParam) } : {};
    const objectives = await prisma.objective.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(objectives);
  } catch (e: unknown) {
    console.error("Failed to fetch objectives", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: `Failed to fetch objectives: ${msg}` }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await prisma.objective.deleteMany({});
    return new NextResponse(null, { status: 204 });
  } catch (e: unknown) {
    console.error("Failed to delete all objectives", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: `Failed to delete all objectives: ${msg}` }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, groupId } = createSchema.parse(body);
    const created = await prisma.objective.create({ data: { text, groupId: groupId ?? undefined } });
    return NextResponse.json(created, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create objective" }, { status: 500 });
  }
}
