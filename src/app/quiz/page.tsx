"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Quiz } from "@/lib/quizSchema";

export default function QuizGeneratePage() {
  const [objectives, setObjectives] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"mcq" | "short">("mcq");
  const [count, setCount] = useState<number>(5);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/objectives");
      const data: { id: number; text: string; createdAt: string }[] = await res.json();
      setObjectives(data.map((d) => d.text));
    })();
  }, []);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectives, mode, count }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to generate quiz");
      }
      const quiz: Quiz = await res.json();
      localStorage.setItem("quizData", JSON.stringify(quiz));
      router.push("/quiz/take");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Generate Quiz</h1>
        <nav className="text-sm flex gap-3">
          <Link className="underline" href="/">Home</Link>
          <Link className="underline" href="/objectives">Objectives</Link>
        </nav>
      </header>

      <section className="mb-6">
        <h2 className="font-medium mb-2">Learning Objectives</h2>
        {objectives.length === 0 ? (
          <p className="text-gray-600">No objectives yet. Add some on the <Link className="underline" href="/objectives">Objectives</Link> page.</p>
        ) : (
          <ul className="list-disc ml-5 space-y-1">
            {objectives.map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-6 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1">Question type</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as "mcq" | "short")}
            className="border rounded px-3 py-2 w-full"
          >
            <option value="mcq">Multiple Choice</option>
            <option value="short">Short Answer</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Number of questions</label>
          <input
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
            className="border rounded px-3 py-2 w-full"
          />
        </div>
      </section>

      <button
        onClick={generate}
        disabled={loading || objectives.length === 0}
        className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? "Generating..." : `Generate ${count}-Question Quiz`}
      </button>
      {error && <p className="text-red-600 mt-3">{error}</p>}
    </div>
  );
}
