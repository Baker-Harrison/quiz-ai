"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Quiz, Feedback } from "@/lib/quizSchema";

export default function InsightsPage() {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    const qRaw = localStorage.getItem("quizData");
    const fRaw = localStorage.getItem("feedbackData");
    if (qRaw) setQuiz(JSON.parse(qRaw));
    if (fRaw) setFeedback(JSON.parse(fRaw));
  }, []);

  const [server, setServer] = useState<{ weakPoints: string[]; strongPoints: string[]; studyPlan: string[] } | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/insights", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setServer(data);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const { weakPoints, strongPoints, studyPlan } = useMemo(() => {
    const weak: string[] = [...(server?.weakPoints ?? [])];
    const strong: string[] = [...(server?.strongPoints ?? [])];
    const plan: string[] = [...(server?.studyPlan ?? []), ...(feedback?.studyPlan ?? [])];

    if (quiz && feedback) {
      // Prefer LLM-provided weakPoints if available
      if (feedback.weakPoints && feedback.weakPoints.length) {
        weak.push(...feedback.weakPoints);
      }

      // Derive strong/weak from per-question items if missing or to supplement
      feedback.items.forEach((it) => {
        const q = quiz.questions.find((qq) => qq.id === it.questionId);
        if (!q) return;
        const label = q.prompt;
        if (it.type === "mcq") {
          (it.correct ? strong : weak).push(label);
        } else {
          // for short answers, if model supplied correctness use it; otherwise not categorized
          if (typeof it.correct === "boolean") {
            (it.correct ? strong : weak).push(label);
          }
        }
      });
    }

    // Deduplicate and limit for neat display
    const dedupe = (arr: string[]) => Array.from(new Set(arr)).slice(0, 20);
    return { weakPoints: dedupe(weak), strongPoints: dedupe(strong), studyPlan: dedupe(plan) };
  }, [quiz, feedback, server]);

  if (!quiz || !feedback) {
    return (
      <div className="min-h-screen p-6 max-w-3xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Insights</h1>
          <nav className="text-sm flex gap-3">
            <Link className="underline" href="/">Home</Link>
            <Link className="underline" href="/quiz">Generate Quiz</Link>
          </nav>
        </header>
        <p>No insights yet. Complete a quiz first.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Insights</h1>
        <nav className="text-sm flex gap-3">
          <Link className="underline" href="/">Home</Link>
          <Link className="underline" href="/quiz">New Quiz</Link>
          <Link className="underline" href="/quiz/results">Results</Link>
          <Link className="underline" href="/practice">Practice</Link>
        </nav>
      </header>

      <section className="mb-6 p-4 border rounded bg-gray-50 dark:bg-gray-800 dark:text-gray-100">
        <p className="font-medium">Overall</p>
        <p className="text-sm mt-1">{feedback.overall || "No overall summary provided."}</p>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="p-4 border rounded">
          <h2 className="font-medium mb-2">Strong Points</h2>
          {strongPoints.length ? (
            <ul className="list-disc ml-5 space-y-1 text-sm">
              {strongPoints.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-600">No strong points detected yet.</p>
          )}
        </section>

        <section className="p-4 border rounded">
          <h2 className="font-medium mb-2">Weak Points</h2>
          {weakPoints.length ? (
            <ul className="list-disc ml-5 space-y-1 text-sm">
              {weakPoints.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-600">No weak points detected yet.</p>
          )}
        </section>
      </div>

      <section className="mt-6 p-4 border rounded">
        <h2 className="font-medium mb-2">Study Plan</h2>
        {studyPlan.length ? (
          <ul className="list-disc ml-5 space-y-1 text-sm">
            {studyPlan.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-600">No study plan suggestions yet.</p>
        )}
      </section>
    </div>
  );
}
