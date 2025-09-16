"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Quiz } from "@/lib/quizSchema";

export default function QuizTakePage() {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Array<number | string>>([]);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const raw = localStorage.getItem("quizData");
    if (raw) {
      const q: Quiz = JSON.parse(raw);
      setQuiz(q);
      // default: mcq -> -1, short -> ""
      setAnswers(q.questions.map((qq) => (qq.type === "mcq" ? -1 : "")));
    }
  }, []);

  const submit = async () => {
    if (!quiz) return;
    // Ensure all answered: mcq -> index >= 0, short -> non-empty string
    const incomplete = answers.some((a, idx) => {
      const q = quiz.questions[idx];
      if (q.type === "mcq") return typeof a !== "number" || a < 0;
      return typeof a !== "string" || a.trim().length === 0;
    });
    if (incomplete) {
      alert("Please answer all questions before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/quiz/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quiz, answers }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to get feedback");
      }
      const feedback = await res.json();
      localStorage.setItem("feedbackData", JSON.stringify(feedback));
      router.push("/quiz/results");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!quiz) {
    return (
      <div className="min-h-screen p-6 max-w-3xl mx-auto">
        <p>No quiz found. Generate one on the <Link className="underline" href="/quiz">Generate Quiz</Link> page.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Take Quiz</h1>
        <nav className="text-sm flex gap-3">
          <Link className="underline" href="/">Home</Link>
          <Link className="underline" href="/quiz">Back</Link>
        </nav>
      </header>

      <ol className="space-y-6">
        {quiz.questions.map((q: Quiz["questions"][number], qi: number) => (
          <li key={q.id} className="border rounded p-4">
            <p className="font-medium mb-3">{qi + 1}. {q.prompt}</p>
            {q.type === "mcq" ? (
              <div className="space-y-2">
                {q.options.map((opt: string, oi: number) => (
                  <label key={oi} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`q_${qi}`}
                      checked={answers[qi] === oi}
                      onChange={() => setAnswers((prev) => prev.map((v, idx) => (idx === qi ? oi : v)))}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div>
                <label className="block text-sm text-gray-600 mb-1">Your answer</label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                  value={typeof answers[qi] === "string" ? (answers[qi] as string) : ""}
                  onChange={(e) => setAnswers((prev) => prev.map((v, idx) => (idx === qi ? e.target.value : v)))}
                />
              </div>
            )}
          </li>
        ))}
      </ol>

      <button
        onClick={submit}
        disabled={submitting}
        className="mt-6 bg-black text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {submitting ? "Submitting..." : "Submit Answers"}
      </button>
    </div>
  );
}
