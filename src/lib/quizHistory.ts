import prisma from "@/lib/prisma";
import type { Feedback, Quiz } from "@/lib/quizSchema";

export type QuizAttemptRecord = {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  correctCount: number;
  questionCount: number;
  domain: string;
  enforceQuality: boolean;
  quiz: Quiz;
  answers: Array<number | string>;
  feedback: Feedback;
  groupId: number | null;
  groupName: string | null;
};

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function listQuizAttempts(limit = 20): Promise<QuizAttemptRecord[]> {
  const rows = await prisma.quizAttempt.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { group: { select: { name: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    correctCount: row.correctCount,
    questionCount: row.questionCount,
    domain: row.domain,
    enforceQuality: row.enforceQuality,
    quiz: parseJson<Quiz>(row.quiz, { questions: [] }),
    answers: parseJson<Array<number | string>>(row.answers, []),
    feedback: parseJson<Feedback>(row.feedback, { items: [], weakPoints: [], studyPlan: [] }),
    groupId: row.groupId ?? null,
    groupName: row.group?.name ?? null,
  }));
}

export async function getQuizAttempt(id: number): Promise<QuizAttemptRecord | null> {
  const row = await prisma.quizAttempt.findUnique({
    where: { id },
    include: { group: { select: { name: true } } },
  });
  if (!row) return null;
  return {
    id: row.id,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    correctCount: row.correctCount,
    questionCount: row.questionCount,
    domain: row.domain,
    enforceQuality: row.enforceQuality,
    quiz: parseJson<Quiz>(row.quiz, { questions: [] }),
    answers: parseJson<Array<number | string>>(row.answers, []),
    feedback: parseJson<Feedback>(row.feedback, { items: [], weakPoints: [], studyPlan: [] }),
    groupId: row.groupId ?? null,
    groupName: row.group?.name ?? null,
  };
}
