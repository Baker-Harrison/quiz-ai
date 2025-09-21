import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

const bulkSchema = z.object({
  items: z.array(z.string().trim().min(1).max(1000)).min(1),
  groupId: z.number().int().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, groupId } = bulkSchema.parse(body);

    // Normalize and dedupe identical text values in this one request
    const unique = Array.from(new Set(items.map((s) => s.trim())));

    if (unique.length === 0) {
      // Nothing to insert after dedupe/trim
      const objectives = await prisma.objective.findMany({ orderBy: { createdAt: "desc" } });
      return NextResponse.json({ inserted: 0, objectives });
    }

    let inserted = 0;
    try {
      // Primary path: use createMany for speed; duplicate handling is managed in fallback.
      const result = await prisma.objective.createMany({
        data: unique.map((text) => ({ text, groupId: groupId ?? undefined })),
      });
      inserted = result.count;
    } catch (e) {
      const duplicateError =
        typeof e === "object" &&
        e !== null &&
        "code" in e &&
        (e as { code?: string }).code === "P2002";

      if (!duplicateError) {
        console.warn("createMany failed, falling back to individual creates:", e);
      }

      // Fallback path: some environments or duplicate data may break createMany.
      await prisma.$transaction(async (tx) => {
        for (const text of unique) {
          try {
            await tx.objective.create({ data: { text, groupId: groupId ?? undefined } });
            inserted++;
          } catch (err) {
            if (
              typeof err === "object" &&
              err !== null &&
              "code" in err &&
              (err as { code?: string }).code === "P2002"
            ) {
              continue; // Duplicate at the DB level; ignore.
            }
            throw err;
          }
        }
      });
    }

    // Return count and latest list for convenience
    const objectives = await prisma.objective.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ inserted, objectives });
  } catch (e: unknown) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.errors }, { status: 400 });
    }
    const message = e instanceof Error ? e.message : "Failed to bulk create objectives";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
