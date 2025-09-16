import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z, ZodError } from "zod";

export const runtime = "nodejs";

const idSchema = z.object({ id: z.string().regex(/^\d+$/) });
const updateSchema = z.object({ text: z.string().min(1).max(1000) });

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = idSchema.parse(params);
    const body = await req.json();
    const { text } = updateSchema.parse(body);
    const updated = await prisma.objective.update({ where: { id: Number(id) }, data: { text } });
    return NextResponse.json(updated);
  } catch (e: unknown) {
    if (e instanceof ZodError) return NextResponse.json({ error: e.errors }, { status: 400 });
    return NextResponse.json({ error: "Failed to update objective" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = idSchema.parse(params);
    await prisma.objective.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof ZodError) return NextResponse.json({ error: e.errors }, { status: 400 });
    return NextResponse.json({ error: "Failed to delete objective" }, { status: 500 });
  }
}
