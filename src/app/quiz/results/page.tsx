"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Quiz, Feedback } from "@/lib/quizSchema";

export default function QuizResultsPage() {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    const qRaw = localStorage.getItem("quizData");
    const fRaw = localStorage.getItem("feedbackData");
    if (qRaw) setQuiz(JSON.parse(qRaw));
    if (fRaw) setFeedback(JSON.parse(fRaw));
  }, []);

  const items = useMemo<Feedback["items"]>(() => feedback?.items ?? [], [feedback]);

  if (!quiz || !feedback) {
    return (
      <div className="min-h-screen p-6 max-w-3xl mx-auto">
        <p>Missing results. Start again on the <Link className="underline" href="/quiz">Generate Quiz</Link> page.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Results & Feedback</h1>
        <nav className="text-sm flex gap-3">
          <Link className="underline" href="/">Home</Link>
          <Link className="underline" href="/quiz">New Quiz</Link>
        </nav>
      </header>

      <ol className="space-y-6">
        {quiz.questions.map((q: Quiz["questions"][number], qi: number) => {
          const it = items.find((i: Feedback["items"][number]) => i.questionId === q.id) ?? null;
          const base = "border rounded p-4";
          if (q.type === "mcq") {
            const correct = (it && it.type === "mcq") ? it.correct : false;
            const userIndex = (it && it.type === "mcq") ? it.userIndex : -1;
            return (
              <li key={q.id} className={`${base} ${correct ? "border-green-600" : "border-red-600"}`}>
                <p className="font-medium mb-3">{qi + 1}. {q.prompt}</p>
                <ul className="space-y-1">
                  {q.options.map((opt: string, oi: number) => (
                    <li key={oi} className={`${oi === q.correctIndex ? "text-green-700" : ""} ${oi === userIndex && oi !== q.correctIndex ? "text-red-700" : ""}`}>
                      {oi === userIndex ? "→ " : ""}{opt}
                    </li>
                  ))}
                </ul>
                {it?.feedback && (
                  <p className="mt-3 text-sm text-gray-800 dark:text-gray-200"><span className="font-semibold">AI Feedback:</span> {it.feedback}</p>
                )}
              </li>
            );
          }
          // short answer
          const userText = (it && it.type === "short") ? it.userText : "";
          return (
            <li key={q.id} className={`${base} border-blue-600`}>
              <p className="font-medium mb-3">{qi + 1}. {q.prompt}</p>
              <div className="text-sm space-y-1">
                <p><span className="font-semibold">Your answer:</span> {userText || "(empty)"}</p>
                <p className="text-gray-700 dark:text-gray-300"><span className="font-semibold">Expected:</span> {q.answerText}</p>
              </div>
              {it?.feedback && (
                <p className="mt-3 text-sm text-gray-800 dark:text-gray-200"><span className="font-semibold">AI Feedback:</span> {it.feedback}</p>
              )}
            </li>
          );
        })}
      </ol>

      {feedback?.overall && (
        <div className="mt-6 p-4 border rounded bg-gray-50 dark:bg-gray-800 dark:text-gray-100">
          <p className="font-medium">Overall</p>
          <p className="text-sm mt-1">{feedback.overall}</p>
        </div>
      )}
    </div>
  );
}
