import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { geminiModel } from "@/lib/gemini";
import { quizSchema, Quiz } from "@/lib/quizSchema";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

const bodySchema = z.object({
  objectives: z.array(z.string()).optional(),
  mode: z.enum(["mcq", "short"]).optional().default("mcq"),
  count: z.number().int().min(1).max(100).optional().default(5),
});

function extractJson(text: string): unknown {
  try {
    // Strip markdown code fences if present
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    const jsonText = jsonMatch ? jsonMatch[0] : text;
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { objectives, mode, count } = bodySchema.parse(await req.json());
    let objs: string[];
    if (objectives && objectives.length > 0) {
      objs = objectives;
    } else {
      const rows = await prisma.objective.findMany({ orderBy: { createdAt: "asc" } });
      objs = rows.map((r: { text: string }) => r.text);
    }

    if (!objs.length) {
      return NextResponse.json({ error: "No objectives provided or found" }, { status: 400 });
    }

    const baseHeader = `You are an expert teacher. Create exactly ${count} high-quality ${mode === "mcq" ? "multiple-choice" : "short-answer"} questions that assess the following learning objectives.`;

    const mcqSpec = `Item-writing rules for MCQs:
- Align stem to a single learning objective; write the stem first
- Use clear language; avoid negatives when possible
- Provide exactly 4 plausible, homogeneous distractors (no clues, no overlapping meanings)
- Do NOT use 'All of the above' or 'None of the above'
- Only one best answer; randomize correct index
- Keep options similar in length/structure and free of grammatical cues
- Target a mix of Bloom's levels across the set

Each MCQ must have these fields:
type: "mcq"
id: string
prompt: string
options: [string, string, string, string]
correctIndex: 0|1|2|3
explanation: string (1–2 sentences)
objective: string (the learning objective addressed)
bloomLevel: "remember"|"understand"|"apply"|"analyze"|"evaluate"|"create"
difficulty: number (1-easy to 5-hard)`;

    const shortSpec = `Guidelines for short-answer:
- Ask for a specific term, explanation, or process aligned to a learning objective
- Expect concise answers; avoid ambiguity
- Provide a brief rubric and 3–8 keywords for auto-checking

Each short-answer must have these fields:
type: "short"
id: string
prompt: string
answerText: string (concise canonical answer)
rubric: string (brief grading notes)
keywords: string[] (3–8 terms expected in a good answer)
objective: string
bloomLevel: "remember"|"understand"|"apply"|"analyze"|"evaluate"|"create"
difficulty: number (1–5)`;

    const schemaOut = mode === "mcq"
      ? `{ "questions": [ { "type": "mcq", "id": "string", "prompt": "string", "options": ["string", "string", "string", "string"], "correctIndex": 0, "explanation": "string", "objective": "string", "bloomLevel": "remember", "difficulty": 1 } ] }`
      : `{ "questions": [ { "type": "short", "id": "string", "prompt": "string", "answerText": "string", "rubric": "string", "keywords": ["string"], "objective": "string", "bloomLevel": "remember", "difficulty": 1 } ] }`;

    const prompt = `${baseHeader}

${mode === "mcq" ? mcqSpec : shortSpec}

Learning objectives:\n${objs.map((o, i) => `${i + 1}. ${o}`).join("\n")}\n
Return ONLY valid minified JSON in this exact schema (no markdown):\n${schemaOut}`;

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
      // Retry once with a stricter instruction
      const strict = `${prompt}\n\nIMPORTANT: Output ONLY valid minified JSON. Do not include any explanations or markdown fences.`;
      const retry = await callAI(strict);
      const retryText = retry.response.text();
      raw = extractJson(retryText);
      if (!raw) {
        const snippet = (text || "").slice(0, 400);
        return NextResponse.json({ error: "AI returned non-JSON content", snippet }, { status: 502 });
      }
    }

    // Define a loose shape for the AI response and then normalize IDs
    type AIQuestionMcqIn = { type?: "mcq"; id?: string; prompt: string; options: string[]; correctIndex: number; explanation?: string };
    type AIQuestionShortIn = { type?: "short"; id?: string; prompt: string; answerText: string; rubric?: string };
    type AIReturn = { questions: (AIQuestionMcqIn | AIQuestionShortIn)[] };

    // Some models may return an array directly; wrap it
    let initial = raw as Partial<AIReturn> | AIReturn | unknown[] | null;
    if (Array.isArray(initial)) {
      initial = { questions: initial as AIReturn["questions"] } as AIReturn;
    }
    const qArr = (initial as AIReturn | null)?.questions;
    if (!Array.isArray(qArr)) {
      const snippet = JSON.stringify(raw).slice(0, 400);
      return NextResponse.json({ error: "AI returned an unexpected shape", snippet }, { status: 502 });
    }

    const withIds: AIReturn = {
      questions: qArr.map((q, idx) => {
        const id = q.id ?? `q_${idx + 1}`;
        if (mode === "mcq") {
          const m = q as AIQuestionMcqIn;
          return {
            type: "mcq",
            id,
            prompt: m.prompt,
            options: m.options,
            correctIndex: m.correctIndex,
            explanation: m.explanation ?? "",
          };
        } else {
          const s = q as AIQuestionShortIn;
          return {
            type: "short",
            id,
            prompt: s.prompt,
            answerText: s.answerText,
            rubric: s.rubric ?? "",
          };
        }
      }),
    };

    const parsed: Quiz = quizSchema.parse(withIds);
    return NextResponse.json(parsed);
  } catch (e: unknown) {
    if (e instanceof ZodError) return NextResponse.json({ error: e.errors }, { status: 400 });
    const message = e instanceof Error ? e.message : "Failed to generate quiz";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
