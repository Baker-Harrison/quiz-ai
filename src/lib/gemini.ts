import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "@/lib/env";

let _model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]> | null = null;

export function getGeminiModel() {
  if (_model) return _model;
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set. Add it to your .env or .env.local file.");
  }
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  _model = genAI.getGenerativeModel({ model: env.GEMINI_MODEL || "gemini-2.5-flash" });
  return _model;
}
