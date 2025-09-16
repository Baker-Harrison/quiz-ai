"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

export default function PracticePage() {
  const [weak, setWeak] = useState<string[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [mode, setMode] = useState<"mcq" | "short">("mcq");
  const [count, setCount] = useState<number>(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/insights", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const w: string[] = data.weakPoints ?? [];
          setWeak(w);
          setSelected(Object.fromEntries(w.map((s: string) => [s, true])));
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const chosen = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);

  const start = async () => {
    setLoading(true);
    setError(null);
    try {
      if (chosen.length === 0) throw new Error("Select at least one weak point");
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectives: chosen, mode, count }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to generate practice quiz");
      }
      const quiz = await res.json();
      localStorage.setItem("quizData", JSON.stringify(quiz));
      window.location.href = "/quiz/take";
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
        <h1 className="text-2xl font-semibold">Targeted Practice</h1>
        <nav className="text-sm flex gap-3">
          <Link className="underline" href="/">Home</Link>
          <Link className="underline" href="/insights">Insights</Link>
          <Link className="underline" href="/quiz">Quiz</Link>
        </nav>
      </header>

      <section className="mb-6">
        <h2 className="font-medium mb-2">Select weak points to practice</h2>
        {weak.length === 0 ? (
          <p className="text-sm text-gray-600">No weak points saved yet. Complete a quiz and submit to generate insights.</p>
        ) : (
          <ul className="space-y-2">
            {weak.map((w) => (
              <li key={w} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!selected[w]}
                  onChange={(e) => setSelected((prev) => ({ ...prev, [w]: e.target.checked }))}
                />
                <span>{w}</span>
              </li>
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
        onClick={start}
        disabled={loading || chosen.length === 0}
        className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? "Generating..." : `Start Practice (${chosen.length} topics)`}
      </button>
      {error && <p className="text-red-600 mt-3">{error}</p>}
    </div>
  );
}
