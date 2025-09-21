import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

const bodySchema = z.object({
  weakPoints: z.array(z.string()).optional().default([]),
  strongPoints: z.array(z.string()).optional().default([]),
  studyPlan: z.array(z.string()).optional().default([]),
  groupId: z.number().int().optional(),
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

function parseGroupId(param: string | null): number | null {
  if (param == null) return null;
  const numeric = Number(param);
  return Number.isFinite(numeric) ? numeric : null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const groupIdParam = searchParams.get("groupId");
    const groupId = parseGroupId(groupIdParam);
    if (groupIdParam && groupId == null) {
      return NextResponse.json({ error: "Invalid groupId" }, { status: 400 });
    }

    const current = groupId == null
      ? await prisma.insight.findFirst({ where: { key: "global", groupId: null } })
      : await prisma.insight.findUnique({ where: { key_groupId: { key: "global", groupId } } });
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
    const normalizedGroupId = typeof data.groupId === "number" ? data.groupId : null;
    const current = normalizedGroupId == null
      ? await prisma.insight.findFirst({ where: { key: "global", groupId: null } })
      : await prisma.insight.findUnique({ where: { key_groupId: { key: "global", groupId: normalizedGroupId } } });

    const merged = current
      ? {
          weakPoints: mergeUnique(parseJsonArray(current.weakPoints), data.weakPoints),
          strongPoints: mergeUnique(parseJsonArray(current.strongPoints), data.strongPoints),
          studyPlan: mergeUnique(parseJsonArray(current.studyPlan), data.studyPlan),
        }
      : {
          weakPoints: data.weakPoints,
          strongPoints: data.strongPoints,
          studyPlan: data.studyPlan,
        };

    if (current) {
      await prisma.insight.update({
        where: { id: current.id },
        data: {
          weakPoints: JSON.stringify(merged.weakPoints),
          strongPoints: JSON.stringify(merged.strongPoints),
          studyPlan: JSON.stringify(merged.studyPlan),
        },
      });
    } else {
      await prisma.insight.create({
        data: {
          key: "global",
          weakPoints: JSON.stringify(merged.weakPoints),
          strongPoints: JSON.stringify(merged.strongPoints),
          studyPlan: JSON.stringify(merged.studyPlan),
          groupId: normalizedGroupId ?? undefined,
        },
      });
    }

    return NextResponse.json(merged);
  } catch (e: unknown) {
    if (e instanceof ZodError) return NextResponse.json({ error: e.errors }, { status: 400 });
    const message = e instanceof Error ? e.message : "Failed to upsert insights";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
