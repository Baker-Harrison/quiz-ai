import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z, ZodError } from "zod";

const createSchema = z.object({ text: z.string().min(1).max(1000) });

export const runtime = "nodejs";

export async function GET() {
  try {
    const objectives = await prisma.objective.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(objectives);
  } catch (_e: unknown) {
    return NextResponse.json({ error: "Failed to fetch objectives" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text } = createSchema.parse(body);
    const created = await prisma.objective.create({ data: { text } });
    return NextResponse.json(created, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create objective" }, { status: 500 });
  }
}
