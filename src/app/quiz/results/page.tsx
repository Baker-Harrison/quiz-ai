"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Quiz, Feedback } from "@/lib/quizSchema";

export default function QuizResultsPage() {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [meta, setMeta] = useState<{ domain: string; enforceQuality: boolean; groupId: number | null; groupName: string | null } | null>(null);

  useEffect(() => {
    const qRaw = localStorage.getItem("quizData");
    const fRaw = localStorage.getItem("feedbackData");
    const attemptRaw = localStorage.getItem("latestAttemptId");
    const metaRaw = localStorage.getItem("quizMeta");
    if (qRaw) setQuiz(JSON.parse(qRaw));
    if (fRaw) setFeedback(JSON.parse(fRaw));
    if (attemptRaw) {
      const parsed = Number(attemptRaw);
      setAttemptId(Number.isFinite(parsed) ? parsed : null);
    }
    if (metaRaw) {
      try {
        const parsed = JSON.parse(metaRaw) as {
          domain?: string;
          enforceQuality?: boolean;
          groupId?: number | null;
          groupName?: string | null;
        };
        setMeta({
          domain: parsed.domain ?? "pharmacy",
          enforceQuality: parsed.enforceQuality ?? true,
          groupId: typeof parsed.groupId === "number" ? parsed.groupId : null,
          groupName: typeof parsed.groupName === "string" ? parsed.groupName : null,
        });
      } catch {
        setMeta(null);
      }
    }
  }, []);

  const items = useMemo<Feedback["items"]>(() => feedback?.items ?? [], [feedback]);
  const score = useMemo(() => {
    if (!quiz) return null;
    const correct = items.reduce((acc, item) => {
      if (item.type === "mcq") return acc + (item.correct ? 1 : 0);
      if (typeof item.correct === "boolean") return acc + (item.correct ? 1 : 0);
      return acc;
    }, 0);
    return `${correct}/${quiz.questions.length}`;
  }, [items, quiz]);

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
          <Link className="underline" href="/quiz/history">History</Link>
        </nav>
      </header>

      <section className="mb-6 grid gap-4 sm:grid-cols-2">
        {score && (
          <div className="border rounded p-4">
            <p className="text-sm text-gray-500 uppercase tracking-wide">Score</p>
            <p className="text-xl font-semibold">{score}</p>
          </div>
        )}
        {meta && (
          <div className="border rounded p-4">
            <p className="text-sm text-gray-500 uppercase tracking-wide">Domain</p>
            <p className="text-xl font-semibold">{meta.domain}</p>
            {!meta.enforceQuality && <p className="text-xs text-gray-500">Quality guidelines disabled</p>}
          </div>
        )}
        {meta?.groupName && (
          <div className="border rounded p-4">
            <p className="text-sm text-gray-500 uppercase tracking-wide">Group</p>
            <p className="text-xl font-semibold">{meta.groupName}</p>
          </div>
        )}
        {attemptId && (
          <div className="border rounded p-4 sm:col-span-2 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 uppercase tracking-wide">Saved attempt</p>
              <p className="text-sm text-gray-600">Attempt #{attemptId} stored in history.</p>
            </div>
            <Link className="underline" href={`/quiz/history/${attemptId}`}>
              View details
            </Link>
          </div>
        )}
      </section>

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
