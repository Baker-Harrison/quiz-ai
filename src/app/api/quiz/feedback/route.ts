import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { geminiModel } from "@/lib/gemini";
import prisma from "@/lib/prisma";
import { feedbackSchema, quizSchema, Feedback } from "@/lib/quizSchema";

export const runtime = "nodejs";

const reqSchema = z.object({
  quiz: quizSchema,
  // answers: for mcq -> number index; for short -> string with user's text
  answers: z.array(z.union([z.number().int(), z.string()])).min(1),
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

export async function POST(req: NextRequest) {
  try {
    const { quiz, answers } = reqSchema.parse(await req.json());
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
    const prompt = `You are an expert tutor. For each item below, write constructive feedback. Do NOT contradict the provided correct answers for MCQs.
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

    async function callAI(promptText: string) {
      return geminiModel.generateContent({
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
    if (raw && typeof raw === "object" && (raw as any).items && Array.isArray((raw as any).items)) {
      (raw as any).items = (raw as any).items.map((it: any) => {
        if (!it || typeof it !== "object") return it;
        if (!("type" in it)) {
          if ("userIndex" in it && "correctIndex" in it) return { type: "mcq", ...it };
          if ("userText" in it) return { type: "short", ...it };
        }
        return it;
      });
    }

    const parsed: Feedback = feedbackSchema.parse(raw);

    // Overwrite 'correct' for MCQ items based on provided indices to avoid AI mislabeling.
    parsed.items = parsed.items.map((it) => {
      if (it.type === "mcq") {
        // find matching question
        const q = quiz.questions.find((qq) => qq.id === it.questionId && qq.type === "mcq");
        if (q && q.type === "mcq") {
          return { ...it, correct: it.userIndex === q.correctIndex };
        }
      }
      return it;
    });

    // Derive strong/weak from items to augment LLM weakPoints
    const derivedWeak: string[] = [];
    const derivedStrong: string[] = [];
    for (const it of parsed.items) {
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

    // Upsert into Prisma singleton insights row
    const current = await prisma.insight.findUnique({ where: { key: "global" } });
    const merged = current
      ? {
          weakPoints: Array.from(new Set([...(current.weakPoints as string[] ?? []), ...weakPoints])).slice(0, 500),
          strongPoints: Array.from(new Set([...(current.strongPoints as string[] ?? []), ...strongPoints])).slice(0, 500),
          studyPlan: Array.from(new Set([...(current.studyPlan as string[] ?? []), ...studyPlan])).slice(0, 500),
        }
      : { weakPoints, strongPoints, studyPlan };

    await prisma.insight.upsert({
      where: { key: "global" },
      update: merged,
      create: { key: "global", ...merged },
    });

    return NextResponse.json({ ...parsed, weakPoints, studyPlan });
  } catch (e: unknown) {
    if (e instanceof ZodError) return NextResponse.json({ error: e.errors }, { status: 400 });
    const message = e instanceof Error ? e.message : "Failed to generate feedback";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
