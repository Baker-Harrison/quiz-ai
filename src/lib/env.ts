import { z } from "zod";

const schema = z.object({
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  GEMINI_MODEL: z.string().optional(),
  DATABASE_URL: z.string().min(1).optional(),
});

export const env = schema.parse({
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL,
  DATABASE_URL: process.env.DATABASE_URL,
});
