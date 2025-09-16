import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "@/lib/env";

export const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
export const geminiModel = genAI.getGenerativeModel({ model: env.GEMINI_MODEL || "gemini-2.5-flash" });
