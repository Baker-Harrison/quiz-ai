import { z } from "zod";

const schema = z.object({
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),
  DATABASE_URL: z.string().optional(),
});

export const env = schema.parse({
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL,
  DATABASE_URL: process.env.DATABASE_URL,
});
