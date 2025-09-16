import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

const bulkSchema = z.object({
  items: z.array(z.string().trim().min(1).max(1000)).min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items } = bulkSchema.parse(body);

    // Normalize and dedupe identical text values in this one request
    const unique = Array.from(new Set(items.map((s) => s.trim())));

    const result = await prisma.objective.createMany({
      data: unique.map((text) => ({ text })),
    });

    // Return count and latest list for convenience
    const objectives = await prisma.objective.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ inserted: result.count, objectives });
  } catch (e: unknown) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.errors }, { status: 400 });
    }
    const message = e instanceof Error ? e.message : "Failed to bulk create objectives";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
