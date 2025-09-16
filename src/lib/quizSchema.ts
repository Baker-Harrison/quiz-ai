import { z } from "zod";

// Multiple-choice question
const bloomLevelEnum = z.enum([
  "remember",
  "understand",
  "apply",
  "analyze",
  "evaluate",
  "create",
]);

export const quizQuestionMcqSchema = z.object({
  type: z.literal("mcq"),
  id: z.string(),
  prompt: z.string(),
  options: z.array(z.string()).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().optional().default(""),
  objective: z.string().optional(),
  bloomLevel: bloomLevelEnum.optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
});

// Short-answer question
export const quizQuestionShortSchema = z.object({
  type: z.literal("short"),
  id: z.string(),
  prompt: z.string(),
  answerText: z.string().min(1), // canonical short answer from AI
  rubric: z.string().optional().default(""), // optional grading notes
  keywords: z.array(z.string()).optional(),
  objective: z.string().optional(),
  bloomLevel: bloomLevelEnum.optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
});

export const quizQuestionSchema = z.discriminatedUnion("type", [
  quizQuestionMcqSchema,
  quizQuestionShortSchema,
]);

export const quizSchema = z.object({
  questions: z.array(quizQuestionSchema).min(1),
});

export type Quiz = z.infer<typeof quizSchema>;

// Feedback item for MCQ
const feedbackItemMcqSchema = z.object({
  questionId: z.string(),
  type: z.literal("mcq"),
  correctIndex: z.number().int(),
  userIndex: z.number().int(),
  correct: z.boolean(),
  feedback: z.string(),
});

// Feedback item for Short Answer
const feedbackItemShortSchema = z.object({
  questionId: z.string(),
  type: z.literal("short"),
  userText: z.string(),
  correct: z.boolean().optional(),
  feedback: z.string(),
});

export const feedbackItemSchema = z.discriminatedUnion("type", [
  feedbackItemMcqSchema,
  feedbackItemShortSchema,
]);

export const feedbackSchema = z.object({
  items: z.array(feedbackItemSchema).min(1),
  overall: z.string().optional(),
  weakPoints: z.array(z.string()).optional().default([]),
  studyPlan: z.array(z.string()).optional().default([]),
});

export type Feedback = z.infer<typeof feedbackSchema>;
