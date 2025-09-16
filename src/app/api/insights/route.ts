import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

const bodySchema = z.object({
  weakPoints: z.array(z.string()).optional().default([]),
  strongPoints: z.array(z.string()).optional().default([]),
  studyPlan: z.array(z.string()).optional().default([]),
});

function mergeUnique(a: string[], b: string[], max = 200) {
  return Array.from(new Set([...a, ...b])).slice(0, max);
}

function parseJsonArray(value: unknown): string[] {
  if (typeof value !== "string") return [];
  try {
    const arr = JSON.parse(value);
    return Array.isArray(arr) ? (arr.filter((x) => typeof x === "string") as string[]) : [];
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const current = await prisma.insight.findUnique({ where: { key: "global" } });
    if (!current) {
      return NextResponse.json({ weakPoints: [], strongPoints: [], studyPlan: [] });
    }
    return NextResponse.json({
      weakPoints: parseJsonArray(current.weakPoints),
      strongPoints: parseJsonArray(current.strongPoints),
      studyPlan: parseJsonArray(current.studyPlan),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to read insights";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = bodySchema.parse(await req.json());
    const current = await prisma.insight.findUnique({ where: { key: "global" } });

    const next = current
      ? {
          weakPoints: mergeUnique(parseJsonArray(current.weakPoints), data.weakPoints),
          strongPoints: mergeUnique(parseJsonArray(current.strongPoints), data.strongPoints),
          studyPlan: mergeUnique(parseJsonArray(current.studyPlan), data.studyPlan),
        }
      : data;

    const saved = await prisma.insight.upsert({
      where: { key: "global" },
      update: { weakPoints: JSON.stringify(next.weakPoints), strongPoints: JSON.stringify(next.strongPoints), studyPlan: JSON.stringify(next.studyPlan) },
      create: { key: "global", weakPoints: JSON.stringify(next.weakPoints), strongPoints: JSON.stringify(next.strongPoints), studyPlan: JSON.stringify(next.studyPlan) },
    });

    return NextResponse.json({
      weakPoints: parseJsonArray(saved.weakPoints),
      strongPoints: parseJsonArray(saved.strongPoints),
      studyPlan: parseJsonArray(saved.studyPlan),
    });
  } catch (e: unknown) {
    if (e instanceof ZodError) return NextResponse.json({ error: e.errors }, { status: 400 });
    const message = e instanceof Error ? e.message : "Failed to upsert insights";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
