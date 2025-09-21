import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { getGeminiModel } from "@/lib/gemini";
import { env } from "@/lib/env";
import prisma from "@/lib/prisma";
import { feedbackSchema, quizSchema, Feedback } from "@/lib/quizSchema";

export const runtime = "nodejs";

const reqSchema = z.object({
  quiz: quizSchema,
  // answers: for mcq -> number index; for short -> string with user's text
  answers: z.array(z.union([z.number().int(), z.string()])).min(1),
  domain: z.enum(["pharmacy"]).optional(),
  enforceQuality: z.boolean().optional().default(true),
  groupId: z.number().int().optional(),
});

function extractJson(text: string): unknown {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    const jsonText = jsonMatch ? jsonMatch[0] : text;
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
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

export async function POST(req: NextRequest) {
  try {
    const { quiz, answers, domain, enforceQuality, groupId } = reqSchema.parse(await req.json());
    const domainTag = domain ?? "pharmacy";
    const normalizedGroupId = typeof groupId === "number" ? groupId : null;
    if (answers.length !== quiz.questions.length) {
      return NextResponse.json({ error: "Answers length mismatch" }, { status: 400 });
    }

    // Build payload depending on question type
    type PayloadMcq = {
      type: "mcq";
      id: string;
      prompt: string;
      options: string[];
      correctIndex: number;
      userIndex: number;
    };
    type PayloadShort = {
      type: "short";
      id: string;
      prompt: string;
      answerText: string; // canonical
      userText: string;   // user's answer
    };
    const payload: (PayloadMcq | PayloadShort)[] = quiz.questions.map((q, idx) => {
      if (q.type === "mcq") {
        return {
          type: "mcq",
          id: q.id,
          prompt: q.prompt,
          options: q.options,
          correctIndex: q.correctIndex,
          userIndex: Number(answers[idx] ?? -1),
        };
      }
      // short
      return {
        type: "short",
        id: q.id,
        prompt: q.prompt,
        answerText: q.answerText,
        userText: String(answers[idx] ?? ""),
      };
    });

    // We compute correctness for MCQs here; AI provides feedback text only. For shorts, AI may include a correctness flag.
    const qualitySpec = enforceQuality ? `Quality guidelines:\n- Use precise, standard terminology; avoid vague or underspecified wording.\n- Be concise and constructive; avoid ambiguous phrasing.\n- For MCQs, do not contradict the provided correctIndex; focus feedback on reasoning.\n- Provide actionable study tips (bullet-like) grounded in the objectives.\n` : "";

    const domainSpec = domainTag === "pharmacy" ? `Domain constraints (pharmacy):\n- Align legal/regulatory comments with federal CSA/DEA and NABP standards; avoid state-specific claims unless explicitly requested.\n- Use correct medication safety terminology (e.g., 'wrong time error' refers to administration timing, not dispensing).\n` : "";

    const prompt = `You are an expert tutor. For each item below, write constructive feedback.
${qualitySpec}${domainSpec}
Also summarize the learner's weak points and propose a concise, actionable study plan (bullet points) tailored to the objectives.
Respond ONLY in JSON matching this schema (no markdown):
{
  "items": [
    // MCQ item
    { "questionId": "string", "type": "mcq", "correctIndex": 0, "userIndex": 0, "correct": true, "feedback": "string" },
    // Short answer item
    { "questionId": "string", "type": "short", "userText": "string", "correct": true, "feedback": "string" }
  ],
  "overall": "string (optional overall encouragement and next steps)",
  "weakPoints": ["string", "string"],
  "studyPlan": ["string", "string"]
}
Items (JSON): ${JSON.stringify(payload)}`;

    if (!env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Server is not configured with GEMINI_API_KEY. Add it to .env or .env.local and restart the dev server." }, { status: 500 });
    }
    const model = getGeminiModel();
    async function callAI(promptText: string) {
      return model.generateContent({
        contents: [{ role: "user", parts: [{ text: promptText }] }],
        generationConfig: { responseMimeType: "application/json" },
      });
    }

    const result = await callAI(prompt);
    const text = result.response.text();
    let raw = extractJson(text);
    if (!raw) {
      const strict = `${prompt}\n\nIMPORTANT: Output ONLY valid minified JSON. Do not include any explanations or markdown fences.`;
      const retry = await callAI(strict);
      const retryText = retry.response.text();
      raw = extractJson(retryText);
      if (!raw) {
        const snippet = (text || "").slice(0, 400);
        return NextResponse.json({ error: "AI returned non-JSON content", snippet }, { status: 502 });
      }
    }

    // Normalize missing 'type' field by inferring from properties
    type RawWithItems = { items: unknown[] };
    type ItemObj = Record<string, unknown>;
    if (
      raw &&
      typeof raw === "object" &&
      "items" in (raw as Record<string, unknown>) &&
      Array.isArray((raw as RawWithItems).items)
    ) {
      const tmp = raw as RawWithItems;
      tmp.items = tmp.items.map((it) => {
        if (!it || typeof it !== "object") return it;
        const obj = it as ItemObj;
        if (!("type" in obj)) {
          if ("userIndex" in obj && "correctIndex" in obj) return { type: "mcq", ...obj } as ItemObj;
          if ("userText" in obj) return { type: "short", ...obj } as ItemObj;
        }
        return obj;
      });
    }

    const parsed: Feedback = feedbackSchema.parse(raw);

    const normalizedItems: Feedback["items"] = quiz.questions.map((q, idx) => {
      const existing = parsed.items.find((it) => it.questionId === q.id);
      const answer = answers[idx];
      if (q.type === "mcq") {
        const existingMcq = existing && existing.type === "mcq" ? existing : null;
        const rawIndex = typeof answer === "number" ? answer : Number(answer);
        const userIndex = Number.isInteger(rawIndex) ? rawIndex : -1;
        return {
          type: "mcq",
          questionId: q.id,
          correctIndex: q.correctIndex,
          userIndex,
          correct: userIndex === q.correctIndex,
          feedback: existingMcq?.feedback ?? "",
        };
      }
      const existingShort = existing && existing.type === "short" ? existing : null;
      const userText = typeof answer === "string" ? answer : String(answer ?? "");
      return {
        type: "short",
        questionId: q.id,
        userText,
        correct: typeof existingShort?.correct === "boolean" ? existingShort.correct : undefined,
        feedback: existingShort?.feedback ?? "",
      };
    });

    const questionCount = quiz.questions.length;
    const correctCount = normalizedItems.reduce((acc, item) => {
      if (item.type === "mcq") return acc + (item.correct ? 1 : 0);
      if (typeof item.correct === "boolean") return acc + (item.correct ? 1 : 0);
      return acc;
    }, 0);

    // Derive strong/weak from items to augment LLM weakPoints
    const derivedWeak: string[] = [];
    const derivedStrong: string[] = [];
    for (const it of normalizedItems) {
      const q = quiz.questions.find((qq) => qq.id === it.questionId);
      if (!q) continue;
      const label = q.prompt;
      if (it.type === "mcq") {
        (it.correct ? derivedStrong : derivedWeak).push(label);
      } else if (typeof it.correct === "boolean") {
        (it.correct ? derivedStrong : derivedWeak).push(label);
      }
    }

    const weakPoints = Array.from(new Set([...(parsed.weakPoints ?? []), ...derivedWeak])).slice(0, 200);
    const strongPoints = Array.from(new Set([...derivedStrong])).slice(0, 200);
    const studyPlan = parsed.studyPlan ?? [];
    const responseFeedback: Feedback = {
      ...parsed,
      items: normalizedItems,
      weakPoints,
      studyPlan,
    };

    // Upsert into Prisma singleton insights row (fields stored as JSON strings)
    const current = normalizedGroupId == null
      ? await prisma.insight.findFirst({ where: { key: "global", groupId: null } })
      : await prisma.insight.findUnique({ where: { key_groupId: { key: "global", groupId: normalizedGroupId } } });
    const merged = current
      ? {
          weakPoints: Array.from(new Set([...parseJsonArray(current.weakPoints), ...weakPoints])).slice(0, 500),
          strongPoints: Array.from(new Set([...parseJsonArray(current.strongPoints), ...strongPoints])).slice(0, 500),
          studyPlan: Array.from(new Set([...parseJsonArray(current.studyPlan), ...studyPlan])).slice(0, 500),
        }
      : { weakPoints, strongPoints, studyPlan };

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

    const storedAnswers = normalizedItems.map((item) => (item.type === "mcq" ? item.userIndex : item.userText));

    let attemptId: number | null = null;
    try {
      const attempt = await prisma.quizAttempt.create({
        data: {
          quiz: JSON.stringify(quiz),
          answers: JSON.stringify(storedAnswers),
          feedback: JSON.stringify(responseFeedback),
          domain: domainTag,
          enforceQuality,
          correctCount,
          questionCount,
          groupId: normalizedGroupId ?? undefined,
        },
      });
      attemptId = attempt.id;
    } catch (err) {
      console.error("Failed to persist quiz attempt", err);
    }

    return NextResponse.json({ feedback: responseFeedback, attemptId, strongPoints, groupId: normalizedGroupId });
  } catch (e: unknown) {
    if (e instanceof ZodError) return NextResponse.json({ error: e.errors }, { status: 400 });
    const message = e instanceof Error ? e.message : "Failed to generate feedback";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
